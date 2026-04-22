import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = "https://galachipablog.lovable.app";
const SITE_TITLE = "গলাচিপা ব্লগ";
const SITE_DESC = "বাংলা ব্লগ ও সংবাদ পোর্টাল";

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, title, slug, excerpt, content, featured_image, created_at, updated_at, source_url, categories(name, slug)')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const items = (posts || []).map((p: any) => {
      const link = `${SITE_URL}/post/${p.slug}`;
      const pubDate = new Date(p.created_at).toUTCString();
      const description = p.excerpt || (p.content || '').replace(/<[^>]+>/g, '').slice(0, 300);
      const contentHtml = `${p.featured_image ? `<p><img src="${escapeXml(p.featured_image)}" alt=""/></p>` : ''}${p.content || ''}${p.source_url ? `<p><small>মূল সূত্র: <a href="${escapeXml(p.source_url)}">${escapeXml(p.source_url)}</a></small></p>` : ''}`;
      const category = p.categories?.name ? `<category>${escapeXml(p.categories.name)}</category>` : '';
      const enclosure = p.featured_image ? `<enclosure url="${escapeXml(p.featured_image)}" type="image/jpeg"/>` : '';

      return `    <item>
      <title><![CDATA[${escapeCData(p.title)}]]></title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      ${category}
      ${enclosure}
      <description><![CDATA[${escapeCData(description)}]]></description>
      <content:encoded><![CDATA[${escapeCData(contentHtml)}]]></content:encoded>
    </item>`;
    }).join('\n');

    const lastBuild = posts && posts.length > 0 ? new Date(posts[0].created_at).toUTCString() : new Date().toUTCString();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>bn</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
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
