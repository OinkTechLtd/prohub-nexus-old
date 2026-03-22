import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationRequest {
  topic_id: string;
  content: string;
  title: string;
}

// Паттерны для автоматической модерации
const SPAM_PATTERNS = [
  /\b(viagra|cialis|casino|poker|lottery|prize|winner)\b/i,
  /\b(click here|buy now|limited offer|act now)\b/i,
  /\b(free money|earn \$\$|make money fast)\b/i,
];

const ADULT_PATTERNS = [
  /\b(porn|xxx|sex|adult|nude)\b/i,
  /\b(18\+|nsfw)\b/i,
];

const AD_PATTERNS = [
  /\b(реклама|продам|куплю|скидка|акция)\b/i,
  /\b(telegram|whatsapp|viber).{0,10}(\+\d{10,}|\d{10,})/i,
  /\b(http|https|www\.)\S+\.(ru|com|net)\b/gi,
];

function checkForProhibitedContent(text: string): { isProhibited: boolean; reason: string } {
  const fullText = text.toLowerCase();

  // Проверка на спам
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(fullText)) {
      return { isProhibited: true, reason: 'Обнаружен спам' };
    }
  }

  // Проверка на контент для взрослых
  for (const pattern of ADULT_PATTERNS) {
    if (pattern.test(fullText)) {
      return { isProhibited: true, reason: 'Обнаружен контент для взрослых' };
    }
  }

  // Проверка на рекламу
  let adCount = 0;
  for (const pattern of AD_PATTERNS) {
    if (pattern.test(fullText)) {
      adCount++;
    }
  }
  if (adCount >= 2) {
    return { isProhibited: true, reason: 'Обнаружена реклама' };
  }

  return { isProhibited: false, reason: '' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { topic_id, content, title }: ModerationRequest = await req.json();

    console.log(`Автомодерация темы ${topic_id}: "${title}"`);

    // Проверка контента
    const combinedText = `${title} ${content}`;
    const moderationResult = checkForProhibitedContent(combinedText);

    if (moderationResult.isProhibited) {
      console.log(`Тема ${topic_id} скрыта: ${moderationResult.reason}`);

      // Скрыть тему
      const { error: updateError } = await supabase
        .from('topics')
        .update({ is_hidden: true })
        .eq('id', topic_id);

      if (updateError) {
        console.error('Ошибка скрытия темы:', updateError);
        throw updateError;
      }

      // Добавить запись в moderated_content (moderator_id = null означает автоматическую модерацию)
      const { error: moderationError } = await supabase
        .from('moderated_content')
        .insert({
          content_type: 'topic',
          content_id: topic_id,
          reason: `Автоматическая модерация: ${moderationResult.reason}`,
          moderator_id: null,
        });

      if (moderationError) {
        console.error('Ошибка добавления записи модерации:', moderationError);
      }

      return new Response(
        JSON.stringify({
          moderated: true,
          reason: moderationResult.reason,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Тема ${topic_id} прошла проверку`);

    return new Response(
      JSON.stringify({
        moderated: false,
        reason: 'Контент прошёл проверку',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Ошибка автомодерации:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
