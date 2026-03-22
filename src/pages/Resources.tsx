import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import UserLink from "@/components/UserLink";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Star, Plus, ExternalLink, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Resource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  url: string | null;
  file_url: string | null;
  is_hidden: boolean;
  downloads: number;
  rating: number;
  created_at: string;
  profiles: {
    username: string;
  };
}

const Resources = () => {
  const [user, setUser] = useState<any>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const { data, error } = await supabase
        .from("resources")
        .select(`
          *,
          profiles (
            username
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResources(data || []);
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

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      code: "bg-blue-500",
      tutorial: "bg-green-500",
      tool: "bg-purple-500",
      library: "bg-orange-500",
    };
    return colors[type] || "bg-gray-500";
  };

  const handleOpenResource = async (resource: Resource) => {
    if (resource.file_url) {
      // Download file
      window.open(resource.file_url, '_blank');
    } else if (resource.url) {
      // Open URL
      window.open(resource.url, '_blank');
    }
    
    // Increment download count
    await supabase
      .from('resources')
      .update({ downloads: resource.downloads + 1 })
      .eq('id', resource.id);
    
    loadResources();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Ресурсы</h1>
            <p className="text-muted-foreground">
              Полезные материалы, библиотеки и инструменты для разработки
            </p>
          </div>
          {user && (
            <Button onClick={() => navigate("/create-resource")}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить ресурс
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : resources.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Пока нет ресурсов. Добавьте первый!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={getTypeColor(resource.resource_type)}>
                      {resource.resource_type}
                    </Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                      {resource.rating.toFixed(1)}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{resource.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    от <UserLink username={resource.profiles?.username} showAvatar={false} />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{resource.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Download className="mr-1 h-4 w-4" />
                      {resource.downloads} загрузок
                    </div>
                  </div>
                  
                  {resource.is_hidden ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Ресурс удалён</AlertTitle>
                      <AlertDescription>
                        Данный ресурс был удалён модератором и больше недоступен.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleOpenResource(resource)}
                    >
                      {resource.file_url ? (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Скачать
                        </>
                      ) : (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Открыть
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Resources;