import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BENGALI_WIKI = 'https://bn.wikipedia.org';

const PEOPLE_CATEGORIES = [
  { name: 'কবি', url: '/wiki/বিষয়শ্রেণী:বাংলা_ভাষার_কবি' },
  { name: 'কবি', url: '/wiki/বিষয়শ্রেণী:বাঙালি_কবি' },
  { name: 'সাহিত্যিক', url: '/wiki/বিষয়শ্রেণী:বাংলা_ভাষার_লেখক' },
  { name: 'সাহিত্যিক', url: '/wiki/বিষয়শ্রেণী:বাঙালি_লেখক' },
  { name: 'রাজনীতিবিদ', url: '/wiki/বিষয়শ্রেণী:বাংলাদেশের_রাজনীতিবিদ' },
  { name: 'রাজনীতিবিদ', url: '/wiki/বিষয়শ্রেণী:ভারতীয়_রাজনীতিবিদ' },
  { name: 'বিজ্ঞানী', url: '/wiki/বিষয়শ্রেণী:বাঙালি_বিজ্ঞানী' },
  { name: 'শিল্পী', url: '/wiki/বিষয়শ্রেণী:বাঙালি_শিল্পী' },
  { name: 'সংগীতশিল্পী', url: '/wiki/বিষয়শ্রেণী:বাঙালি_সঙ্গীতশিল্পী' },
  { name: 'অভিনেতা', url: '/wiki/বিষয়শ্রেণী:বাঙালি_অভিনেতা' },
  { name: 'বিশ্ববরেণ্য', url: '/wiki/বিষয়শ্রেণী:নোবেল_বিজয়ী' },
  { name: 'বিশ্ববরেণ্য', url: '/wiki/বিষয়শ্রেণী:বিশ্বের_ইতিহাসের_ব্যক্তিত্ব' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const isCron = authHeader === `Bearer ${serviceKey}`;

    if (!isCron) {
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }
      const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }
      const { data: roleData } = await supabaseAuth
        .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: corsHeaders });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { urls, list_urls, category_tag, max_people, publish_category_id, auto_sync, mode, background } = body;

    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const limit = max_people || 50;
    const results: any[] = [];

    let personUrls: string[] = [];

    // LIST MODE: discover person links from a Wikipedia list page
    if (Array.isArray(list_urls) && list_urls.length > 0) {
      const discovered = new Set<string>();
      for (const listUrl of list_urls) {
        if (typeof listUrl !== 'string' || !listUrl.startsWith('http')) continue;
        try {
          const resp = await fetchPage(listUrl);
          if (!resp) continue;
          const html = await resp.text();
          // Extract all /wiki/ article links from content (skip namespaces)
          const linkRegex = /<a[^>]+href="\/wiki\/([^":#?]+)"/gi;
          let m;
          while ((m = linkRegex.exec(html)) !== null) {
            const slug = m[1];
            if (slug.includes(':')) continue;
            if (/^(বিষয়শ্রেণী|টেমপ্লেট|উইকিপিডিয়া|বিশেষ|সাহায্য|চিত্র|File|Help|Category|Template|Special|Wikipedia|Portal)/i.test(slug)) continue;
            if (slug.length < 2) continue;
            discovered.add(`${BENGALI_WIKI}/wiki/${slug}`);
            if (discovered.size >= limit) break;
          }
        } catch (e) { console.log('list discover err:', (e as Error).message); }
        if (discovered.size >= limit) break;
      }
      personUrls = Array.from(discovered).slice(0, limit);
      console.log(`Discovered ${personUrls.length} person URLs from list`);
    }

    // SYNC MODE: re-scrape all auto_sync wiki entries
    if (personUrls.length === 0 && mode === 'sync') {
      const { data: existing } = await serviceClient
        .from('archived_contents')
        .select('source_url')
        .eq('auto_sync', true)
        .like('source_url', `${BENGALI_WIKI}/wiki/%`)
        .limit(200);
      personUrls = (existing || []).map((r: any) => r.source_url);
    } else if (personUrls.length === 0 && urls && Array.isArray(urls) && urls.length > 0) {
      const expanded: string[] = [];
      for (const u of urls) {
        if (typeof u !== 'string') continue;
        const rawParts = u.split(/👉|\n|,/g).map(s => s.trim()).filter(Boolean);
        for (const part of rawParts) {
          const subParts = part.split(/(?=https?:\/\/)/g).map(s => s.trim()).filter(Boolean);
          for (const p of subParts) {
            if (p.startsWith('http')) expanded.push(p);
          }
        }
      }
      personUrls = Array.from(new Set(expanded)).slice(0, limit);
      console.log('Parsed person URLs:', personUrls);
    } else if (personUrls.length === 0) {
      const categoriesToScrape = category_tag
        ? PEOPLE_CATEGORIES.filter(c => c.name === category_tag)
        : PEOPLE_CATEGORIES;

      const discovered = new Set<string>();
      for (const cat of categoriesToScrape) {
        if (discovered.size >= limit) break;
        try {
          const catUrl = `${BENGALI_WIKI}${cat.url}`;
          const resp = await fetchPage(catUrl);
          if (!resp) continue;
          const html = await resp.text();
          const linkRegex = /<li[^>]*>\s*<a[^>]+href="(\/wiki\/[^":#]+)"[^>]*title="([^"]+)"/gi;
          let m;
          while ((m = linkRegex.exec(html)) !== null && discovered.size < limit) {
            const href = m[1];
            if (href.includes(':') || href.includes('বিষয়শ্রেণী')) continue;
            discovered.add(`${BENGALI_WIKI}${href}`);
          }
        } catch { /* skip */ }
      }
      personUrls = Array.from(discovered).slice(0, limit);
    }

    const runBatches = async () => {
      const batchSize = 3;
      for (let i = 0; i < personUrls.length; i += batchSize) {
        const batch = personUrls.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(url => scrapePersonPage(url, category_tag || 'বিশ্ববরেণ্য', serviceClient, publish_category_id, auto_sync !== false))
        );
        for (let j = 0; j < batchResults.length; j++) {
          const r = batchResults[j];
          if (r.status === 'fulfilled') results.push(r.value);
          else results.push({ url: batch[j], success: false, error: r.reason?.message });
        }
        await new Promise(r => setTimeout(r, 50));
      }
    };

    if (background || personUrls.length > 10) {
      // @ts-ignore EdgeRuntime is provided by Deno deploy
      EdgeRuntime.waitUntil(runBatches().catch(e => console.error('bg err:', e)));
      return new Response(
        JSON.stringify({ success: true, started: true, total: personUrls.length, message: 'Background scraping started' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await runBatches();

    const successCount = results.filter(r => r.success).length;
    return new Response(
      JSON.stringify({
        success: true, total: results.length, saved: successCount,
        updated: results.filter(r => r.updated).length,
        published: results.filter(r => r.published).length,
        results: results.slice(0, 100),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Wiki people scraper error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchPage(url: string): Promise<Response | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GalachipaBot/1.0',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'bn,en;q=0.9',
        },
        redirect: 'follow',
      });
      if (resp.ok) return resp;

      if (resp.status === 404) {
        const resolved = await resolveWikiTitle(url);
        if (resolved && resolved !== url) {
          const r2 = await fetch(resolved, {
            headers: { 'User-Agent': 'GalachipaBot/1.0', 'Accept': 'text/html' },
            redirect: 'follow',
          });
          if (r2.ok) return r2;
        }
        return null;
      }
      if (resp.status >= 500) { await new Promise(r => setTimeout(r, 1500 * (i + 1))); continue; }
      return null;
    } catch (e) {
      console.log(`fetch threw:`, (e as Error).message);
      if (i < 2) await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
  return null;
}

async function resolveWikiTitle(originalUrl: string): Promise<string | null> {
  try {
    const u = new URL(originalUrl);
    const rawTitle = decodeURIComponent(u.pathname.replace(/^\/wiki\//, '')).replace(/_/g, ' ');
    if (!rawTitle) return null;
    const apiUrl = `${u.origin}/w/api.php?action=opensearch&format=json&limit=1&search=${encodeURIComponent(rawTitle)}`;
    const resp = await fetch(apiUrl, {
      headers: { 'User-Agent': 'GalachipaBot/1.0', 'Accept': 'application/json' },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (Array.isArray(data) && Array.isArray(data[3]) && data[3][0]) {
      return data[3][0];
    }
  } catch { /* ignore */ }
  return null;
}

function absolutize(src: string): string {
  if (!src) return src;
  if (src.startsWith('//')) return 'https:' + src;
  if (src.startsWith('/')) return BENGALI_WIKI + src;
  return src;
}

/**
 * Use Wikipedia REST API to get clean parsed HTML.
 * Endpoint: /api/rest_v1/page/html/{title}
 * This returns well-formed HTML directly from Wikipedia's Parsoid pipeline,
 * avoiding all regex-based extraction issues.
 */
async function fetchWikiArticleHtml(wikiUrl: string): Promise<{ html: string; title: string } | null> {
  try {
    const u = new URL(wikiUrl);
    const titlePath = u.pathname.replace(/^\/wiki\//, '');
    // Decode first, then re-encode for the API path
    let decodedTitle: string;
    try { decodedTitle = decodeURIComponent(titlePath); } catch { decodedTitle = titlePath; }
    const encodedTitle = encodeURIComponent(decodedTitle);

    // Try REST API first — returns clean Parsoid HTML
    const restUrl = `${u.origin}/api/rest_v1/page/html/${encodedTitle}`;
    const resp = await fetch(restUrl, {
      headers: {
        'User-Agent': 'GalachipaBot/1.0',
        'Accept': 'text/html; charset=utf-8',
      },
    });

    if (resp.ok) {
      const html = await resp.text();
      // Extract title from the HTML
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch?.[1]?.replace(/ - উইকিপিডিয়া$/, '').trim() || decodedTitle.replace(/_/g, ' ');
      return { html, title };
    }

    // Fallback: Use action API parse endpoint for clean HTML
    const parseUrl = `${u.origin}/w/api.php?action=parse&page=${encodedTitle}&format=json&prop=text|displaytitle|images|categories`;
    const parseResp = await fetch(parseUrl, {
      headers: { 'User-Agent': 'GalachipaBot/1.0', 'Accept': 'application/json' },
    });

    if (parseResp.ok) {
      const data = await parseResp.json();
      if (data.parse) {
        const parsedHtml = data.parse.text?.['*'] || '';
        const parsedTitle = (data.parse.displaytitle || data.parse.title || decodedTitle)
          .replace(/<[^>]+>/g, '').trim();
        return { html: parsedHtml, title: parsedTitle };
      }
    }

    return null;
  } catch (e) {
    console.error('fetchWikiArticleHtml error:', (e as Error).message);
    return null;
  }
}

/**
 * Clean the HTML from Wikipedia API:
 * - Remove edit sections, navboxes, reference lists, ambox, metadata tables
 * - Fix all relative URLs to absolute
 * - Keep infobox, sections, images, tables intact
 */
function cleanWikiHtml(rawHtml: string): string {
  let html = rawHtml;

  // If we got a full HTML document (REST API returns <!DOCTYPE html>...<body>...</body></html>),
  // extract only the body's inner content. Parsoid wraps article in <body> directly.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    html = bodyMatch[1];
  }

  // Strip <!DOCTYPE> and <html>/<head> tags if any leaked through
  html = html.replace(/<!DOCTYPE[^>]*>/gi, '');
  html = html.replace(/<\/?html[^>]*>/gi, '');
  html = html.replace(/<head[\s\S]*?<\/head>/gi, '');
  html = html.replace(/<\/?body[^>]*>/gi, '');
  html = html.replace(/<link[^>]*>/gi, '');
  html = html.replace(/<meta[^>]*>/gi, '');
  html = html.replace(/<base[^>]*>/gi, '');
  html = html.replace(/<title[\s\S]*?<\/title>/gi, '');

  // Remove script/style
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Remove edit section links
  html = html.replace(/<span[^>]*class="[^"]*mw-editsection[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '');

  // Remove navbox, ambox, metadata tables
  html = html.replace(/<table[^>]*class="[^"]*navbox[^"]*"[^>]*>[\s\S]*?<\/table>/gi, '');
  html = html.replace(/<table[^>]*class="[^"]*ambox[^"]*"[^>]*>[\s\S]*?<\/table>/gi, '');
  html = html.replace(/<table[^>]*class="[^"]*metadata[^"]*"[^>]*>[\s\S]*?<\/table>/gi, '');
  html = html.replace(/<div[^>]*class="[^"]*mw-empty-elt[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

  // Remove reference lists and inline references
  html = html.replace(/<div[^>]*class="[^"]*mw-references-wrap[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  html = html.replace(/<div[^>]*class="[^"]*reflist[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  html = html.replace(/<ol[^>]*class="[^"]*references[^"]*"[^>]*>[\s\S]*?<\/ol>/gi, '');
  html = html.replace(/<sup[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, '');

  // Remove [সম্পাদনা] type links
  html = html.replace(/\[সম্পাদনা\]/g, '');

  // Fix relative URLs
  html = html.replace(/(<img[^>]+src=")([^"]+)(")/gi, (_m, a, src, c) => `${a}${absolutize(src)}${c}`);
  html = html.replace(/(<img[^>]+srcset=")([^"]+)(")/gi, (_m, a, srcset, c) => {
    const fixed = srcset.split(',').map((part: string) => {
      const trimmed = part.trim();
      const [u, ...rest] = trimmed.split(/\s+/);
      return [absolutize(u), ...rest].join(' ');
    }).join(', ');
    return `${a}${fixed}${c}`;
  });
  html = html.replace(/(<a[^>]+href=")(\/[^"]+)(")/gi, (_m, a, href, c) => `${a}${BENGALI_WIKI}${href}${c}`);
  html = html.replace(/(<a[^>]+href=")(\.\/[^"]+)(")/gi, (_m, a, href, c) => `${a}${BENGALI_WIKI}/wiki/${href.slice(2)}${c}`);

  return html.trim();
}

function extractPersonProfile(rawHtml: string, url: string, apiTitle?: string) {
  const html = cleanWikiHtml(rawHtml);

  const title = apiTitle || 'অজানা';

  // Featured image: try infobox first, then og:image, then first large image
  let featuredImage = '';
  const infoboxMatch = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (infoboxMatch) {
    const imgMatch = infoboxMatch[1].match(/<img[^>]+src="([^"]+)"/i);
    if (imgMatch) featuredImage = absolutize(imgMatch[1]);
  }
  if (!featuredImage) {
    const ogImg = rawHtml.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
    if (ogImg) featuredImage = ogImg;
  }
  if (!featuredImage) {
    // Grab first reasonably sized image
    const firstImg = html.match(/<img[^>]+src="(https:\/\/upload\.wikimedia\.org[^"]+)"/i);
    if (firstImg) featuredImage = firstImg[1];
  }

  // Plain text for excerpt
  const plain = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const excerpt = plain.slice(0, 500);

  // Extract all images
  const images: string[] = [];
  const imgRegex = /<img[^>]+src="(https?:\/\/[^"]+)"/gi;
  let im;
  while ((im = imgRegex.exec(html)) !== null && images.length < 30) {
    const src = im[1];
    if (src.includes('1x1') || src.includes('data:') || src.includes('.svg')) continue;
    if (!images.includes(src)) images.push(src);
  }

  // Categories as tags
  const tags: string[] = [];
  const catRegex = /title="বিষয়শ্রেণী:([^"]+)"/gi;
  let cm;
  const srcHtml = rawHtml || html;
  while ((cm = catRegex.exec(srcHtml)) !== null && tags.length < 25) {
    const tag = cm[1].trim();
    if (tag && !tags.includes(tag)) tags.push(tag);
  }

  return {
    title,
    html_content: html,
    content: html.slice(0, 500000),
    excerpt,
    featured_image: featuredImage,
    images,
    tags,
    source_url: url,
  };
}

async function scrapePersonPage(
  url: string, categoryTag: string, serviceClient: any,
  publishCategoryId?: string, autoSync: boolean = true,
) {
  let canonicalUrl = url;
  try { canonicalUrl = decodeURI(url); } catch { /* ignore */ }

  // Use Wikipedia API for clean HTML instead of raw page scraping
  const apiResult = await fetchWikiArticleHtml(url);

  if (!apiResult || apiResult.html.length < 200) {
    // Fallback to raw page fetch
    const resp = await fetchPage(url);
    if (!resp) return { url, success: false, error: 'Failed to fetch' };
    const rawHtml = await resp.text();
    if (rawHtml.length < 500) return { url, success: false, error: 'Too short' };

    // Use old method with raw HTML
    const profile = extractPersonProfile(rawHtml, canonicalUrl);
    if (!profile.html_content || profile.html_content.length < 100) {
      return { url, success: false, error: 'No content' };
    }
    return await saveProfile(profile, canonicalUrl, categoryTag, serviceClient, publishCategoryId, autoSync);
  }

  const profile = extractPersonProfile(apiResult.html, canonicalUrl, apiResult.title);
  if (!profile.html_content || profile.html_content.length < 100) {
    return { url, success: false, error: 'No content extracted' };
  }

  return await saveProfile(profile, canonicalUrl, categoryTag, serviceClient, publishCategoryId, autoSync);
}

async function saveProfile(
  profile: ReturnType<typeof extractPersonProfile>,
  canonicalUrl: string, categoryTag: string, serviceClient: any,
  publishCategoryId?: string, autoSync: boolean = true,
) {
  const { data: existing } = await serviceClient
    .from('archived_contents')
    .select('id')
    .eq('source_url', canonicalUrl)
    .maybeSingle();

  const payload: any = {
    source_url: canonicalUrl,
    title: profile.title,
    content: profile.content,
    html_content: profile.html_content,
    excerpt: profile.excerpt,
    featured_image: profile.featured_image,
    images: JSON.stringify(profile.images),
    tags: profile.tags,
    category: `পিপল-${categoryTag}`,
    source_name: 'বাংলা উইকিপিডিয়া',
    status: 'fetched',
    auto_sync: autoSync,
    last_synced_at: new Date().toISOString(),
  };

  let { error: upsertErr } = await serviceClient
    .from('archived_contents')
    .upsert(payload, { onConflict: 'source_url' });

  if (upsertErr && /column/i.test(upsertErr.message)) {
    const { auto_sync: _a, html_content: _h, last_synced_at: _l, ...legacy } = payload;
    const retry = await serviceClient
      .from('archived_contents')
      .upsert(legacy, { onConflict: 'source_url' });
    upsertErr = retry.error;
  }

  if (upsertErr) return { url: canonicalUrl, success: false, error: upsertErr.message };

  let published = false;
  if (publishCategoryId && !existing) {
    const slug = profile.title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now().toString(36);
    const { error: postError } = await serviceClient.from('posts').insert({
      title: profile.title,
      slug,
      content: profile.content,
      excerpt: profile.excerpt,
      featured_image: profile.featured_image,
      category_id: publishCategoryId,
      source_url: canonicalUrl,
      status: 'published',
    });
    if (!postError) published = true;
  } else if (publishCategoryId && existing) {
    await serviceClient.from('posts')
      .update({
        title: profile.title,
        content: profile.content,
        excerpt: profile.excerpt,
        featured_image: profile.featured_image,
      })
      .eq('source_url', canonicalUrl);
  }

  return {
    url: canonicalUrl, success: true, published,
    updated: !!existing,
    title: profile.title,
    hasImage: !!profile.featured_image,
    contentLength: profile.html_content.length,
    tagsCount: profile.tags.length,
  };
}
