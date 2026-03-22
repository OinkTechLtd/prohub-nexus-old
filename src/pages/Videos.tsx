import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import UserLink from "@/components/UserLink";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Play, Eye, ThumbsUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  views: number;
  likes: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

const Videos = () => {
  const [user, setUser] = useState<any>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
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
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVideos(data || []);
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

  const handleVideoClick = async (videoId: string, currentViews: number) => {
    // Increment view count
    await supabase
      .from("videos")
      .update({ views: currentViews + 1 })
      .eq("id", videoId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Видео</h1>
            <p className="text-muted-foreground">Смотрите и делитесь обучающими видео</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/videos/swipe")} variant="outline" size="lg">
              <Play className="mr-2 h-5 w-5" />
              Свайп режим
            </Button>
            {user && (
              <Button onClick={() => navigate("/upload-video")} size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Загрузить видео
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video) => (
              <Card
                key={video.id}
                className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                onClick={() => {
                  handleVideoClick(video.id, video.views);
                  navigate(`/video/${video.id}`);
                }}
              >
                <div className="relative aspect-[9/16] bg-muted">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-semibold text-lg mb-1 line-clamp-2">{video.title}</h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {video.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {video.likes}
                      </span>
                    </div>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {video.description || "Без описания"}
                  </p>
                  <div className="mt-2">
                    <UserLink 
                      username={video.profiles?.username || "Аноним"} 
                      avatarUrl={video.profiles?.avatar_url}
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && videos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Пока нет видео</p>
            {user && (
              <Button onClick={() => navigate("/upload-video")}>
                Загрузить первое видео
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Videos;
