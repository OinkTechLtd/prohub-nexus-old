import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface Chat {
  id: string;
  updated_at: string;
  last_message?: {
    content: string;
    created_at: string;
  };
  other_user?: {
    username: string;
    avatar_url: string;
  };
  unread_count: number;
}

const Messages = () => {
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
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
    if (user) {
      loadChats();
    }
  }, [user]);

  const loadChats = async () => {
    try {
      // Получить чаты пользователя
      const { data: participantData, error: participantError } = await supabase
        .from("chat_participants")
        .select("chat_id")
        .eq("user_id", user.id);

      if (participantError) throw participantError;

      const chatIds = participantData.map((p) => p.chat_id);

      if (chatIds.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      // Получить информацию о чатах
      const { data: chatsData, error: chatsError } = await supabase
        .from("chats")
        .select("*")
        .in("id", chatIds)
        .order("updated_at", { ascending: false });

      if (chatsError) throw chatsError;

      // Для каждого чата получить собеседника и последнее сообщение
      const chatsWithDetails = await Promise.all(
        (chatsData || []).map(async (chat) => {
          // Получить другого участника
          const { data: otherParticipants } = await supabase
            .from("chat_participants")
            .select("user_id")
            .eq("chat_id", chat.id)
            .neq("user_id", user.id)
            .single();

          let otherUser = null;
          if (otherParticipants) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", otherParticipants.user_id)
              .single();
            otherUser = profileData;
          }

          // Получить последнее сообщение
          const { data: lastMessage } = await supabase
            .from("messages")
            .select("content, created_at")
            .eq("chat_id", chat.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Подсчитать непрочитанные сообщения
          const { data: myParticipant } = await supabase
            .from("chat_participants")
            .select("last_read_at")
            .eq("chat_id", chat.id)
            .eq("user_id", user.id)
            .single();

          const { count: unreadCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("chat_id", chat.id)
            .gt("created_at", myParticipant?.last_read_at || "1970-01-01");

          return {
            ...chat,
            last_message: lastMessage || undefined,
            other_user: otherUser || undefined,
            unread_count: unreadCount || 0,
          };
        })
      );

      setChats(chatsWithDetails);
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

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Сообщения</h1>
          <p className="text-muted-foreground">Ваши чаты с другими пользователями</p>
        </div>

        {loading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : chats.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">У вас пока нет сообщений</p>
              <p className="text-sm text-muted-foreground">
                Начните общение, перейдя в профиль пользователя
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <Card
                key={chat.id}
                className="hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/chat/${chat.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={chat.other_user?.avatar_url || undefined} />
                      <AvatarFallback>
                        {chat.other_user?.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold truncate">
                          {chat.other_user?.username || "Пользователь"}
                        </h3>
                        <div className="flex items-center gap-2">
                          {chat.unread_count > 0 && (
                            <Badge variant="default">{chat.unread_count}</Badge>
                          )}
                          {chat.last_message && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(chat.last_message.created_at), {
                                addSuffix: true,
                                locale: ru,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      {chat.last_message && (
                        <p className="text-sm text-muted-foreground truncate">
                          {chat.last_message.content}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;
