-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  condition_type TEXT NOT NULL, -- 'posts_count', 'topics_count', 'resources_count', 'videos_count', 'days_registered', 'role_achieved'
  condition_value INTEGER NOT NULL,
  badge_color TEXT NOT NULL DEFAULT 'blue',
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements
CREATE POLICY "Achievements are viewable by everyone"
  ON public.achievements
  FOR SELECT
  USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can earn achievements"
  ON public.user_achievements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  achievement RECORD;
  posts_count INTEGER;
  topics_count INTEGER;
  resources_count INTEGER;
  videos_count INTEGER;
  days_registered INTEGER;
  current_role app_role;
BEGIN
  -- Get user stats
  SELECT COUNT(*) INTO posts_count FROM public.posts WHERE user_id = _user_id;
  SELECT COUNT(*) INTO topics_count FROM public.topics WHERE user_id = _user_id;
  SELECT COUNT(*) INTO resources_count FROM public.resources WHERE user_id = _user_id;
  SELECT COUNT(*) INTO videos_count FROM public.videos WHERE user_id = _user_id;
  SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER INTO days_registered FROM public.profiles WHERE id = _user_id;
  SELECT public.get_user_role(_user_id) INTO current_role;
  
  -- Check all achievements
  FOR achievement IN SELECT * FROM public.achievements LOOP
    -- Check if user already has this achievement
    IF NOT EXISTS (
      SELECT 1 FROM public.user_achievements 
      WHERE user_id = _user_id AND achievement_id = achievement.id
    ) THEN
      -- Check conditions
      IF (achievement.condition_type = 'posts_count' AND posts_count >= achievement.condition_value) OR
         (achievement.condition_type = 'topics_count' AND topics_count >= achievement.condition_value) OR
         (achievement.condition_type = 'resources_count' AND resources_count >= achievement.condition_value) OR
         (achievement.condition_type = 'videos_count' AND videos_count >= achievement.condition_value) OR
         (achievement.condition_type = 'days_registered' AND days_registered >= achievement.condition_value) OR
         (achievement.condition_type = 'role_achieved' AND 
          ((achievement.condition_value = 1 AND current_role = 'newbie') OR
           (achievement.condition_value = 2 AND current_role IN ('pro', 'editor', 'moderator', 'admin')) OR
           (achievement.condition_value = 3 AND current_role IN ('editor', 'moderator', 'admin')) OR
           (achievement.condition_value = 4 AND current_role IN ('moderator', 'admin')) OR
           (achievement.condition_value = 5 AND current_role = 'admin'))) THEN
        -- Award achievement
        INSERT INTO public.user_achievements (user_id, achievement_id)
        VALUES (_user_id, achievement.id)
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX idx_achievements_condition_type ON public.achievements(condition_type);