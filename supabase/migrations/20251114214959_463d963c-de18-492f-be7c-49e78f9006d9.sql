-- Create role enum
CREATE TYPE public.app_role AS ENUM ('newbie', 'pro', 'editor', 'moderator', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'newbie',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 5
    WHEN 'moderator' THEN 4
    WHEN 'editor' THEN 3
    WHEN 'pro' THEN 2
    WHEN 'newbie' THEN 1
  END DESC
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Everyone can view roles"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Add cover_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Create moderated_content table to track moderation actions
CREATE TABLE public.moderated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'topic', 'post', 'resource', 'video'
  content_id UUID NOT NULL,
  moderator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.moderated_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view moderated content"
  ON public.moderated_content FOR SELECT
  USING (true);

CREATE POLICY "Moderators can add moderation records"
  ON public.moderated_content FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'moderator') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Add is_hidden flag to content tables
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- Add file_url to resources for uploaded files
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Create storage bucket for resource files
INSERT INTO storage.buckets (id, name, public)
VALUES ('resource-files', 'resource-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for profile covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-covers', 'profile-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resource-files
CREATE POLICY "Anyone can view resource files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resource-files');

CREATE POLICY "Authenticated users can upload resource files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resource-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own resource files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'resource-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own resource files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resource-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for profile-covers
CREATE POLICY "Anyone can view profile covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-covers');

CREATE POLICY "Authenticated users can upload their profile cover"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-covers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own profile cover"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-covers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile cover"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-covers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to auto-assign initial role to new users
CREATE OR REPLACE FUNCTION public.assign_initial_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'newbie');
  RETURN NEW;
END;
$$;

-- Trigger to auto-assign role on profile creation
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_initial_role();

-- Function to check and upgrade user role based on activity
CREATE OR REPLACE FUNCTION public.check_and_upgrade_role(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_count INTEGER;
  current_role app_role;
BEGIN
  -- Count user's posts and topics
  SELECT 
    (SELECT COUNT(*) FROM public.posts WHERE user_id = _user_id) +
    (SELECT COUNT(*) FROM public.topics WHERE user_id = _user_id)
  INTO post_count;
  
  -- Get current highest role
  SELECT public.get_user_role(_user_id) INTO current_role;
  
  -- Upgrade to pro at 20 posts
  IF post_count >= 20 AND (current_role IS NULL OR current_role = 'newbie') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'pro')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Upgrade to editor at 300 posts
  IF post_count >= 300 AND (current_role IN ('newbie', 'pro') OR current_role IS NULL) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'editor')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Upgrade to moderator at 3000 posts
  IF post_count >= 3000 AND (current_role IN ('newbie', 'pro', 'editor') OR current_role IS NULL) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'moderator')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- Update RLS policies for editing
CREATE POLICY "Editors can update all topics"
  ON public.topics FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'moderator') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Editors can update all posts"
  ON public.posts FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'moderator') OR
    public.has_role(auth.uid(), 'admin')
  );