import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import MessageBubble from "@/components/MessageBubble";
import MessageInput from "@/components/MessageInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });
  }, [navigate]);

  useEffect(() => {
    if (user && id) {
      loadChat();
      subscribeToMessages();
    }
  }, [user, id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChat = async () => {
    try {
      // Получить другого участника чата
      const { data: participantData } = await supabase
        .from("chat_participants")
        .select("user_id")
        .eq("chat_id", id)
        .neq("user_id", user.id)
        .single();

      if (participantData) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", participantData.user_id)
          .single();

        setOtherUser(profileData);
      }

      // Загрузить сообщения
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          ),
          reply_to:reply_to_id (
            content
          )
        `)
        .eq("chat_id", id)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      // Для каждого сообщения загрузить реакции
      const messagesWithReactions = await Promise.all(
        (messagesData || []).map(async (msg) => {
          const { data: reactions } = await supabase
            .from("message_reactions")
            .select("emoji, user_id")
            .eq("message_id", msg.id);

          return {
            ...msg,
            reactions: reactions || [],
          };
        })
      );

      setMessages(messagesWithReactions);

      // Обновить last_read_at
      await supabase
        .from("chat_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("chat_id", id)
        .eq("user_id", user.id);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${id}`,
        },
        async (payload) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", payload.new.user_id)
            .single();

          const newMessage = {
            ...payload.new,
            profiles: profileData,
            reactions: [],
          };

          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.message_id
                ? {
                    ...msg,
                    reactions: [...(msg.reactions || []), payload.new],
                  }
                : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (content: string) => {
    try {
      const { error } = await supabase.from("messages").insert({
        chat_id: id,
        user_id: user.id,
        content,
        reply_to_id: replyTo?.id || null,
      });

      if (error) throw error;

      // Обновить updated_at чата
      await supabase
        .from("chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", id);

      setReplyTo(null);
    } catch (error: any) {
      toast({
        title: "Ошибка отправки",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      const { error } = await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error adding reaction:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} />
        <div className="container mx-auto px-4 py-8 text-center">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header user={user} />

      {/* Chat Header */}
      <div className="border-b bg-card sticky top-16 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/messages")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherUser?.avatar_url || undefined} />
            <AvatarFallback>
              {otherUser?.username?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{otherUser?.username || "Пользователь"}</h2>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.user_id === user.id}
              onReply={() => setReplyTo(message)}
              onReact={(emoji) => handleReact(message.id, emoji)}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-card sticky bottom-0">
        <div className="container mx-auto px-4 py-4">
          <MessageInput
            onSend={handleSendMessage}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;
