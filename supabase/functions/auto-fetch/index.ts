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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const results: any[] = [];

    // 1. Process feed_sources that are due
    const { data: feeds } = await supabase
      .from('feed_sources')
      .select('*')
      .eq('is_active', true);

    for (const feed of (feeds || [])) {
      const lastFetched = feed.last_fetched_at ? new Date(feed.last_fetched_at) : new Date(0);
      const minutesSince = (now.getTime() - lastFetched.getTime()) / 60000;
      if (minutesSince < feed.fetch_interval_minutes) continue;

      try {
        if (feed.type === 'rss') {
          const articles = await fetchRSS(feed.url);
          let inserted = 0;
          for (const article of articles.slice(0, 20)) {
            const { data: existing } = await supabase
              .from('fetched_articles')
              .select('id')
              .eq('source_id', feed.id)
              .eq('original_url', article.link)
              .maybeSingle();
            if (existing) continue;

            const { error } = await supabase.from('fetched_articles').insert({
              source_id: feed.id,
              title: article.title || 'Untitled',
              content: article.content || '',
              excerpt: article.excerpt || '',
              featured_image: article.image || '',
              original_url: article.link || '',
              status: 'fetched',
            });
            if (!error) {
              inserted++;
              // Auto-publish as post
              await autoPublishPost(supabase, {
                title: article.title || 'Untitled',
                content: article.content || '',
                excerpt: article.excerpt || '',
                featured_image: article.image || '',
                category_id: feed.category_id || null,
              });
            }
          }
          results.push({ feed: feed.name, type: 'rss', inserted });
        } else {
          // scrape type
          const scraped = await scrapeUrl(feed.url);
          if (scraped) {
            const { data: existing } = await supabase
              .from('fetched_articles')
              .select('id')
              .eq('source_id', feed.id)
              .eq('original_url', feed.url)
              .maybeSingle();
            if (!existing) {
              await supabase.from('fetched_articles').insert({
                source_id: feed.id,
                title: scraped.title,
                content: scraped.content,
                excerpt: scraped.excerpt,
                featured_image: scraped.image,
                original_url: feed.url,
                status: 'fetched',
              });
              // Auto-publish as post
              await autoPublishPost(supabase, {
                title: scraped.title,
                content: scraped.content,
                excerpt: scraped.excerpt,
                featured_image: scraped.image,
                category_id: feed.category_id || null,
              });
            }
            results.push({ feed: feed.name, type: 'scrape', inserted: existing ? 0 : 1 });
          }
        }
        // Update last_fetched_at
        await supabase.from('feed_sources').update({ last_fetched_at: now.toISOString() }).eq('id', feed.id);
      } catch (e) {
        results.push({ feed: feed.name, error: (e as Error).message });
      }
    }

    // 2. Process archive_schedules that are due
    const { data: schedules } = await supabase
      .from('archive_schedules')
      .select('*')
      .eq('is_active', true);

    for (const sched of (schedules || [])) {
      const lastRun = sched.last_run_at ? new Date(sched.last_run_at) : new Date(0);
      const hoursSince = (now.getTime() - lastRun.getTime()) / 3600000;
      if (hoursSince < sched.interval_hours) continue;

      try {
        const scraped = await scrapeUrl(sched.url);
        if (scraped) {
          const { data: existing } = await supabase
            .from('archived_contents')
            .select('id')
            .eq('source_url', sched.url)
            .eq('title', scraped.title)
            .maybeSingle();
          if (!existing) {
            await supabase.from('archived_contents').insert({
              source_url: sched.url,
              title: scraped.title,
              content: scraped.content,
              excerpt: scraped.excerpt,
              featured_image: scraped.image,
              images: JSON.stringify(scraped.images),
              tags: scraped.tags,
              category: sched.category || null,
              source_name: new URL(sched.url).hostname,
              schedule_id: sched.id,
              status: 'fetched',
            });
          }
          results.push({ schedule: sched.name, inserted: existing ? 0 : 1 });
        }
        await supabase.from('archive_schedules').update({
          last_run_at: now.toISOString(),
          next_run_at: new Date(now.getTime() + sched.interval_hours * 3600000).toISOString(),
        }).eq('id', sched.id);
      } catch (e) {
        results.push({ schedule: sched.name, error: (e as Error).message });
      }
    }

    console.log('Auto-fetch completed:', JSON.stringify(results));
    return new Response(
      JSON.stringify({ success: true, timestamp: now.toISOString(), results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Auto-fetch error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchRSS(url: string) {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'GalachipaBlog/1.0', Accept: 'application/rss+xml, application/xml, text/xml' },
  });
  if (!resp.ok) return [];
  const xml = await resp.text();

  const items: { title: string; link: string; content: string; excerpt: string; image: string }[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const block = match[1];
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || '';
    const link = block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() || '';
    const desc = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim() || '';
    const contentEncoded = block.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i)?.[1]?.trim() || '';
    const image = block.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1]
      || block.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1]
      || block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
      || '';

    const content = (contentEncoded || desc).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 10000);
    const excerpt = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);

    items.push({ title, link, content, excerpt, image });
  }
  return items;
}

async function scrapeUrl(url: string) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html',
    },
    redirect: 'follow',
  });
  if (!resp.ok) return null;
  const html = await resp.text();
  if (html.length < 100) return null;

  const title = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
    || 'Untitled';

  const excerpt = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '';
  const image = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '';

  // Extract main content
  let rawContent = '';
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) rawContent = articleMatch[1];
  if (!rawContent || rawContent.length < 200) {
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch && mainMatch[1].length > rawContent.length) rawContent = mainMatch[1];
  }
  if (!rawContent || rawContent.length < 200) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) rawContent = bodyMatch[1];
  }

  const content = rawContent
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20000);

  // Extract images
  const images: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(rawContent || html)) !== null && images.length < 50) {
    const src = imgMatch[1];
    if (!src.startsWith('data:') && src.startsWith('http')) images.push(src);
  }

  // Tags
  const tags: string[] = [];
  const kwMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
  if (kwMatch) kwMatch[1].split(',').map(t => t.trim()).filter(Boolean).forEach(t => tags.push(t));

  return { title, content, excerpt, image, images, tags };
}
