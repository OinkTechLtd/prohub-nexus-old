import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { FileText, Video, Link2 } from "lucide-react";

interface RepostCardProps {
  type: 'topic' | 'resource' | 'video';
  id: string;
  className?: string;
}

const RepostCard = ({ type, id, className = "" }: RepostCardProps) => {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, [type, id]);

  const loadContent = async () => {
    try {
      const table = type === 'topic' ? 'topics' : type === 'resource' ? 'resources' : 'videos';
      const { data, error } = await supabase
        .from(table)
        .select('id, title, content, description')
        .eq('id', id)
        .single();

      if (error) throw error;
      setContent(data);
    } catch (error) {
      console.error('Error loading repost content:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={`p-2 bg-muted ${className}`}>
        <p className="text-xs text-muted-foreground">Загрузка...</p>
      </Card>
    );
  }

  if (!content) {
    return (
      <Card className={`p-2 bg-muted ${className}`}>
        <p className="text-xs text-muted-foreground">Контент удалён</p>
      </Card>
    );
  }

  const getIcon = () => {
    switch (type) {
      case 'topic':
        return <FileText className="h-4 w-4" />;
      case 'resource':
        return <Link2 className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'topic':
        return 'Тема';
      case 'resource':
        return 'Ресурс';
      case 'video':
        return 'Видео';
    }
  };

  return (
    <Card className={`p-3 bg-muted border-l-4 border-primary ${className}`}>
      <div className="flex items-start gap-2">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            {getLabel()}
          </p>
          <p className="font-medium text-sm mb-1 truncate">{content.title}</p>
          {(content.description || content.content) && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {content.description || content.content}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default RepostCard;
