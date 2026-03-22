import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reply, Smile } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import EmojiPicker from "./EmojiPicker";
import RepostCard from "./RepostCard";

interface MessageBubbleProps {
  message: any;
  isOwn: boolean;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
}

const MessageBubble = ({ message, isOwn, onReply, onReact }: MessageBubbleProps) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={message.profiles?.avatar_url || undefined} />
        <AvatarFallback>
          {message.profiles?.username?.[0]?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : ""}`}>
        {message.reply_to && (
          <Card className="mb-1 p-2 text-xs bg-muted">
            <p className="text-muted-foreground truncate">
              Ответ: {message.reply_to.content}
            </p>
          </Card>
        )}

        <Card
          className={`p-3 ${
            isOwn ? "bg-primary text-primary-foreground" : "bg-card"
          }`}
        >
          {message.repost_type && (
            <RepostCard
              type={message.repost_type}
              id={message.repost_id}
              className="mb-2"
            />
          )}
          
          <p className="whitespace-pre-wrap break-words">{message.content}</p>

          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {Object.entries(
                message.reactions.reduce((acc: Record<string, number>, r: any) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([emoji, count]) => (
                <span
                  key={emoji}
                  className="text-xs px-2 py-1 bg-background/50 rounded-full"
                >
                  {emoji} {count as number}
                </span>
              ))}
            </div>
          )}
        </Card>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
              locale: ru,
            })}
            {message.is_edited && " (изм.)"}
          </span>

          <div className="flex gap-1">
            {onReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={onReply}
              >
                <Reply className="h-3 w-3" />
              </Button>
            )}

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile className="h-3 w-3" />
              </Button>
              {showEmojiPicker && onReact && (
                <div className="absolute bottom-8 left-0 z-50">
                  <EmojiPicker
                    onSelect={(emoji) => {
                      onReact(emoji);
                      setShowEmojiPicker(false);
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
