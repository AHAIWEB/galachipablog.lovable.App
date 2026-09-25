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

    // Require either a valid CRON_SECRET header (for scheduled invocations) or an admin JWT
    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('Authorization');
    let authorized = false;

    if (cronSecret && providedSecret && providedSecret === cronSecret) {
      authorized = true;
    } else if (authHeader?.startsWith('Bearer ')) {
      const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace('Bearer ', '');
      const { data: claims } = await authClient.auth.getClaims(token);
      if (claims?.claims?.sub) {
        const { data: role } = await authClient.from('user_roles').select('role').eq('user_id', claims.claims.sub).eq('role', 'admin').maybeSingle();
        if (role) authorized = true;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, serviceKey);


    const now = new Date();
    const results: any[] = [];
    let onlySourceId: string | null = null;
    try { const b = await req.clone().json(); if (typeof b?.source_id === 'string') onlySourceId = b.source_id; } catch { /* no body */ }

    // 1. Process feed_sources that are due
    let feedQuery = supabase.from('feed_sources').select('*').eq('is_active', true);
    if (onlySourceId) feedQuery = feedQuery.eq('id', onlySourceId);
    const { data: feeds } = await feedQuery;

    for (const feed of (feeds || [])) {
      // Normalize URL
      let feedUrl = (feed.url || '').trim();
      if (!feedUrl || feedUrl.length < 4) {
        results.push({ feed: feed.name, error: 'Empty or invalid URL' });
        continue;
      }
      if (!/^https?:\/\//i.test(feedUrl)) {
        feedUrl = 'https://' + feedUrl;
      }
      try { new URL(feedUrl); } catch {
        results.push({ feed: feed.name, error: `Invalid URL: '${feed.url}'` });
        continue;
      }
      const lastFetched = feed.last_fetched_at ? new Date(feed.last_fetched_at) : new Date(0);
      const minutesSince = (now.getTime() - lastFetched.getTime()) / 60000;
      if (!onlySourceId && minutesSince < feed.fetch_interval_minutes) continue;

      try {
        if (feed.type === 'rss') {
          const articles = await fetchRSS(feedUrl);
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
                source_url: article.link || '',
              });
            }
          }
          results.push({ feed: feed.name, type: 'rss', inserted });
        } else {
          // scrape type - extract multiple article links from listing page
          const articles = await scrapeListingPage(feedUrl);
          let inserted = 0;
          for (const article of articles.slice(0, 15)) {
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
              original_url: article.link || feedUrl,
              status: 'fetched',
            });
            if (!error) {
              inserted++;
              await autoPublishPost(supabase, {
                title: article.title || 'Untitled',
                content: article.content || '',
                excerpt: article.excerpt || '',
                featured_image: article.image || '',
                category_id: feed.category_id || null,
                source_url: article.link || feedUrl,
              });
            }
          }
          results.push({ feed: feed.name, type: 'scrape', inserted });
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

async function autoPublishPost(supabase: any, article: { title: string; content: string; excerpt: string; featured_image: string; category_id: string | null; source_url?: string }) {
  try {
    const title = (article.title || '').trim();
    const junkPatterns = /^(privacy\s*policy|terms|about\s*us|contact|home|know\s*more|যোগাযোগ|শর্তাবলী|untitled)$/i;
    if (title.length < 10 || junkPatterns.test(title)) {
      console.log(`Skipping junk title: "${title}"`);
      return;
    }
    const wordCount = title.split(/\s+/).length;
    if (wordCount < 2) {
      console.log(`Skipping single-word title: "${title}"`);
      return;
    }

    // Strip editor / site-chrome noise from content
    let content = article.content || '';
    if (content) {
      const noisePatterns = [
        // Site chrome / meta
        /সম্পাদক\s*[:：][^\n।]{0,200}/gi,
        /প্রকাশিত\s*[:：][^\n।]{0,200}/gi,
        /আপডেট\s*[:：][^\n।]{0,200}/gi,
        /প্রকাশক\s*[:：][^\n।]{0,200}/gi,
        /সর্বস্বত্ব\s*সংরক্ষিত[^\n।]{0,200}/gi,
        /কপিরাইট\s*©[^\n।]{0,200}/gi,
        /Copyright\s*©[^\n।]{0,200}/gi,
        /All\s+rights?\s+reserved[^\n।]{0,200}/gi,
        /(?:Published|Updated|Editor)\s*[:：][^\n।]{0,200}/gi,
        // Menu / navigation words (Bengali common site nav)
        /(?:হোম|প্রচ্ছদ|প্রথম\s*পাতা|জাতীয়|আন্তর্জাতিক|খেলা|বিনোদন|অর্থনীতি|শিক্ষা|স্বাস্থ্য|প্রযুক্তি|লাইফস্টাইল|মতামত|ধর্ম|রাজনীতি|সারাদেশ|যোগাযোগ|আমাদের\s*সম্পর্কে|আর্কাইভ|সাইটম্যাপ|লগইন|নিবন্ধন)(?:\s*[\|·»›→\-])/gi,
        /(?:Home|About|Contact|Login|Register|Sign\s*in|Sign\s*up|Menu|Search)(?:\s*[\|·»›→\-])/gi,
        // Related posts / tags
        /(?:সম্পর্কিত\s*(?:খবর|পোস্ট|সংবাদ|নিবন্ধ)|আরও\s*পড়ুন|আরো\s*পড়ুন|আরও\s*দেখুন|আরো\s*খবর|এই\s*বিভাগের\s*আরও)[^।]{0,500}/gi,
        /(?:Related\s*(?:Posts|Articles|News|Stories)|You\s*(?:may|might)\s*(?:also\s*)?like|Read\s*(?:more|also|next))[^.]{0,500}/gi,
        /(?:ট্যাগ|Tags|Tagged|Keywords)\s*[:：][^\n।]{0,300}/gi,
        // Comments / social share
        /(?:মন্তব্য\s*করুন|আপনার\s*মতামত|কমেন্ট|Comments?|Leave\s+a\s+(?:Reply|Comment)|Post\s+Comment)[^।]{0,500}/gi,
        /(?:শেয়ার|Share)\s*(?:করুন|this|on)?\s*[:：]?\s*(?:Facebook|Twitter|WhatsApp|Telegram|LinkedIn|ফেসবুক|টুইটার|হোয়াটসঅ্যাপ|টেলিগ্রাম)?[^।]{0,200}/gi,
        /(?:Like|Tweet|Pin\s*it|Share\s*to)[^।]{0,80}/gi,
        // Subscribe / newsletter
        /(?:সাবস্ক্রাইব|নিউজলেটার|Subscribe|Newsletter|Sign\s*up\s*for)[^।]{0,300}/gi,
        // Ads
        /(?:বিজ্ঞাপন|Advertisement|Sponsored|ADVERTISEMENT|Ad\s*Block)[^।]{0,200}/gi,
        // Footer boilerplate
        /(?:গোপনীয়তা\s*নীতি|শর্তাবলী|Privacy\s*Policy|Terms\s*(?:of|&)\s*(?:Use|Service|Conditions))[^।]{0,200}/gi,
        /(?:Read more|আরো পড়ুন|আরও পড়ুন)\s*[:：>→]*[^\n।]{0,100}/gi,
      ];
      for (const re of noisePatterns) content = content.replace(re, ' ');
      // Collapse repeated pipes/bullets/whitespace
      content = content.replace(/[\|·»›→]{2,}/g, ' ').replace(/\s+/g, ' ').trim();
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, '-').replace(/^-|-$/g, '').slice(0, 200) + '-' + Date.now();
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('title', title)
      .maybeSingle();
    if (existing) return;
    await supabase.from('posts').insert({
      title,
      slug,
      content: content || null,
      excerpt: (article.excerpt || '').slice(0, 500) || null,
      featured_image: article.featured_image || null,
      category_id: article.category_id,
      status: 'published',
      is_featured: !!article.featured_image,
      source_url: article.source_url || null,
    });
  } catch (e) {
    console.error('Auto-publish error:', (e as Error).message);
  }
}

