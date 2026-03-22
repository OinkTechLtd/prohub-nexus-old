import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ModerationDialog from "@/components/ModerationDialog";
import { getModeratedContent } from "@/lib/moderation";

const ModeratorResources = () => {
  const [user, setUser] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'hidden' | 'active'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canModerateResources, loading: roleLoading } = useUserRole();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });
  }, [navigate]);

  useEffect(() => {
    if (!roleLoading && !canModerateResources) {
      toast({
        title: "Доступ запрещён",
        description: "У вас нет прав для модерации ресурсов",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [canModerateResources, roleLoading, navigate, toast]);

  useEffect(() => {
    if (canModerateResources) {
      loadResources();
    }
  }, [statusFilter, searchQuery, canModerateResources]);

  const loadResources = async () => {
    setLoading(true);
    try {
      const data = await getModeratedContent('resource', {
        status: statusFilter,
        search: searchQuery,
      });
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

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} />
        <div className="container mx-auto px-4 py-8 text-center">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Модерация ресурсов</h1>
          </div>
          <p className="text-muted-foreground">
            Управление ресурсами и модерация контента
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по названию..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все ресурсы</SelectItem>
                  <SelectItem value="active">Только активные</SelectItem>
                  <SelectItem value="hidden">Только скрытые</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : resources.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Ресурсов не найдено
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {resources.map((resource) => (
              <Card key={resource.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{resource.title}</h3>
                        <Badge variant={resource.is_hidden ? "destructive" : "default"}>
                          {resource.is_hidden ? "Скрыт" : "Активен"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {resource.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Автор: {resource.profiles?.username} • Скачиваний: {resource.downloads}
                      </p>
                    </div>
                    <Button
                      onClick={() => setSelectedResource(resource)}
                      variant="outline"
                      size="sm"
                    >
                      Модерировать
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {selectedResource && (
        <ModerationDialog
          open={!!selectedResource}
          onOpenChange={(open) => !open && setSelectedResource(null)}
          contentType="resource"
          contentId={selectedResource.id}
          contentTitle={selectedResource.title}
          isHidden={selectedResource.is_hidden}
          onSuccess={loadResources}
        />
      )}
    </div>
  );
};

export default ModeratorResources;
