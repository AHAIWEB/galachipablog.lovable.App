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
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: corsHeaders });
    }

    const { urls, category, source_name, schedule_id, discover_links, max_pages } = await req.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: 'URLs array is required' }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const maxLimit = Math.min(max_pages || 500, 500);

    // Run scraping in background to avoid CPU/wall-time limits on the request
    const backgroundJob = (async () => {
      try {
        let allUrls = [...urls];
        if (discover_links) {
          const discovered = new Set<string>(urls);
          for (const seedUrl of urls.slice(0, 10)) {
            try {
              const resp = await fetchWithRetry(seedUrl);
              if (!resp) continue;
              const html = await resp.text();
              const baseUrl = new URL(seedUrl);
              const linkRegex = /<a[^>]+href=["']([^"'#?]*(?:\?[^"'#]*)?)['"]/gi;
              let m;
              while ((m = linkRegex.exec(html)) !== null && discovered.size < maxLimit) {
                try {
                  const href = m[1].trim();
                  if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
                  const absUrl = new URL(href, seedUrl).href.split('#')[0];
                  if (absUrl.startsWith(baseUrl.origin) && !discovered.has(absUrl) && isContentUrl(absUrl)) {
                    discovered.add(absUrl);
                  }
                } catch { /* skip */ }
              }
            } catch { /* skip */ }
          }
          allUrls = Array.from(discovered);
        }

        const toProcess = allUrls.slice(0, maxLimit);
        const batchSize = 4;
        let successCount = 0;
        for (let i = 0; i < toProcess.length; i += batchSize) {
          const batch = toProcess.slice(i, i + batchSize);
          const batchResults = await Promise.allSettled(
            batch.map(url => scrapeAndSave(url, category, source_name, schedule_id, serviceClient))
          );
          for (const r of batchResults) {
            if (r.status === 'fulfilled' && r.value?.success) successCount++;
          }
          // Yield between batches
          await new Promise(r => setTimeout(r, 50));
        }
        console.log(`Archive scraper finished: ${successCount}/${toProcess.length} succeeded`);
      } catch (e) {
        console.error('Background scrape error:', e);
      }
    })();

    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundJob);
    }

    return new Response(
      JSON.stringify({ success: true, started: true, message: 'Scraping started in background. Check archived_contents table for results.', maxPages: maxLimit }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scraper error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Filter out non-content URLs (images, scripts, stylesheets, etc.)
function isContentUrl(url: string): boolean {
  const skip = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.css', '.js', '.pdf', '.zip', '.mp3', '.mp4', '.ico', '.woff', '.woff2', '.ttf', '/wp-json/', '/feed/', '/rss/', '/xmlrpc', '/wp-login', '/wp-admin', '/cart', '/checkout', '/my-account', '#'];
  const lower = url.toLowerCase();
  return !skip.some(ext => lower.includes(ext));
}

// Per-host throttle: minimum gap between outbound requests to same hostname
const HOST_MIN_GAP_MS = 800;
const lastHostHit = new Map<string, number>();

async function throttleHost(url: string) {
  let host = '';
  try { host = new URL(url).hostname; } catch { return; }
  const now = Date.now();
  const last = lastHostHit.get(host) || 0;
  const wait = last + HOST_MIN_GAP_MS - now;
  if (wait > 0) {
    await new Promise(r => setTimeout(r, wait + Math.floor(Math.random() * 200)));
  }
  lastHostHit.set(host, Date.now());
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
    await throttleHost(url);
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
        },
        redirect: 'follow',
      });
      if (resp.ok) return resp;

      // Honor Retry-After and exponential backoff for 429/5xx
      if ((resp.status === 429 || resp.status >= 500) && i < retries) {
        const retryAfter = parseInt(resp.headers.get('retry-after') || '0', 10);
        const base = retryAfter > 0 ? retryAfter * 1000 : Math.min(30000, 1000 * Math.pow(2, i));
        const jitter = Math.floor(Math.random() * 500);
        try { await resp.body?.cancel(); } catch { /* noop */ }
        await new Promise(r => setTimeout(r, base + jitter));
        continue;
      }
      return null;
    } catch {
      if (i < retries) {
        const backoff = Math.min(30000, 1000 * Math.pow(2, i)) + Math.floor(Math.random() * 500);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }
  return null;
}

