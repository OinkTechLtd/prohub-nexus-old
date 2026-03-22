import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { hideContent, unhideContent, getModerationHistory } from "@/lib/moderation";
import { useToast } from "@/hooks/use-toast";

interface ModerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'topic' | 'post' | 'resource' | 'video';
  contentId: string;
  contentTitle: string;
  isHidden: boolean;
  onSuccess?: () => void;
}

const ModerationDialog = ({
  open,
  onOpenChange,
  contentType,
  contentId,
  contentTitle,
  isHidden,
  onSuccess,
}: ModerationDialogProps) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const { toast } = useToast();

  const loadHistory = async () => {
    try {
      const data = await getModerationHistory(contentType, contentId);
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error loading history:', error);
    }
  };

  const handleHide = async () => {
    if (!reason.trim()) {
      toast({
        title: "Ошибка",
        description: "Укажите причину скрытия",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await hideContent(contentType, contentId, reason);
      toast({
        title: "Контент скрыт",
        description: "Контент успешно скрыт",
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnhide = async () => {
    setLoading(true);
    try {
      await unhideContent(contentType, contentId, reason.trim() || undefined);
      toast({
        title: "Контент восстановлен",
        description: "Контент успешно восстановлен",
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Модерация контента</DialogTitle>
          <DialogDescription>
            {contentTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Статус: {isHidden ? (
                <span className="text-destructive font-semibold">Скрыт</span>
              ) : (
                <span className="text-green-600 font-semibold">Активен</span>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Причина {isHidden ? 'восстановления (опционально)' : 'скрытия (обязательно)'}
            </Label>
            <Textarea
              id="reason"
              placeholder={isHidden 
                ? "Укажите причину восстановления..." 
                : "Укажите причину скрытия..."
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            {isHidden ? (
              <Button onClick={handleUnhide} disabled={loading}>
                Восстановить
              </Button>
            ) : (
              <Button
                onClick={handleHide}
                disabled={loading}
                variant="destructive"
              >
                Скрыть контент
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModerationDialog;
