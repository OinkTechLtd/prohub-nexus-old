// Simple content moderation utility
import { supabase } from "@/integrations/supabase/client";

const BLOCKED_PATTERNS = [
  /спам/gi,
  /реклама/gi,
  /казино/gi,
  /ставк[аи]/gi,
  /купи(ть|те)/gi,
  /заработок/gi,
  /http[s]?:\/\/(?!prohub\.|localhost)/gi, // Block external links
];

export function moderateContent(text: string): { isClean: boolean; reason?: string } {
  if (!text || typeof text !== 'string') {
    return { isClean: true };
  }

  const normalized = text.toLowerCase().trim();

  // Check for excessive caps
  const capsCount = (text.match(/[A-ZА-Я]/g) || []).length;
  if (capsCount > text.length * 0.6 && text.length > 10) {
    return { 
      isClean: false, 
      reason: "Слишком много заглавных букв. Пожалуйста, используйте обычный регистр." 
    };
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { 
        isClean: false, 
        reason: "Контент содержит запрещенные слова или ссылки. Пожалуйста, исправьте текст." 
      };
    }
  }

  // Check for excessive repetition
  const words = normalized.split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > 10 && uniqueWords.size < words.length * 0.3) {
    return { 
      isClean: false, 
      reason: "Обнаружено слишком много повторяющихся слов." 
    };
  }

  return { isClean: true };
}

// Новые функции для модерации

export async function hideContent(
  contentType: 'topic' | 'post' | 'resource' | 'video',
  contentId: string,
  reason: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Скрыть контент
  const tableName = contentType === 'post' ? 'posts' : 
                   contentType === 'topic' ? 'topics' : 
                   contentType === 'resource' ? 'resources' : 'videos';

  const { error: updateError } = await supabase
    .from(tableName)
    .update({ is_hidden: true })
    .eq('id', contentId);

  if (updateError) throw updateError;

  // Добавить запись в moderated_content
  const { error: moderationError } = await supabase
    .from('moderated_content')
    .insert({
      content_type: contentType,
      content_id: contentId,
      reason,
      moderator_id: user.id,
    });

  if (moderationError) throw moderationError;
}

export async function unhideContent(
  contentType: 'topic' | 'post' | 'resource' | 'video',
  contentId: string,
  reason?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Восстановить контент
  const tableName = contentType === 'post' ? 'posts' : 
                   contentType === 'topic' ? 'topics' : 
                   contentType === 'resource' ? 'resources' : 'videos';

  const { error: updateError } = await supabase
    .from(tableName)
    .update({ is_hidden: false })
    .eq('id', contentId);

  if (updateError) throw updateError;

  // Опционально добавить запись о восстановлении
  if (reason) {
    await supabase
      .from('moderated_content')
      .insert({
        content_type: contentType,
        content_id: contentId,
        reason: `Восстановлено: ${reason}`,
        moderator_id: user.id,
      });
  }
}

export async function getModerationHistory(
  contentType: string,
  contentId: string
) {
  const { data, error } = await supabase
    .from('moderated_content')
    .select(`
      *,
      profiles:moderator_id (
        username
      )
    `)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getModeratedContent(
  contentType: 'topic' | 'post' | 'resource' | 'video',
  filters?: {
    status?: 'all' | 'hidden' | 'active';
    search?: string;
  }
) {
  const tableName = contentType === 'post' ? 'posts' : 
                   contentType === 'topic' ? 'topics' : 
                   contentType === 'resource' ? 'resources' : 'videos';

  let query = supabase
    .from(tableName)
    .select(`
      *,
      profiles (
        username
      )
    `);

  // Фильтр по статусу
  if (filters?.status === 'hidden') {
    query = query.eq('is_hidden', true);
  } else if (filters?.status === 'active') {
    query = query.eq('is_hidden', false);
  }

  // Поиск по названию/контенту
  if (filters?.search) {
    if (contentType === 'resource' || contentType === 'video') {
      query = query.ilike('title', `%${filters.search}%`);
    } else {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }
  }

  query = query.order('created_at', { ascending: false }).limit(100);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
