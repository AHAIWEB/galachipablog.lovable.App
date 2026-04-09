import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Support both authenticated and cron-based calls
    let isAuthorized = false;
    if (authHeader?.startsWith('Bearer ')) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
        isAuthorized = !!roleData;
      }
    }

    // Also allow service role key (for cron jobs)
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (authHeader === `Bearer ${serviceKey}`) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { url, source_id, mode } = body;

    // Mode: "rss" = parse RSS feed, "scrape" = scrape single URL, "auto_fetch" = fetch all active sources
    if (mode === 'auto_fetch') {
      return await handleAutoFetch(supabaseUrl, serviceKey);
    }

    if (mode === 'rss' && url) {
      return await handleRssFetch(url, source_id, supabaseUrl, serviceKey);
    }

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Default: scrape single URL
    const result = await scrapeUrl(url);
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleAutoFetch(supabaseUrl: string, serviceKey: string) {
  const serviceClient = createClient(supabaseUrl, serviceKey);

  // Get all active feed sources
  const { data: sources, error: srcErr } = await serviceClient
    .from('feed_sources')
    .select('*')
    .eq('is_active', true);

  if (srcErr) throw srcErr;
  if (!sources || sources.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: 'No active sources', fetched: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let totalFetched = 0;
  const results: any[] = [];

  for (const source of sources) {
    try {
      // Check if enough time has passed since last fetch
      if (source.last_fetched_at) {
        const lastFetch = new Date(source.last_fetched_at).getTime();
        const intervalMs = (source.fetch_interval_minutes || 5) * 60 * 1000;
        if (Date.now() - lastFetch < intervalMs) {
          results.push({ source: source.name, status: 'skipped', reason: 'interval not reached' });
          continue;
        }
      }

      let count = 0;
      if (source.type === 'rss') {
        count = await fetchRssSource(source, serviceClient);
      } else {
        count = await fetchScrapeSource(source, serviceClient);
      }

      // Update last_fetched_at
      await serviceClient.from('feed_sources').update({ last_fetched_at: new Date().toISOString() }).eq('id', source.id);

      totalFetched += count;
      results.push({ source: source.name, status: 'success', articles: count });
    } catch (e: any) {
      console.error(`Error fetching source ${source.name}:`, e);
      results.push({ source: source.name, status: 'error', error: e.message });
    }
  }

  return new Response(
    JSON.stringify({ success: true, totalFetched, sources: results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleRssFetch(url: string, sourceId: string | undefined, supabaseUrl: string, serviceKey: string) {
  const serviceClient = createClient(supabaseUrl, serviceKey);

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'GalachipaBlog/1.0 RSS Reader' },
    });
    if (!resp.ok) throw new Error(`RSS fetch failed: ${resp.status}`);
    const xml = await resp.text();
    const items = parseRss(xml);

    let inserted = 0;
    for (const item of items.slice(0, 50)) {
      // Check duplicate by original_url
      if (sourceId) {
        const { data: existing } = await serviceClient
          .from('fetched_articles')
          .select('id')
          .eq('source_id', sourceId)
          .eq('original_url', item.link)
          .maybeSingle();
        if (existing) continue;
      }

      const { error } = await serviceClient.from('fetched_articles').insert({
        source_id: sourceId || '00000000-0000-0000-0000-000000000000',
        title: item.title,
        content: item.content,
        excerpt: item.description,
        original_url: item.link,
        featured_image: item.image || null,
        status: 'fetched',
      });
      if (!error) inserted++;
    }

    if (sourceId) {
      await serviceClient.from('feed_sources').update({ last_fetched_at: new Date().toISOString() }).eq('id', sourceId);
    }

    return new Response(
      JSON.stringify({ success: true, total: items.length, inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function parseRss(xml: string): { title: string; link: string; description: string; content: string; image: string; author: string }[] {
  const items: any[] = [];
  // Match <item> or <entry> elements
  const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || '';
    const link = block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1]
      || block.match(/<link[^>]*>([^<]+)<\/link>/i)?.[1]?.trim() || '';
    const description = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim()
      || block.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i)?.[1]?.trim() || '';
    const content = block.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i)?.[1]?.trim()
      || block.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i)?.[1]?.trim() || description;

    // Extract image from content or media tags
    const mediaImg = block.match(/<media:content[^>]*url=["']([^"']+)["']/i)?.[1]
      || block.match(/<enclosure[^>]*url=["']([^"']+)["']/i)?.[1]
      || block.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i)?.[1] || '';
    const contentImg = content.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || '';
    const image = mediaImg || contentImg;

    const author = block.match(/<(?:dc:creator|author)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:dc:creator|author)>/i)?.[1]?.trim() || '';

    if (title) {
      // Clean content: extract only text, images, author — remove all other elements
      const cleanContent = content
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<aside[\s\S]*?<\/aside>/gi, '')
        .replace(/<form[\s\S]*?<\/form>/gi, '')
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
        .trim();

      items.push({ title, link, description: description.replace(/<[^>]+>/g, '').slice(0, 500), content: cleanContent, image, author });
    }
  }
  return items;
}

