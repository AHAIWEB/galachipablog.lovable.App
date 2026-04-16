import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BENGALI_WIKI = 'https://bn.wikipedia.org';

// Notable people lists from Bengali Wikipedia
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

    const body = await req.json();
    const { urls, category_tag, max_people, publish_category_id } = body;
    // urls: optional custom Wikipedia person page URLs
    // category_tag: filter by PEOPLE_CATEGORIES name (e.g. 'কবি')  
    // max_people: limit (default 50)
    // publish_category_id: if provided, auto-create posts in this category

    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const limit = max_people || 50;
    const results: any[] = [];

    let personUrls: string[] = [];

    if (urls && Array.isArray(urls) && urls.length > 0) {
      // Use provided URLs directly
      personUrls = urls.slice(0, limit);
    } else {
      // Discover person pages from Wikipedia categories
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

          // Extract article links from category page
          const linkRegex = /<li[^>]*>\s*<a[^>]+href="(\/wiki\/[^":#]+)"[^>]*title="([^"]+)"/gi;
          let m;
          while ((m = linkRegex.exec(html)) !== null && discovered.size < limit) {
            const href = m[1];
            // Skip category/special pages
            if (href.includes(':') || href.includes('বিষয়শ্রেণী')) continue;
            const fullUrl = `${BENGALI_WIKI}${href}`;
            if (!discovered.has(fullUrl)) {
              discovered.add(fullUrl);
            }
          }

          // Also check mw-pages div for category members
          const pagesMatch = html.match(/<div[^>]*id="mw-pages"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
          if (pagesMatch) {
            const pagesHtml = pagesMatch[1];
            const pageLinks = /<a[^>]+href="(\/wiki\/[^":#]+)"/gi;
            let pm;
            while ((pm = pageLinks.exec(pagesHtml)) !== null && discovered.size < limit) {
              const href = pm[1];
              if (href.includes(':')) continue;
              const fullUrl = `${BENGALI_WIKI}${href}`;
              if (!discovered.has(fullUrl)) discovered.add(fullUrl);
            }
          }
        } catch { /* skip category */ }
      }
      personUrls = Array.from(discovered).slice(0, limit);
    }

    // Process person pages in batches
    const batchSize = 5;
    for (let i = 0; i < personUrls.length; i += batchSize) {
      const batch = personUrls.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(url => scrapePersonPage(url, category_tag || 'বিশ্ববরেণ্য', serviceClient, publish_category_id))
      );
      for (let j = 0; j < batchResults.length; j++) {
        const r = batchResults[j];
        if (r.status === 'fulfilled') results.push(r.value);
        else results.push({ url: batch[j], success: false, error: r.reason?.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return new Response(
      JSON.stringify({ success: true, total: results.length, saved: successCount, published: results.filter(r => r.published).length, results: results.slice(0, 100) }),
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

function extractPersonProfile(html: string, url: string) {
  // Title
  const titleMatch = html.match(/<h1[^>]*id="firstHeading"[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() || 'অজানা';

  // Infobox image
  let featuredImage = '';
  const infoboxMatch = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (infoboxMatch) {
    const imgMatch = infoboxMatch[1].match(/<img[^>]+src="([^"]+)"/i);
    if (imgMatch) {
      let src = imgMatch[1];
      if (src.startsWith('//')) src = 'https:' + src;
      featuredImage = src;
    }
  }

  // If no infobox image, try og:image
  if (!featuredImage) {
    const ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
    if (ogImg) featuredImage = ogImg;
  }

  // Extract first paragraphs as excerpt
  const contentDiv = html.match(/<div[^>]*id="mw-content-text"[^>]*>([\s\S]*?)<\/div>\s*<!--/i)?.[1]
    || html.match(/<div[^>]*class="mw-parser-output"[^>]*>([\s\S]*)/i)?.[1] || '';

  // Get first few paragraphs
  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pm;
  while ((pm = pRegex.exec(contentDiv)) !== null && paragraphs.length < 5) {
    const text = pm[1]
      .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\[\d+\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length > 30) paragraphs.push(text);
  }

  const excerpt = paragraphs[0] || '';
  const content = paragraphs.join('\n\n');

  // Extract all images
  const images: string[] = [];
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*/gi;
  let im;
  while ((im = imgRegex.exec(contentDiv)) !== null && images.length < 20) {
    let src = im[1];
    if (src.startsWith('data:') || src.includes('static/') || src.includes('1x1')) continue;
    if (src.startsWith('//')) src = 'https:' + src;
    if (src.startsWith('http') && !images.includes(src)) images.push(src);
  }

  // Extract birth/death info from infobox
  let birthDate = '';
  let deathDate = '';
  if (infoboxMatch) {
    const birthMatch = infoboxMatch[1].match(/জন্ম[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
    if (birthMatch) {
      birthDate = birthMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
    }
    const deathMatch = infoboxMatch[1].match(/মৃত্যু[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
    if (deathMatch) {
      deathDate = deathMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
    }
  }

  // Extract categories as tags
  const tags: string[] = [];
  const catRegex = /<a[^>]+href="\/wiki\/বিষয়শ্রেণী:[^"]*"[^>]*title="বিষয়শ্রেণী:([^"]+)"/gi;
  let cm;
  while ((cm = catRegex.exec(html)) !== null && tags.length < 20) {
    const tag = cm[1].trim();
    if (tag && !tags.includes(tag)) tags.push(tag);
  }

  // Build rich content with birth/death info
  let fullContent = '';
  if (birthDate) fullContent += `জন্ম: ${birthDate}\n`;
  if (deathDate) fullContent += `মৃত্যু: ${deathDate}\n\n`;
  fullContent += content;

  return {
    title,
    content: fullContent.slice(0, 30000),
    excerpt: excerpt.slice(0, 500),
    featured_image: featuredImage,
    images,
    tags,
    source_url: url,
  };
}

async function scrapePersonPage(
  url: string, categoryTag: string, serviceClient: any, publishCategoryId?: string
) {
  const resp = await fetchPage(url);
  if (!resp) return { url, success: false, error: 'Failed to fetch' };

  const html = await resp.text();
  if (html.length < 500) return { url, success: false, error: 'Too short' };

  const profile = extractPersonProfile(html, url);
  if (profile.content.length < 30) return { url, success: false, error: 'No content' };

  // Save to archived_contents
  const { error: archiveError } = await serviceClient.from('archived_contents').insert({
    source_url: url,
    title: profile.title,
    content: profile.content,
    excerpt: profile.excerpt,
    featured_image: profile.featured_image,
    images: JSON.stringify(profile.images),
    tags: profile.tags,
    category: `পিপল-${categoryTag}`,
    source_name: 'বাংলা উইকিপিডিয়া',
    status: 'fetched',
  });

  if (archiveError) return { url, success: false, error: archiveError.message };

  let published = false;
  // Auto-publish as post if category_id provided
  if (publishCategoryId) {
    const slug = profile.title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now().toString(36);
    const { error: postError } = await serviceClient.from('posts').insert({
      title: profile.title,
      slug,
      content: profile.content,
      excerpt: profile.excerpt,
      featured_image: profile.featured_image,
      category_id: publishCategoryId,
      status: 'published',
    });
    if (!postError) published = true;
  }

  return {
    url, success: true, published,
    title: profile.title,
    hasImage: !!profile.featured_image,
    contentLength: profile.content.length,
    tagsCount: profile.tags.length,
  };
}
