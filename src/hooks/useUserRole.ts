import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = () => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [canModerateResources, setCanModerateResources] = useState(false);
  const [canModerateTopics, setCanModerateTopics] = useState(false);

  useEffect(() => {
    loadUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setCanModerateResources(false);
        setCanModerateTopics(false);
        setLoading(false);
        return;
      }

      // Получить роль пользователя
      const { data: roleData, error } = await supabase.rpc('get_user_role', {
        _user_id: user.id,
      });

      if (error) {
        console.error('Error loading user role:', error);
        setRole('newbie');
      } else {
        setRole(roleData || 'newbie');
      }

      // Получить права модерации
      const { data: moderationRights } = await supabase
        .from('user_roles')
        .select('can_moderate_resources, can_moderate_topics')
        .eq('user_id', user.id)
        .eq('role', 'moderator')
        .single();

      if (moderationRights) {
        setCanModerateResources(moderationRights.can_moderate_resources || false);
        setCanModerateTopics(moderationRights.can_moderate_topics || false);
      }
    } catch (error) {
      console.error('Error in loadUserRole:', error);
      setRole('newbie');
    } finally {
      setLoading(false);
    }
  };

  const isModerator = role === 'moderator' || role === 'admin';
  const isAdmin = role === 'admin';
  const isEditor = role === 'editor' || isModerator;

  return {
    role,
    loading,
    isModerator,
    isAdmin,
    isEditor,
    canModerateResources,
    canModerateTopics,
  };
};
