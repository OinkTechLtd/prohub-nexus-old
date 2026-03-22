import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, ThumbsUp, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  views: number;
  likes: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

const VideoView = () => {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (id) {
      loadVideo();
    }
  }, [id]);

  const loadVideo = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setVideo(data);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive",
      });
      navigate("/videos");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Войдите в систему",
        description: "Чтобы ставить лайки, нужно войти",
        variant: "destructive",
      });
      return;
    }

    try {
      const newLikes = liked ? video!.likes - 1 : video!.likes + 1;
      
      const { error } = await supabase
        .from("videos")
        .update({ likes: newLikes })
        .eq("id", id);

      if (error) throw error;

      setVideo({ ...video!, likes: newLikes });
      setLiked(!liked);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">Загрузка...</div>
        </main>
      </div>
    );
  }

  if (!video) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/videos")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к видео
        </Button>

        <Card>
          <CardContent className="p-0">
            <div className="aspect-video bg-black">
              <video
                src={video.video_url}
                controls
                className="w-full h-full"
                autoPlay
              >
                Ваш браузер не поддерживает видео.
              </video>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{video.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {video.views} просмотров
                  </span>
                  <span>•</span>
                  <span>{new Date(video.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  variant={liked ? "default" : "outline"}
                  onClick={handleLike}
                  className="gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  {video.likes}
                </Button>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-semibold">
                    {video.profiles?.username?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="font-semibold">
                    {video.profiles?.username || "Аноним"}
                  </span>
                </div>
                
                {video.description && (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {video.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VideoView;
