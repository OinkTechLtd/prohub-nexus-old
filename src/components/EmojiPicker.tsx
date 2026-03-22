import EmojiPickerReact, { EmojiClickData } from "emoji-picker-react";
import { Card } from "@/components/ui/card";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPicker = ({ onSelect, onClose }: EmojiPickerProps) => {
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelect(emojiData.emoji);
  };

  return (
    <Card className="p-2 shadow-lg">
      <EmojiPickerReact onEmojiClick={handleEmojiClick} width={300} height={400} />
    </Card>
  );
};

export default EmojiPicker;
