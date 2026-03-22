-- ЭТАП 3: Расширенная система ролей с модерацией

-- 1. Добавить новые поля в user_roles
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS can_moderate_resources BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_moderate_topics BOOLEAN DEFAULT FALSE;

-- 2. Обновить существующие записи
UPDATE user_roles 
SET assigned_at = created_at 
WHERE assigned_at IS NULL;

-- 3. Функция рандомной выдачи роли Editor (вызывается вручную или по расписанию)
CREATE OR REPLACE FUNCTION randomly_assign_editor_role()
RETURNS void AS $$
DECLARE
  eligible_user RECORD;
BEGIN
  -- Выбрать случайных pro пользователей (10% шанс)
  FOR eligible_user IN 
    SELECT DISTINCT ur.user_id 
    FROM user_roles ur
    WHERE ur.role = 'pro'
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur2 
      WHERE ur2.user_id = ur.user_id 
      AND ur2.role IN ('editor', 'moderator', 'admin')
    )
    AND RANDOM() < 0.1
  LOOP
    INSERT INTO user_roles (user_id, role, assigned_at)
    VALUES (eligible_user.user_id, 'editor', NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Функция проверки перехода Editor -> Moderator
CREATE OR REPLACE FUNCTION check_editor_to_moderator_upgrade(_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  days_since_editor INTEGER;
  resource_count INTEGER;
  content_count INTEGER;
BEGIN
  -- Проверить сколько дней пользователь в роли editor
  SELECT EXTRACT(DAY FROM NOW() - assigned_at)::INTEGER
  INTO days_since_editor
  FROM user_roles
  WHERE user_id = _user_id AND role = 'editor'
  ORDER BY assigned_at DESC
  LIMIT 1;
  
  -- Если не нашли роль editor, вернуть false
  IF days_since_editor IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Проверить количество ресурсов
  SELECT COUNT(*) INTO resource_count
  FROM resources
  WHERE user_id = _user_id AND is_hidden = FALSE;
  
  -- Проверить количество тем + постов
  SELECT 
    (SELECT COUNT(*) FROM topics WHERE user_id = _user_id AND is_hidden = FALSE) +
    (SELECT COUNT(*) FROM posts WHERE user_id = _user_id AND is_hidden = FALSE)
  INTO content_count;
  
  -- Условия: 30-40 дней, 200+ ресурсов, 100+ контента
  IF days_since_editor BETWEEN 30 AND 40 
     AND resource_count >= 200 
     AND content_count >= 100 THEN
    
    INSERT INTO user_roles (user_id, role, can_moderate_resources, assigned_at)
    VALUES (_user_id, 'moderator', TRUE, NOW())
    ON CONFLICT (user_id, role) DO UPDATE
    SET can_moderate_resources = TRUE;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Обновить функцию check_and_upgrade_role для включения новых проверок
CREATE OR REPLACE FUNCTION check_and_upgrade_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  post_count INTEGER;
  current_role app_role;
BEGIN
  -- Подсчет постов и тем
  SELECT 
    (SELECT COUNT(*) FROM public.posts WHERE user_id = _user_id) +
    (SELECT COUNT(*) FROM public.topics WHERE user_id = _user_id)
  INTO post_count;
  
  SELECT public.get_user_role(_user_id) INTO current_role;
  
  -- Апгрейд до pro при 20 постах
  IF post_count >= 20 AND (current_role IS NULL OR current_role = 'newbie') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'pro')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Проверка апгрейда Editor -> Moderator
  IF current_role = 'editor' THEN
    PERFORM check_editor_to_moderator_upgrade(_user_id);
  END IF;
END;
$$;