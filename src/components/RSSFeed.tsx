import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Rss, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const RSSFeed = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const rssUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rss-feed`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rssUrl);
    toast({
      title: "Скопировано",
      description: "Ссылка на RSS-ленту скопирована в буфер обмена",
    });
  };

  const openInNewTab = () => {
    window.open(rssUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Rss className="h-4 w-4 mr-2" />
          RSS
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>RSS-лента форума</DialogTitle>
          <DialogDescription>
            Подпишитесь на нашу RSS-ленту, чтобы быть в курсе последних обсуждений
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={rssUrl} readOnly />
            <Button onClick={copyToClipboard} size="icon" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={openInNewTab} size="icon" variant="outline">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Используйте эту ссылку в вашем RSS-клиенте для подписки на последние темы форума
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RSSFeed;