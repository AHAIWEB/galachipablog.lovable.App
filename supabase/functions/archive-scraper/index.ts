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

    const { urls, category, source_name, schedule_id, discover_links, max_pages } = await req.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: 'URLs array is required' }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const maxLimit = max_pages || 500;
    const results: any[] = [];

    // If discover_links is true, first crawl the seed URLs for internal links
    let allUrls = [...urls];
    if (discover_links) {
      const discovered = new Set<string>(urls);
      for (const seedUrl of urls.slice(0, 5)) {
        try {
          const resp = await fetch(seedUrl, {
            headers: { 'User-Agent': 'GalachipaBlog/1.0 ArchiveBot' },
          });
          if (!resp.ok) continue;
          const html = await resp.text();
          const baseUrl = new URL(seedUrl);
          const linkRegex = /<a[^>]+href=["']([^"'#]+)["'][^>]*/gi;
          let m;
          while ((m = linkRegex.exec(html)) !== null && discovered.size < maxLimit) {
            try {
              const absUrl = new URL(m[1], seedUrl).href;
              if (absUrl.startsWith(baseUrl.origin) && !discovered.has(absUrl)) {
                discovered.add(absUrl);
              }
            } catch { /* skip */ }
          }
        } catch { /* skip */ }
      }
      allUrls = Array.from(discovered);
    }

    // Process up to maxLimit URLs in batches of 10 concurrently
    const toProcess = allUrls.slice(0, maxLimit);
    const batchSize = 10;

    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batch = toProcess.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(url => scrapeAndSave(url, category, source_name, schedule_id, serviceClient))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const r = batchResults[j];
        if (r.status === 'fulfilled') {
          results.push(r.value);
        } else {
          results.push({ url: batch[j], success: false, error: r.reason?.message || 'Unknown' });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, total: results.length, successCount: results.filter(r => r.success).length, results: results.slice(0, 50) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function scrapeAndSave(
  url: string,
  category: string | undefined,
  source_name: string | undefined,
  schedule_id: string | undefined,
  serviceClient: any
) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'GalachipaBlog/1.0 ArchiveBot' },
  });

  if (!response.ok) {
    return { url, success: false, error: `HTTP ${response.status}` };
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

  // Save to DB
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
    return { url, success: false, error: insertError.message };
  }

  return { url, success: true, title, imagesCount: images.length, tagsCount: tags.length };
}