function extractContent(html: string, url: string): {
  title: string; content: string; excerpt: string; featured_image: string;
  images: string[]; tags: string[]; source_url: string;
} {
  // Title: og:title > twitter:title > <title>
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)?.[1];
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim();
  const title = (ogTitle || h1Match || titleTag || 'Untitled').trim();

  // Description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)?.[1]
    || html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const excerpt = descMatch?.trim() || '';

  // Featured image
  const ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1];
  const featured_image = ogImg?.trim() || '';

  // Extract main content - try multiple strategies
  let rawContent = '';

  // Strategy 1: article tag
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) rawContent = articleMatch[1];

  // Strategy 2: common content containers
  if (!rawContent || rawContent.length < 200) {
    const contentSelectors = [
      /<div[^>]*class=["'][^"']*(?:entry-content|post-content|article-content|single-content|content-area|post-body|article-body|blog-content|main-content|page-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<\/|$)/i,
      /<div[^>]*id=["'](?:content|main-content|post-content|article-content)['"'][^>]*>([\s\S]*?)<\/div>\s*(?:<\/|$)/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<section[^>]*class=["'][^"']*(?:content|article|post|entry)[^"']*["'][^>]*>([\s\S]*?)<\/section>/i,
    ];
    for (const regex of contentSelectors) {
      const match = html.match(regex);
      if (match && match[1].length > (rawContent?.length || 0)) {
        rawContent = match[1];
      }
    }
  }

  // Strategy 3: largest text block from body
  if (!rawContent || rawContent.length < 200) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      rawContent = bodyMatch[1];
    }
  }

  // Clean content - aggressive removal of non-article noise
  let content = rawContent
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<button[\s\S]*?<\/button>/gi, '')
    .replace(/<select[\s\S]*?<\/select>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove navigation/menu/category/widget/sidebar/share/related/breadcrumb/comment containers
    .replace(/<(?:div|section|ul|ol)[^>]*(?:class|id)=["'][^"']*(?:menu|navbar|nav-|navigation|breadcrumb|sidebar|widget|comment|share|social|related|recommend|popular|trending|advertisement|ad-|adsbygoogle|popup|modal|cookie|newsletter|subscribe|tags?-list|cat(?:egory)?-list|categories|tags-cloud|footer|header|toolbar|toc|table-of-contents|author-bio|meta-info|post-meta|post-nav|pagination|prev-next|reaction|rating|email-form|signup|login|search-form|skip-link|screen-reader)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|section|ul|ol)>/gi, '')
    // Remove menu/list items with class "menu-item"
    .replace(/<li[^>]*class=["'][^"']*menu-item[^"']*["'][^>]*>[\s\S]*?<\/li>/gi, '')
    .trim();

  content = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  // Remove repeated short navigation lines (likely menu items leaking through)
  const lines = content.split('\n');
  const cleanedLines: string[] = [];
  const seenShort = new Set<string>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { cleanedLines.push(''); continue; }
    // Drop very short lines that look like menu items (single-word or category-only)
    if (trimmed.length < 25 && /^[\u0980-\u09FF\w\s|»>·-]+$/.test(trimmed)) {
      if (seenShort.has(trimmed)) continue;
      seenShort.add(trimmed);
      // Skip if it appears more than 3 times in original
      const count = (content.match(new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (count >= 2) continue;
    }
    cleanedLines.push(line);
  }
  content = cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 30000);


  // Extract all images from content area
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*/gi;
  const images: string[] = [];
  let imgMatch;
  const sourceHtml = rawContent || html;
  while ((imgMatch = imgRegex.exec(sourceHtml)) !== null && images.length < 100) {
    let src = imgMatch[1];
    if (src.startsWith('data:')) continue;
    if (src.startsWith('//')) src = 'https:' + src;
    else if (src.startsWith('/')) {
      try { src = new URL(src, url).href; } catch { continue; }
    }
    if (src.startsWith('http') && !images.includes(src)) images.push(src);
  }

  // Extract tags
  const tags: string[] = [];
  const kwMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
  if (kwMatch) {
    kwMatch[1].split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
      if (!tags.includes(t)) tags.push(t);
    });
  }
  const tagRegex = /<a[^>]*rel=["']tag["'][^>]*>([^<]+)<\/a>/gi;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(html)) !== null && tags.length < 30) {
    const tag = tagMatch[1].trim();
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  // Also try category links
  const catLinkRegex = /<a[^>]*class=["'][^"']*(?:category|cat-links|tag-link)[^"']*["'][^>]*>([^<]+)<\/a>/gi;
  let catMatch;
  while ((catMatch = catLinkRegex.exec(html)) !== null && tags.length < 30) {
    const tag = catMatch[1].trim();
    if (tag && !tags.includes(tag)) tags.push(tag);
  }

  return { title, content, excerpt, featured_image, images, tags, source_url: url };
}

async function aiPolishContent(title: string, content: string): Promise<string | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return null;
  // Skip if too short
  if (content.length < 200) return null;
  try {
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'তুমি একটি কন্টেন্ট ক্লিনার। ইনপুট থেকে শুধুমাত্র মূল আর্টিকেল/পোস্টের লেখা রিটার্ন করবে। মেনু/নেভিগেশন/ক্যাটাগরি লিস্ট/সাইডবার/ফুটার/বিজ্ঞাপন/সম্পর্কিত পোস্ট/শেয়ার বাটন/কমেন্ট/সাবস্ক্রাইব ইত্যাদি বাদ দিবে। প্যারাগ্রাফ ফরম্যাটিং রাখবে। কোন ব্যাখ্যা বা মন্তব্য করবে না, শুধু পরিষ্কার করা মূল লেখা রিটার্ন করবে।',
          },
          {
            role: 'user',
            content: `শিরোনাম: ${title}\n\nকন্টেন্ট:\n${content.slice(0, 8000)}`,
          },
        ],
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const cleaned = (data.choices?.[0]?.message?.content || '').trim();
    if (cleaned.length < 50) return null;
    return cleaned;
  } catch {
    return null;
  }
}

async function scrapeAndSave(
  url: string, category: string | undefined, source_name: string | undefined,
  schedule_id: string | undefined, serviceClient: any
) {
  const response = await fetchWithRetry(url);
  if (!response) {
    return { url, success: false, error: 'Failed to fetch (after retries)' };
  }

  const html = await response.text();
  if (html.length < 100) {
    return { url, success: false, error: 'Empty or too short response' };
  }

  const extracted = extractContent(html, url);

  // Skip if no meaningful content
  if (extracted.content.length < 50 && !extracted.excerpt) {
    return { url, success: false, error: 'No meaningful content found' };
  }

  // AI polish (combine DOM cleaning + AI extraction of main content only)
  const polished = await aiPolishContent(extracted.title, extracted.content);
  const finalContent = polished || extracted.content;

  const { error: insertError } = await serviceClient.from('archived_contents').insert({
    source_url: url,
    title: extracted.title,
    content: finalContent,
    excerpt: extracted.excerpt,
    featured_image: extracted.featured_image,
    images: JSON.stringify(extracted.images),
    tags: extracted.tags,
    category: category || null,
    source_name: source_name || (() => { try { return new URL(url).hostname; } catch { return 'unknown'; } })(),
    schedule_id: schedule_id || null,
    status: 'fetched',
  });

  if (insertError) {
    return { url, success: false, error: insertError.message };
  }

  return {
    url, success: true, title: extracted.title,
    contentLength: finalContent.length,
    imagesCount: extracted.images.length,
    tagsCount: extracted.tags.length,
    hasExcerpt: !!extracted.excerpt,
    hasFeaturedImage: !!extracted.featured_image,
    aiPolished: !!polished,
  };
}
