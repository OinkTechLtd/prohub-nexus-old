-- Исправление security warnings: добавить search_path к функциям

-- Исправить randomly_assign_editor_role
CREATE OR REPLACE FUNCTION randomly_assign_editor_role()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Исправить check_editor_to_moderator_upgrade
CREATE OR REPLACE FUNCTION check_editor_to_moderator_upgrade(_user_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;