import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: corsHeaders });
    }

    const { urls, category, source_name, schedule_id } = await req.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: 'URLs array is required' }), { status: 400, headers: corsHeaders });
    }

    const results = [];

    for (const url of urls.slice(0, 20)) {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'GalachipaBlog/1.0 ArchiveBot' },
        });

        if (!response.ok) {
          results.push({ url, success: false, error: `HTTP ${response.status}` });
          continue;
        }

        const html = await response.text();

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch?.[1]?.trim() || 'Untitled';

        // Extract meta description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        const excerpt = descMatch?.[1]?.trim() || '';

        // Extract og:image
        const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
        const featured_image = ogImgMatch?.[1]?.trim() || '';

        // Extract all images
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*/gi;
        const images: string[] = [];
        let imgMatch;
        while ((imgMatch = imgRegex.exec(html)) !== null && images.length < 50) {
          let src = imgMatch[1];
          if (src.startsWith('//')) src = 'https:' + src;
          else if (src.startsWith('/')) {
            try { src = new URL(src, url).href; } catch { continue; }
          }
          if (src.startsWith('http') && !src.includes('data:')) images.push(src);
        }

        // Extract tags/keywords
        const kwMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
        const tags = kwMatch?.[1]?.split(',').map(t => t.trim()).filter(Boolean) || [];

        // Extract article tags
        const tagRegex = /<a[^>]*rel=["']tag["'][^>]*>([^<]+)<\/a>/gi;
        let tagMatch;
        while ((tagMatch = tagRegex.exec(html)) !== null && tags.length < 20) {
          const tag = tagMatch[1].trim();
          if (tag && !tags.includes(tag)) tags.push(tag);
        }

        // Extract body content
        const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
          || html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
          || html.match(/<div[^>]*class=["'][^"']*(?:content|entry|post|article)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

        let content = '';
        const rawContent = articleMatch?.[1] || '';
        if (rawContent) {
          content = rawContent
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<nav[\s\S]*?<\/nav>/gi, '')
            .replace(/<footer[\s\S]*?<\/footer>/gi, '')
            .replace(/<header[\s\S]*?<\/header>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 15000);
        } else {
          const bodyMatch2 = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch2) {
            content = bodyMatch2[1]
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<nav[\s\S]*?<\/nav>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 10000);
          }
        }

        // Extract internal links for bulk/sitemap mode
        const linkRegex = /<a[^>]+href=["']([^"'#]+)["'][^>]*/gi;
        const links: string[] = [];
        let linkMatch;
        const baseUrl = new URL(url);
        while ((linkMatch = linkRegex.exec(html)) !== null && links.length < 100) {
          try {
            const absUrl = new URL(linkMatch[1], url).href;
            if (absUrl.startsWith(baseUrl.origin) && !links.includes(absUrl)) {
              links.push(absUrl);
            }
          } catch { /* skip invalid */ }
        }

        // Save to DB
        const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const { error: insertError } = await serviceClient.from('archived_contents').insert({
          source_url: url,
          title,
          content,
          excerpt,
          featured_image,
          images: JSON.stringify(images),
          tags,
          category: category || null,
          source_name: source_name || new URL(url).hostname,
          schedule_id: schedule_id || null,
          status: 'fetched',
        });

        if (insertError) {
          results.push({ url, success: false, error: insertError.message });
        } else {
          results.push({ url, success: true, title, imagesCount: images.length, tagsCount: tags.length, linksCount: links.length, links: links.slice(0, 20) });
        }
      } catch (e) {
        results.push({ url, success: false, error: e instanceof Error ? e.message : 'Unknown' });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
