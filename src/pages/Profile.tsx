import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { profileSchema } from "@/lib/schemas";
import { Upload, Camera, Edit, MessageCircle, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useAchievements } from "@/hooks/useAchievements";
import { AchievementCard } from "@/components/AchievementCard";

interface Topic {
  id: string;
  title: string;
  created_at: string;
  views: number;
  categories: { name: string };
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  topics: { id: string; title: string };
}

interface Resource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  downloads: number;
  created_at: string;
}

const Profile = () => {
  const { username: usernameParam } = useParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [userRole, setUserRole] = useState<string>("newbie");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [stats, setStats] = useState({ topics: 0, posts: 0, resources: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { 
    achievementsWithProgress, 
    totalPoints, 
    earnedCount, 
    totalCount,
    checkAchievements,
    isLoading: isLoadingAchievements 
  } = useAchievements(profile?.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      if (usernameParam) {
        loadProfileByUsername(usernameParam, session?.user?.id);
      } else if (session?.user) {
        loadProfileByUserId(session.user.id, session.user.id);
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [usernameParam, navigate]);

  const loadProfileByUsername = async (username: string, currentUserId?: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error) throw error;
      
      setProfile(profileData);
      setUsername(profileData.username);
      setBio(profileData.bio || "");
      setIsOwnProfile(currentUserId === profileData.id);
      
      await loadUserData(profileData.id);
      
      // Check achievements after loading profile
      if (profileData.id) {
        checkAchievements(profileData.id);
      }
      
      // Check achievements after loading profile
      if (profileData.id) {
        checkAchievements(profileData.id);
      }
    } catch (error: any) {
      toast({
        title: "Пользователь не найден",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const loadProfileByUserId = async (userId: string, currentUserId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      
      setProfile(profileData);
      setUsername(profileData.username);
      setBio(profileData.bio || "");
      setIsOwnProfile(userId === currentUserId);
      
      await loadUserData(userId);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки профиля",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      // Get role
      const { data: roleData } = await supabase.rpc('get_user_role', { _user_id: userId });
      setUserRole(roleData || "newbie");

      // Get topics
      const { data: topicsData } = await supabase
        .from("topics")
        .select("id, title, created_at, views, categories(name)")
        .eq("user_id", userId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(10);

      setTopics(topicsData || []);

      // Get posts
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, content, created_at, topics(id, title)")
        .eq("user_id", userId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(10);

      setPosts(postsData || []);

      // Get resources
      const { data: resourcesData } = await supabase
        .from("resources")
        .select("id, title, description, resource_type, downloads, created_at")
        .eq("user_id", userId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(10);

      setResources(resourcesData || []);

      // Get stats
      const { count: topicsCount } = await supabase
        .from("topics")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_hidden", false);

      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_hidden", false);

      const { count: resourcesCount } = await supabase
        .from("resources")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_hidden", false);

      setStats({
        topics: topicsCount || 0,
        posts: postsCount || 0,
        resources: resourcesCount || 0,
      });
    } catch (error: any) {
      console.error("Error loading user data:", error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !isOwnProfile || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}/avatar-${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('profile-covers')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-covers')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      toast({ title: "Аватар обновлён" });
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !isOwnProfile || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}/cover-${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('profile-covers')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-covers')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cover_url: publicUrl })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, cover_url: publicUrl });
      toast({ title: "Обложка обновлена" });
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isOwnProfile) return;

    const validation = profileSchema.safeParse({ username, bio });
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast({
        title: "Ошибка валидации",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username, bio })
        .eq("id", currentUser.id);

      if (error) throw error;

      toast({ title: "Профиль обновлен" });
      setEditMode(false);
    } catch (error: any) {
      toast({
        title: "Ошибка обновления",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!currentUser || !profile) return;

    try {
      // Проверить, есть ли уже чат между этими пользователями
      const { data: existingChats } = await supabase
        .from("chat_participants")
        .select("chat_id")
        .eq("user_id", currentUser.id);

      if (existingChats && existingChats.length > 0) {
        // Проверить, есть ли общий чат с этим пользователем
        const chatIds = existingChats.map((c) => c.chat_id);
        const { data: otherUserChats } = await supabase
          .from("chat_participants")
          .select("chat_id")
          .eq("user_id", profile.id)
          .in("chat_id", chatIds);

        if (otherUserChats && otherUserChats.length > 0) {
          // Чат уже существует, перейти к нему
          navigate(`/chat/${otherUserChats[0].chat_id}`);
          return;
        }
      }

      // Создать новый чат
      const { data: newChat, error: chatError } = await supabase
        .from("chats")
        .insert({})
        .select()
        .single();

      if (chatError) throw chatError;

      // Добавить участников
      const { error: participantsError } = await supabase
        .from("chat_participants")
        .insert([
          { chat_id: newChat.id, user_id: currentUser.id },
          { chat_id: newChat.id, user_id: profile.id },
        ]);

      if (participantsError) throw participantsError;

      navigate(`/chat/${newChat.id}`);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-500",
      moderator: "bg-purple-500",
      editor: "bg-blue-500",
      pro: "bg-green-500",
      newbie: "bg-gray-500",
    };
    return colors[role] || "bg-gray-500";
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Администратор",
      moderator: "Модератор",
      editor: "Редактор",
      pro: "Профи",
      newbie: "Новичок",
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={currentUser} />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Cover Image */}
        <div className="relative w-full h-48 md:h-64 bg-gradient-to-r from-primary to-primary/60 rounded-t-lg overflow-hidden">
          {profile?.cover_url && (
            <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
          )}
          {isOwnProfile && (
            <label className="absolute top-4 right-4 cursor-pointer">
              <Button size="sm" variant="secondary" asChild>
                <span>
                  <Camera className="h-4 w-4 mr-2" />
                  Изменить обложку
                </span>
              </Button>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleCoverUpload}
              />
            </label>
          )}
        </div>

        {/* Profile Header */}
        <Card className="rounded-t-none -mt-16 relative">
          <CardContent className="pt-20 pb-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="relative -mt-20">
                <Avatar className="h-32 w-32 border-4 border-background">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={username} />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                      {username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
                {isOwnProfile && (
                  <label className="absolute bottom-0 right-0 cursor-pointer">
                    <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" asChild>
                      <span>
                        <Upload className="h-4 w-4" />
                      </span>
                    </Button>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{username}</h1>
                  <Badge className={getRoleBadgeColor(userRole)}>
                    {getRoleLabel(userRole)}
                  </Badge>
                  {isOwnProfile && !editMode && (
                    <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Редактировать
                    </Button>
                  )}
                  {!isOwnProfile && (
                    <Button variant="default" size="sm" onClick={handleStartChat}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Написать сообщение
                    </Button>
                  )}
                </div>
                {!editMode ? (
                  <p className="text-muted-foreground mb-4">{bio || "Нет описания"}</p>
                ) : (
                  <form onSubmit={handleUpdate} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Имя пользователя</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">О себе</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Расскажите о себе..."
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading}>
                        Сохранить
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditMode(false)}
                      >
                        Отмена
                      </Button>
                    </div>
                  </form>
                )}
                
                {/* Stats */}
                <div className="flex gap-6 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats.topics}</div>
                    <div className="text-sm text-muted-foreground">Тем</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats.posts}</div>
                    <div className="text-sm text-muted-foreground">Постов</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats.resources}</div>
                    <div className="text-sm text-muted-foreground">Ресурсов</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{earnedCount}/{totalCount}</div>
                    <div className="text-sm text-muted-foreground">Достижений</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalPoints}</div>
                    <div className="text-sm text-muted-foreground">Очков</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs with Content */}
        <Tabs defaultValue="topics" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="topics">Темы</TabsTrigger>
            <TabsTrigger value="posts">Сообщения</TabsTrigger>
            <TabsTrigger value="resources">Ресурсы</TabsTrigger>
            <TabsTrigger value="achievements">
              <Trophy className="h-4 w-4 mr-2" />
              Достижения
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topics" className="space-y-4 mt-4">
            {topics.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Нет тем
                </CardContent>
              </Card>
            ) : (
              topics.map((topic) => (
                <Card
                  key={topic.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/topic/${topic.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{topic.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(topic.categories as any)?.name} •{" "}
                          {formatDistanceToNow(new Date(topic.created_at), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </p>
                      </div>
                      <Badge variant="outline">{topic.views} просмотров</Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="posts" className="space-y-4 mt-4">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Нет сообщений
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Card
                  key={post.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/topic/${(post.topics as any)?.id}`)}
                >
                  <CardHeader>
                    <p className="text-sm text-muted-foreground mb-2">
                      В теме: {(post.topics as any)?.title}
                    </p>
                    <p className="text-sm line-clamp-3">{post.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </p>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="resources" className="space-y-4 mt-4">
            {resources.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Нет ресурсов
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {resources.map((resource) => (
                  <Card key={resource.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge>{resource.resource_type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {resource.downloads} загрузок
                        </span>
                      </div>
                      <CardTitle className="text-lg">{resource.title}</CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {resource.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(resource.created_at), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4 mt-4">
            {isLoadingAchievements ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Загрузка достижений...
                </CardContent>
              </Card>
            ) : achievementsWithProgress.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Достижений пока нет
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {achievementsWithProgress
                    .filter((a) => a.earned)
                    .map((achievement) => (
                      <AchievementCard
                        key={achievement.id}
                        name={achievement.name}
                        description={achievement.description}
                        icon={achievement.icon}
                        color={achievement.badge_color}
                        points={achievement.points}
                        earned={achievement.earned}
                        earnedAt={achievement.earnedAt}
                      />
                    ))}
                </div>
                
                {achievementsWithProgress.filter((a) => !a.earned).length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                      Заблокированные достижения
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {achievementsWithProgress
                        .filter((a) => !a.earned)
                        .map((achievement) => (
                          <AchievementCard
                            key={achievement.id}
                            name={achievement.name}
                            description={achievement.description}
                            icon={achievement.icon}
                            color={achievement.badge_color}
                            points={achievement.points}
                            earned={false}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
