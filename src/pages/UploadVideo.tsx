import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";

const UploadVideo = () => {
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (500MB limit)
      if (file.size > 500 * 1024 * 1024) {
        toast({
          title: "Файл слишком большой",
          description: "Максимальный размер видео - 500 МБ",
          variant: "destructive",
        });
        return;
      }
      
      setVideoFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !videoFile || !title.trim()) {
      toast({
        title: "Заполните все поля",
        description: "Название и видео файл обязательны",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload video file
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('videos')
        .upload(fileName, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      // Create video record
      const { error: insertError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          video_url: publicUrl,
        });

      if (insertError) throw insertError;

      // Check achievements
      await supabase.rpc("check_and_award_achievements", {
        _user_id: user.id,
      });

      toast({
        title: "Видео загружено!",
        description: "Ваше видео успешно опубликовано",
      });

      navigate("/videos");
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Загрузить видео</CardTitle>
            <CardDescription>
              Поделитесь обучающим видео с сообществом
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Название *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Введите название видео"
                  maxLength={200}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Расскажите о видео..."
                  rows={4}
                  maxLength={1000}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video">Видео файл * (макс. 500 МБ)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Input
                    id="video"
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    onChange={handleFileChange}
                    className="hidden"
                    required
                  />
                  <label htmlFor="video" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {videoFile ? videoFile.name : "Нажмите для выбора файла"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      MP4, WebM, OGG, MOV
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={uploading || !videoFile || !title.trim()}
                  className="flex-1"
                >
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {uploading ? "Загрузка..." : "Опубликовать"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/videos")}
                  disabled={uploading}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UploadVideo;
