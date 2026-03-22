-- ЭТАП 7: Встроенный мессенджер

-- 1. Таблица чатов
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Участники чата
CREATE TABLE chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

-- 3. Сообщения
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT FALSE,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Репост контента
  repost_type TEXT CHECK(repost_type IN ('topic', 'resource', 'video')),
  repost_id UUID
);

-- 4. Реакции (эмодзи)
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Включить RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Политики для chats
CREATE POLICY "Users can view their chats" ON chats
FOR SELECT USING (
  id IN (
    SELECT chat_id FROM chat_participants WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create chats" ON chats
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their chats" ON chats
FOR UPDATE USING (
  id IN (
    SELECT chat_id FROM chat_participants WHERE user_id = auth.uid()
  )
);

-- Политики для chat_participants
CREATE POLICY "Users can view participants in their chats" ON chat_participants
FOR SELECT USING (
  chat_id IN (
    SELECT chat_id FROM chat_participants WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can join chats" ON chat_participants
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Политики для messages
CREATE POLICY "Users can view messages in their chats" ON messages
FOR SELECT USING (
  chat_id IN (
    SELECT chat_id FROM chat_participants WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages in their chats" ON messages
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  chat_id IN (
    SELECT chat_id FROM chat_participants WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" ON messages
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON messages
FOR DELETE USING (user_id = auth.uid());

-- Политики для message_reactions
CREATE POLICY "Users can view reactions in their chats" ON message_reactions
FOR SELECT USING (
  message_id IN (
    SELECT id FROM messages WHERE chat_id IN (
      SELECT chat_id FROM chat_participants WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can add reactions" ON message_reactions
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own reactions" ON message_reactions
FOR DELETE USING (user_id = auth.uid());

-- Включить realtime для сообщений и реакций
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE message_reactions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;

-- Индексы для производительности
CREATE INDEX idx_chat_participants_user ON chat_participants(user_id);
CREATE INDEX idx_chat_participants_chat ON chat_participants(chat_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);