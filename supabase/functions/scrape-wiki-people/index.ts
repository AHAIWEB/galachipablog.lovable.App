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
    const { urls, category_tag, max_people, publish_category_id, auto_sync, mode } = body;

    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const limit = max_people || 50;
    const results: any[] = [];

    let personUrls: string[] = [];

    // SYNC MODE: re-scrape all auto_sync wiki entries
    if (mode === 'sync') {
      const { data: existing } = await serviceClient
        .from('archived_contents')
        .select('source_url')
        .eq('auto_sync', true)
        .like('source_url', `${BENGALI_WIKI}/wiki/%`)
        .limit(200);
      personUrls = (existing || []).map((r: any) => r.source_url);
    } else if (urls && Array.isArray(urls) && urls.length > 0) {
      // Support 👉, newline, or comma separators per URL string
      const expanded: string[] = [];
      for (const u of urls) {
        if (typeof u !== 'string') continue;
        // Split on 👉 emoji, newlines, commas. Then also split on 'http' boundaries
        // in case separators were stripped during transport.
        const rawParts = u.split(/👉|\n|,/g).map(s => s.trim()).filter(Boolean);
        for (const part of rawParts) {
          // Handle case where multiple URLs got concatenated without our separators
          const subParts = part.split(/(?=https?:\/\/)/g).map(s => s.trim()).filter(Boolean);
          for (const p of subParts) {
            if (p.startsWith('http')) expanded.push(p);
          }
        }
      }
      personUrls = Array.from(new Set(expanded)).slice(0, limit);
      console.log('Parsed person URLs:', personUrls);
    } else {
      // Discover via Wikipedia categories
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

    const batchSize = 4;
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
    }

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
  // Properly encode non-ASCII paths (Bengali Wikipedia URLs)
  let encoded = url;
  try {
    const u = new URL(url);
    u.pathname = u.pathname.split('/').map(seg => {
      try { return encodeURIComponent(decodeURIComponent(seg)); } catch { return encodeURIComponent(seg); }
    }).join('/');
    encoded = u.toString();
  } catch { /* fallback to original */ }

  for (let i = 0; i < 3; i++) {
    try {
      const resp = await fetch(encoded, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'bn,en;q=0.9',
        },
      });
      if (resp.ok) return resp;
      if (resp.status >= 500) { await new Promise(r => setTimeout(r, 1000 * (i + 1))); continue; }
      return null;
    } catch {
      if (i < 2) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return null;
}

// Resolve protocol-relative or relative URLs against bn.wikipedia.org
function absolutize(src: string): string {
  if (!src) return src;
  if (src.startsWith('//')) return 'https:' + src;
  if (src.startsWith('/')) return BENGALI_WIKI + src;
  return src;
}

// Build full HTML mirror of the article body — preserves infobox, sections, images, tables.
function extractFullArticleHtml(html: string): string {
  // Grab the parser-output div which holds the article content.
  const parserMatch = html.match(/<div[^>]*class="[^"]*mw-parser-output[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*id="catlinks"|<div[^>]*class="printfooter"|<\/div>\s*<\/div>\s*<noscript>)/i);
  let body = parserMatch?.[1] || '';

  if (!body) {
    const contentMatch = html.match(/<div[^>]*id="mw-content-text"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*id="catlinks"/i);
    body = contentMatch?.[1] || '';
  }

  if (!body) return '';

  // Strip edit links, navboxes, references-only blocks, scripts/styles
  body = body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<span[^>]*class="[^"]*mw-editsection[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<table[^>]*class="[^"]*navbox[^"]*"[^>]*>[\s\S]*?<\/table>/gi, '')
    .replace(/<table[^>]*class="[^"]*ambox[^"]*"[^>]*>[\s\S]*?<\/table>/gi, '')
    .replace(/<table[^>]*class="[^"]*metadata[^"]*"[^>]*>[\s\S]*?<\/table>/gi, '')
    .replace(/<div[^>]*class="[^"]*mw-references-wrap[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*class="[^"]*reflist[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<sup[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, '');

  // Make image src and links absolute
  body = body.replace(/(<img[^>]+src=")([^"]+)(")/gi, (_m, a, src, c) => `${a}${absolutize(src)}${c}`);
  body = body.replace(/(<img[^>]+srcset=")([^"]+)(")/gi, (_m, a, srcset, c) => {
    const fixed = srcset.split(',').map((part: string) => {
      const trimmed = part.trim();
      const [u, ...rest] = trimmed.split(/\s+/);
      return [absolutize(u), ...rest].join(' ');
    }).join(', ');
    return `${a}${fixed}${c}`;
  });
  body = body.replace(/(<a[^>]+href=")(\/[^"]+)(")/gi, (_m, a, href, c) => `${a}${BENGALI_WIKI}${href}${c}`);

  return body.trim();
}

function extractPersonProfile(html: string, url: string) {
  const titleMatch = html.match(/<h1[^>]*id="firstHeading"[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() || 'অজানা';

  let featuredImage = '';
  const infoboxMatch = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (infoboxMatch) {
    const imgMatch = infoboxMatch[1].match(/<img[^>]+src="([^"]+)"/i);
    if (imgMatch) featuredImage = absolutize(imgMatch[1]);
  }
  if (!featuredImage) {
    const ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
    if (ogImg) featuredImage = ogImg;
  }

  // Full HTML mirror — preserves whole Wikipedia article verbatim
  const htmlContent = extractFullArticleHtml(html);

  // Plain-text version for excerpt + content fallback
  const plain = htmlContent
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const excerpt = plain.slice(0, 500);

  // Extract all images
  const images: string[] = [];
  const imgRegex = /<img[^>]+src="([^"]+)"/gi;
  let im;
  while ((im = imgRegex.exec(htmlContent)) !== null && images.length < 30) {
    let src = im[1];
    if (src.startsWith('data:') || src.includes('1x1')) continue;
    src = absolutize(src);
    if (src.startsWith('http') && !images.includes(src)) images.push(src);
  }

  // Categories as tags
  const tags: string[] = [];
  const catRegex = /<a[^>]+href="\/wiki\/বিষয়শ্রেণী:[^"]*"[^>]*title="বিষয়শ্রেণী:([^"]+)"/gi;
  let cm;
  while ((cm = catRegex.exec(html)) !== null && tags.length < 25) {
    const tag = cm[1].trim();
    if (tag && !tags.includes(tag)) tags.push(tag);
  }

  return {
    title,
    html_content: htmlContent,
    content: htmlContent.slice(0, 500000), // store full HTML in content too for posts
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
  // Decode URL for storage consistency
  let canonicalUrl = url;
  try { canonicalUrl = decodeURI(url); } catch { /* ignore */ }

  const resp = await fetchPage(url);
  if (!resp) return { url, success: false, error: 'Failed to fetch' };

  const html = await resp.text();
  if (html.length < 500) return { url, success: false, error: 'Too short' };

  const profile = extractPersonProfile(html, canonicalUrl);
  if (!profile.html_content || profile.html_content.length < 100) {
    return { url, success: false, error: 'No content' };
  }

  // Check existing
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

  // Upsert via source_url unique key. Retry without auto_sync/html_content/last_synced_at
  // if PostgREST schema cache hasn't picked them up yet.
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

  if (upsertErr) return { url, success: false, error: upsertErr.message };

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
    // Update existing post (matched by source_url) so Wiki updates flow through
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