async function fetchRssSource(source: any, serviceClient: any): Promise<number> {
  const resp = await fetch(source.url, {
    headers: { 'User-Agent': 'GalachipaBlog/1.0 RSS Reader' },
  });
  if (!resp.ok) throw new Error(`RSS fetch failed: ${resp.status}`);
  const xml = await resp.text();
  const items = parseRss(xml);

  let inserted = 0;
  for (const item of items.slice(0, 30)) {
    const { data: existing } = await serviceClient
      .from('fetched_articles')
      .select('id')
      .eq('source_id', source.id)
      .eq('original_url', item.link)
      .maybeSingle();
    if (existing) continue;

    const { error } = await serviceClient.from('fetched_articles').insert({
      source_id: source.id,
      title: item.title,
      content: item.content,
      excerpt: item.description,
      original_url: item.link,
      featured_image: item.image || null,
      status: 'fetched',
    });
    if (!error) inserted++;
  }
  return inserted;
}

async function fetchScrapeSource(source: any, serviceClient: any): Promise<number> {
  const result = await scrapeUrl(source.url);

  const { data: existing } = await serviceClient
    .from('fetched_articles')
    .select('id')
    .eq('source_id', source.id)
    .eq('original_url', source.url)
    .maybeSingle();
  if (existing) return 0;

  const { error } = await serviceClient.from('fetched_articles').insert({
    source_id: source.id,
    title: result.title,
    content: result.content,
    excerpt: result.description,
    original_url: source.url,
    featured_image: result.image || null,
    status: 'fetched',
  });
  return error ? 0 : 1;
}

async function scrapeUrl(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
  const html = await response.text();

  // Title
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  const title = (ogTitle || titleTag || 'Untitled').trim();

  // Description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const description = descMatch?.trim() || '';

  // Image
  const imgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1];
  const image = imgMatch?.trim() || '';

  // Author
  const authorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<a[^>]*class=["'][^"']*author[^"']*["'][^>]*>([^<]+)<\/a>/i)?.[1];
  const author = authorMatch?.trim() || '';

  // Content: extract main article body only
  let rawContent = '';
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) rawContent = articleMatch[1];

  if (!rawContent || rawContent.length < 200) {
    const selectors = [
      /<div[^>]*class=["'][^"']*(?:entry-content|post-content|article-content|single-content|content-area|post-body|article-body|blog-content|main-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<\/|$)/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
    ];
    for (const regex of selectors) {
      const match = html.match(regex);
      if (match && match[1].length > (rawContent?.length || 0)) rawContent = match[1];
    }
  }

  if (!rawContent || rawContent.length < 200) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) rawContent = bodyMatch[1];
  }

  // Clean: keep only text + images, remove everything else
  const content = rawContent
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<div[^>]*class=["'][^"']*(?:sidebar|widget|comment|share|social|related|advertisement|ad-|popup|modal|cookie|newsletter|subscribe)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, 30000);

  // All images
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*/gi;
  const images: string[] = [];
  let im;
  while ((im = imgRegex.exec(rawContent || html)) !== null && images.length < 50) {
    let src = im[1];
    if (src.startsWith('data:')) continue;
    if (src.startsWith('//')) src = 'https:' + src;
    else if (src.startsWith('/')) { try { src = new URL(src, url).href; } catch { continue; } }
    if (src.startsWith('http') && !images.includes(src)) images.push(src);
  }

  return { title, description, image, content, author, images, url };
}
