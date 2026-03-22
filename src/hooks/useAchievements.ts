import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number;
  badge_color: string;
  points: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievements: Achievement;
}

export const useAchievements = (userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all achievements
  const { data: allAchievements = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("points", { ascending: true });

      if (error) throw error;
      return data as Achievement[];
    },
  });

  // Fetch user's earned achievements
  const { data: userAchievements = [], isLoading: isLoadingUser } = useQuery({
    queryKey: ["user-achievements", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("user_achievements")
        .select("*, achievements(*)")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return data as UserAchievement[];
    },
    enabled: !!userId,
  });

  // Check and award achievements
  const checkAchievements = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.rpc("check_and_award_achievements", {
        _user_id: userId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-achievements"] });
    },
    onError: (error) => {
      console.error("Error checking achievements:", error);
    },
  });

  // Combine achievements with user's progress
  const achievementsWithProgress = allAchievements.map((achievement) => {
    const userAchievement = userAchievements.find(
      (ua) => ua.achievement_id === achievement.id
    );

    return {
      ...achievement,
      earned: !!userAchievement,
      earnedAt: userAchievement?.earned_at || null,
    };
  });

  // Calculate total points
  const totalPoints = userAchievements.reduce(
    (sum, ua) => sum + (ua.achievements?.points || 0),
    0
  );

  const earnedCount = userAchievements.length;
  const totalCount = allAchievements.length;

  return {
    allAchievements,
    userAchievements,
    achievementsWithProgress,
    totalPoints,
    earnedCount,
    totalCount,
    isLoading: isLoadingAll || isLoadingUser,
    checkAchievements: checkAchievements.mutate,
    isChecking: checkAchievements.isPending,
  };
};
