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
    const maxLimit = max_pages || 500;
    const results: any[] = [];

    // Discover internal links from seed URLs
    let allUrls = [...urls];
    if (discover_links) {
      const discovered = new Set<string>(urls);
      for (const seedUrl of urls.slice(0, 10)) {
        try {
          const resp = await fetchWithRetry(seedUrl);
          if (!resp) continue;
          const html = await resp.text();
          const baseUrl = new URL(seedUrl);

          // Extract all href links
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

    // Process URLs in concurrent batches
    const toProcess = allUrls.slice(0, maxLimit);
    const batchSize = 8;

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
      JSON.stringify({ success: true, total: results.length, successCount: results.filter(r => r.success).length, results: results.slice(0, 100) }),
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

async function fetchWithRetry(url: string, retries = 2): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
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
      if (resp.status >= 500 && i < retries) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return null;
    } catch {
      if (i < retries) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
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

  // Clean content - preserve structure
  let content = rawContent
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
    .trim();

  // Convert HTML to clean text while preserving paragraphs
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
    .trim()
    .slice(0, 30000);

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

  const { error: insertError } = await serviceClient.from('archived_contents').insert({
    source_url: url,
    title: extracted.title,
    content: extracted.content,
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
    contentLength: extracted.content.length,
    imagesCount: extracted.images.length,
    tagsCount: extracted.tags.length,
    hasExcerpt: !!extracted.excerpt,
    hasFeaturedImage: !!extracted.featured_image,
  };
}
