-- Add foreign key relationship between videos and profiles
ALTER TABLE public.videos
DROP CONSTRAINT IF EXISTS videos_user_id_fkey;

ALTER TABLE public.videos
ADD CONSTRAINT videos_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;