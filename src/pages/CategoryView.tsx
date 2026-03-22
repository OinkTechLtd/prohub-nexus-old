import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import UserLink from "@/components/UserLink";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Eye, Pin, Lock, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface Topic {
  id: string;
  title: string;
  content: string;
  views: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  profiles: {
    username: string;
  };
  postCount?: number;
}

const CategoryView = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
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
    loadCategoryAndTopics();
  }, [slug]);

  const loadCategoryAndTopics = async () => {
    try {
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .single();

      if (categoryError) throw categoryError;
      setCategory(categoryData);

      const { data: topicsData, error: topicsError } = await supabase
        .from("topics")
        .select(`
          *,
          profiles (
            username
          )
        `)
        .eq("category_id", categoryData.id)
        .eq("is_hidden", false)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (topicsError) throw topicsError;

      const topicsWithCounts = await Promise.all(
        (topicsData || []).map(async (topic) => {
          const { count } = await supabase
            .from("posts")
            .select("*", { count: "exact", head: true })
            .eq("topic_id", topic.id)
            .eq("is_hidden", false);

          return {
            ...topic,
            postCount: count || 0,
          };
        })
      );

      setTopics(topicsWithCounts);
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

  if (loading) {
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center">
              <span className="mr-3 text-5xl">{category?.icon}</span>
              {category?.name}
            </h1>
            <p className="text-muted-foreground">{category?.description}</p>
          </div>
          {user && (
            <Button onClick={() => navigate(`/create-topic?category=${category?.id}`)}>
              <Plus className="mr-2 h-4 w-4" />
              Новая тема
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {topics.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                В этом разделе пока нет тем. Создайте первую!
              </CardContent>
            </Card>
          ) : (
            topics.map((topic) => (
              <Card
                key={topic.id}
                className="hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/topic/${topic.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {topic.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                        {topic.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                        <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                          {topic.title}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        от <UserLink username={topic.profiles?.username} showAvatar={false} /> •{" "}
                        {formatDistanceToNow(new Date(topic.created_at), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <MessageSquare className="mr-1 h-4 w-4" />
                        {topic.postCount}
                      </div>
                      <div className="flex items-center">
                        <Eye className="mr-1 h-4 w-4" />
                        {topic.views}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default CategoryView;