import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLOCKED_PATTERNS = [
  /спам/gi,
  /реклама/gi,
  /казино/gi,
  /ставк[аи]/gi,
  /купи(ть|те)/gi,
  /заработок/gi,
  /http[s]?:\/\/(?!prohub\.|localhost)/gi,
];

function moderateContent(text: string): { isClean: boolean; reason?: string } {
  if (!text || typeof text !== 'string') {
    return { isClean: true };
  }

  const normalized = text.toLowerCase().trim();

  // Check for excessive caps
  const capsCount = (text.match(/[A-ZА-Я]/g) || []).length;
  if (capsCount > text.length * 0.6 && text.length > 10) {
    return { 
      isClean: false, 
      reason: "Слишком много заглавных букв" 
    };
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { 
        isClean: false, 
        reason: "Контент содержит запрещенные слова или ссылки" 
      };
    }
  }

  // Check for excessive repetition
  const words = normalized.split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > 10 && uniqueWords.size < words.length * 0.3) {
    return { 
      isClean: false, 
      reason: "Обнаружено слишком много повторяющихся слов" 
    };
  }

  return { isClean: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { content, type } = await req.json();

    // Check user's role - pro users bypass moderation
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const highestRole = userRoles?.[0]?.role;
    
    // Pro and above bypass moderation
    if (highestRole && ['pro', 'editor', 'moderator', 'admin'].includes(highestRole)) {
      return new Response(JSON.stringify({ approved: true, bypass: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Moderate content
    const result = moderateContent(content);

    if (!result.isClean) {
      console.log(`Content moderation failed for user ${user.id}: ${result.reason}`);
    }

    return new Response(
      JSON.stringify({ 
        approved: result.isClean, 
        reason: result.reason 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Moderation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});