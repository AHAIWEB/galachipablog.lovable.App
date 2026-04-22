import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = "https://galachipablog.lovable.app";
const SITE_TITLE = "গলাচিপা ব্লগ";
const SITE_DESC = "বাংলা ব্লগ ও সংবাদ পোর্টাল";

function escapeXml(unsafe: string): string {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function escapeCData(s: string): string {
  return (s || '').replace(/]]>/g, ']]]]><![CDATA[>');
}

// Detect MIME type from image URL extension
function getImageMime(url: string): string {
  const u = (url || '').toLowerCase().split('?')[0];
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.gif')) return 'image/gif';
  if (u.endsWith('.webp')) return 'image/webp';
  if (u.endsWith('.svg')) return 'image/svg+xml';
  if (u.endsWith('.avif')) return 'image/avif';
  if (u.endsWith('.bmp')) return 'image/bmp';
  return 'image/jpeg';
}

// Extract first image from HTML content as fallback
function extractFirstImage(html: string): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

// Make image URL absolute
function absolutize(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return SITE_URL + url;
  return url;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const url = new URL(req.url);
    // ?limit=10/25/50 — clamped between 1 and 200; default 50
    const rawLimit = parseInt(url.searchParams.get('limit') || '50', 10);
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 50 : rawLimit, 1), 200);
    const categorySlug = url.searchParams.get('category');

    let query = supabase
      .from('posts')
      .select('id, title, slug, excerpt, content, featured_image, created_at, updated_at, source_url, categories(name, slug)')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (categorySlug) {
      const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).maybeSingle();
      if (cat) query = query.eq('category_id', cat.id);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    const items = (posts || []).map((p: any) => {
      const link = `${SITE_URL}/post/${p.slug}`;
      const pubDate = new Date(p.created_at).toUTCString();
      const description = p.excerpt || (p.content || '').replace(/<[^>]+>/g, '').slice(0, 300);

      // Resolve image: featured_image first, then first <img> in content
      const rawImg = p.featured_image || extractFirstImage(p.content || '');
      const imgUrl = rawImg ? absolutize(rawImg) : '';
      const imgMime = imgUrl ? getImageMime(imgUrl) : '';
      const altText = p.title || '';

      const contentHtml = `${imgUrl ? `<p><img src="${escapeXml(imgUrl)}" alt="${escapeXml(altText)}"/></p>` : ''}${p.content || ''}${p.source_url ? `<p><small>মূল সূত্র: <a href="${escapeXml(p.source_url)}" rel="noopener">${escapeXml(p.source_url)}</a></small></p>` : ''}`;
      const category = p.categories?.name ? `<category>${escapeXml(p.categories.name)}</category>` : '';
      const enclosure = imgUrl ? `<enclosure url="${escapeXml(imgUrl)}" type="${imgMime}" length="0"/>` : '';
      const mediaContent = imgUrl ? `<media:content url="${escapeXml(imgUrl)}" medium="image" type="${imgMime}"/>` : '';

      return `    <item>
      <title><![CDATA[${escapeCData(p.title)}]]></title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      ${category}
      ${enclosure}
      ${mediaContent}
      <description><![CDATA[${escapeCData(description)}]]></description>
      <content:encoded><![CDATA[${escapeCData(contentHtml)}]]></content:encoded>
    </item>`;
    }).join('\n');

    const lastBuild = posts && posts.length > 0 ? new Date(posts[0].created_at).toUTCString() : new Date().toUTCString();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>bn</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml?limit=${limit}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`<?xml version="1.0"?><error>${escapeXml(msg)}</error>`, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
    });
  }
});