async function fetchRSS(url: string) {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36', Accept: 'application/rss+xml, application/xml, text/xml, */*' },
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

async function scrapeListingPage(url: string): Promise<{ title: string; link: string; content: string; excerpt: string; image: string }[]> {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html',
    },
    redirect: 'follow',
  });
  if (!resp.ok) return [];
  const html = await resp.text();
  if (html.length < 200) return [];

  const baseUrl = new URL(url);
  const articles: { title: string; link: string; content: string; excerpt: string; image: string }[] = [];

  // Extract article links with titles from common patterns
  // Pattern 1: <a> tags with href containing article paths + heading inside
  const linkRegex = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const seenLinks = new Set<string>();
  let match;

  while ((match = linkRegex.exec(html)) !== null && articles.length < 20) {
    let href = match[1].trim();
    const inner = match[2];

    // Skip non-article links
    if (!href || href === '/' || href === '#' || href.includes('javascript:')) continue;
    if (/\.(css|js|png|jpg|gif|svg|ico)(\?|$)/i.test(href)) continue;
    if (/(login|signup|register|search|tag|category|page\/\d|#)/i.test(href)) continue;

    // Must look like an article URL (has path segments)
    const pathParts = href.replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean);
    if (pathParts.length < 2) continue;

    // Extract title from heading tags inside the link
    const headingMatch = inner.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
    let title = '';
    if (headingMatch) {
      title = headingMatch[1].replace(/<[^>]+>/g, '').trim();
    } else {
      // Use link text if it's meaningful
      title = inner.replace(/<[^>]+>/g, '').trim();
    }

    if (!title || title.length < 10) continue;
    const wordCount = title.split(/\s+/).length;
    if (wordCount < 2) continue;

    // Resolve relative URLs
    if (href.startsWith('/')) {
      href = baseUrl.origin + href;
    } else if (!href.startsWith('http')) {
      href = baseUrl.origin + '/' + href;
    }

    if (seenLinks.has(href)) continue;
    seenLinks.add(href);

    // Extract image near the link
    const imgMatch = inner.match(/<img[^>]+src=["']([^"']+)["']/i);
    let image = imgMatch?.[1] || '';
    if (image && !image.startsWith('http')) {
      image = image.startsWith('/') ? baseUrl.origin + image : baseUrl.origin + '/' + image;
    }

    articles.push({
      title,
      link: href,
      content: '',
      excerpt: title,
      image,
    });
  }

  // For each article, try to fetch individual page for better content/image
  for (const article of articles.slice(0, 10)) {
    try {
      const detail = await scrapeUrl(article.link);
      if (detail) {
        if (detail.title && detail.title !== 'Untitled' && detail.title.length > article.title.length) {
          article.title = detail.title;
        }
        if (detail.content) article.content = detail.content;
        if (detail.excerpt) article.excerpt = detail.excerpt;
        if (detail.image && !article.image) article.image = detail.image;
        if (detail.image) article.image = detail.image; // og:image is usually better
      }
    } catch {
      // skip individual fetch errors
    }
  }

  return articles;
}
