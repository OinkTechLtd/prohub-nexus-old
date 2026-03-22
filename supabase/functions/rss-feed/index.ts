import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch latest topics with user profiles and category info
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select(`
        id,
        title,
        content,
        created_at,
        updated_at,
        views,
        profiles!topics_user_id_fkey (username),
        categories!topics_category_id_fkey (name, slug)
      `)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (topicsError) {
      console.error('Error fetching topics:', topicsError);
    }

    // Fetch latest resources
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select(`
        id,
        title,
        description,
        created_at,
        updated_at,
        resource_type,
        downloads,
        rating,
        profiles!resources_user_id_fkey (username)
      `)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (resourcesError) {
      console.error('Error fetching resources:', resourcesError);
    }

    // Fetch latest videos
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        description,
        created_at,
        updated_at,
        views,
        likes,
        profiles!videos_user_id_fkey (username)
      `)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (videosError) {
      console.error('Error fetching videos:', videosError);
    }

    // Get base URL from request
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Combine all content items with type
    const allItems = [
      ...(topics || []).map(item => ({ ...item, type: 'topic' as const })),
      ...(resources || []).map(item => ({ ...item, type: 'resource' as const })),
      ...(videos || []).map(item => ({ ...item, type: 'video' as const })),
    ];

    // Sort by created_at descending and limit to 50 most recent
    allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const recentItems = allItems.slice(0, 50);

    // Generate RSS items
    const rssItems = recentItems.map(item => {
      const pubDate = new Date(item.created_at).toUTCString();
      const profiles = item.profiles as any;
      const username = (Array.isArray(profiles) ? profiles[0]?.username : profiles?.username) || 'Аноним';
      
      let itemUrl = '';
      let title = '';
      let description = '';
      let category = '';

      if (item.type === 'topic') {
        const categories = (item as any).categories as any;
        const categoryName = (Array.isArray(categories) ? categories[0]?.name : categories?.name) || 'Общее';
        
        itemUrl = `${baseUrl}/topic/${item.id}`;
        title = (item as any).title;
        description = ((item as any).content || '')
          .replace(/<[^>]*>/g, '')
          .substring(0, 200) + '...';
        category = `Тема - ${categoryName}`;
      } else if (item.type === 'resource') {
        const resource = item as any;
        itemUrl = `${baseUrl}/resources`;
        title = resource.title;
        description = (resource.description || '')
          .replace(/<[^>]*>/g, '')
          .substring(0, 200) + '...';
        category = `Ресурс - ${resource.resource_type}`;
      } else if (item.type === 'video') {
        const video = item as any;
        itemUrl = `${baseUrl}/video/${item.id}`;
        title = video.title;
        description = (video.description || 'Видео')
          .replace(/<[^>]*>/g, '')
          .substring(0, 200) + '...';
        category = 'Видео';
      }

      return `
    <item>
      <title><![CDATA[${title}]]></title>
      <link>${itemUrl}</link>
      <guid isPermaLink="true">${itemUrl}</guid>
      <description><![CDATA[${description}]]></description>
      <category><![CDATA[${category}]]></category>
      <author><![CDATA[${username}]]></author>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    }).join('');

    const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ProHub - Форум разработчиков</title>
    <link>${baseUrl}</link>
    <description>Сообщество разработчиков и профессионалов - последние темы, ресурсы и видео</description>
    <language>ru</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`;

    return new Response(rssFeed, {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
