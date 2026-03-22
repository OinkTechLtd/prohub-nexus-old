import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, Share2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  likes: number;
  views: number;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const VideoSwiper = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  }, [currentIndex]);

  const loadVideos = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select(`
        *,
        profiles (
          username,
          avatar_url
        )
      `)
      .eq('is_hidden', false)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setVideos(data || []);
  };

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsLiked(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsLiked(false);
    }
  };

  const handleLike = async () => {
    const video = videos[currentIndex];
    const newLikes = isLiked ? video.likes - 1 : video.likes + 1;

    const { error } = await supabase
      .from("videos")
      .update({ likes: newLikes })
      .eq("id", video.id);

    if (error) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setIsLiked(!isLiked);
    setVideos(videos.map(v => 
      v.id === video.id ? { ...v, likes: newLikes } : v
    ));
  };

  const handleShare = () => {
    const video = videos[currentIndex];
    const url = `${window.location.origin}/video/${video.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Ссылка скопирована",
      description: "Ссылка на видео скопирована в буфер обмена",
    });
  };

  if (videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Видео не найдены</p>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        src={currentVideo.video_url}
        className="absolute inset-0 w-full h-full object-contain"
        loop
        playsInline
      />

      {/* Navigation */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4">
        <Button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          size="icon"
          variant="secondary"
          className="rounded-full"
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
        <Button
          onClick={handleNext}
          disabled={currentIndex === videos.length - 1}
          size="icon"
          variant="secondary"
          className="rounded-full"
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
      </div>

      {/* Actions */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <Heart 
            className={`h-8 w-8 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} 
          />
          <span className="text-white text-sm font-semibold">
            {currentVideo.likes}
          </span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <MessageCircle className="h-8 w-8 text-white" />
          <span className="text-white text-sm font-semibold">0</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 className="h-8 w-8 text-white" />
          <span className="text-white text-sm font-semibold">Поделиться</span>
        </button>
      </div>

      {/* Info */}
      <div className="absolute bottom-4 left-4 right-20 text-white">
        <div className="flex items-center gap-2 mb-2">
          {currentVideo.profiles.avatar_url && (
            <img
              src={currentVideo.profiles.avatar_url}
              alt={currentVideo.profiles.username}
              className="w-10 h-10 rounded-full"
            />
          )}
          <span className="font-semibold">@{currentVideo.profiles.username}</span>
        </div>
        <h3 className="font-bold text-lg mb-1">{currentVideo.title}</h3>
        <p className="text-sm opacity-90">{currentVideo.description}</p>
        <p className="text-xs opacity-75 mt-2">{currentVideo.views} просмотров</p>
      </div>

      {/* Progress indicator */}
      <div className="absolute top-4 left-0 right-0 flex justify-center gap-1 px-4">
        {videos.map((_, index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full ${
              index === currentIndex ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoSwiper;