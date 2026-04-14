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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });

    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (!roleData) return new Response(JSON.stringify({ error: 'Admin required' }), { status: 403, headers: corsHeaders });
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Fetch Wikipedia page
    const wikiUrl = 'https://bn.wikipedia.org/wiki/%E0%A6%90%E0%A6%A4%E0%A6%BF%E0%A6%B9%E0%A6%BE%E0%A6%B8%E0%A6%BF%E0%A6%95_%E0%A6%AC%E0%A6%BE%E0%A6%B0%E0%A7%8D%E0%A6%B7%E0%A6%BF%E0%A6%95%E0%A7%80%E0%A6%B0_%E0%A6%A4%E0%A6%BE%E0%A6%B2%E0%A6%BF%E0%A6%95%E0%A6%BE';
    
    const resp = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch Wikipedia page' }), { status: 500, headers: corsHeaders });
    }

    const html = await resp.text();
    
    // Parse monthly links from the page
    // The page has links to individual month pages like জানুয়ারি, ফেব্রুয়ারি etc.
    const bengaliMonths = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];

    const events: any[] = [];
    
    // Try to extract events directly from the main page
    // Wikipedia historical anniversaries pages typically list events by month/day
    // Parse the content looking for date-event patterns
    
    // Extract links to individual date pages
    const linkRegex = /href="\/wiki\/([^"]+)"/gi;
    const datePageLinks: string[] = [];
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
      const path = decodeURIComponent(m[1]);
      // Check if it's a date page (e.g., "জানুয়ারি ১", "ফেব্রুয়ারি ২৩")
      for (let mi = 0; mi < bengaliMonths.length; mi++) {
        if (path.startsWith(bengaliMonths[mi] + '_') || path.startsWith(bengaliMonths[mi] + ' ')) {
          const dayPart = path.replace(bengaliMonths[mi], '').replace('_', ' ').trim();
          const dayNum = bengaliToNumber(dayPart);
          if (dayNum && dayNum >= 1 && dayNum <= 31) {
            datePageLinks.push(`${mi + 1}|${dayNum}|${path}`);
          }
        }
      }
    }

    // Deduplicate
    const uniqueLinks = [...new Set(datePageLinks)];
    
    // Process date pages in batches (limit to avoid timeout)
    const maxPages = 60; // ~2 months worth
    const toProcess = uniqueLinks.slice(0, maxPages);
    
    for (let i = 0; i < toProcess.length; i += 5) {
      const batch = toProcess.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (entry) => {
          const [monthStr, dayStr, path] = entry.split('|');
          const month = parseInt(monthStr);
          const day = parseInt(dayStr);
          
          const pageUrl = `https://bn.wikipedia.org/wiki/${encodeURIComponent(path.replace(/ /g, '_'))}`;
          const pageResp = await fetch(pageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          });
          
          if (!pageResp.ok) return [];
          
          const pageHtml = await pageResp.text();
          return extractEvents(pageHtml, month, day, pageUrl);
        })
      );
      
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          events.push(...r.value);
        }
      }
    }

    // Bulk insert events
    if (events.length > 0) {
      // Delete existing events first to avoid duplicates
      await serviceClient.from('this_day_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Insert in batches of 100
      for (let i = 0; i < events.length; i += 100) {
        const batch = events.slice(i, i + 100);
        await serviceClient.from('this_day_events').insert(batch);
      }
    }

    return new Response(
      JSON.stringify({ success: true, total_events: events.length, pages_processed: toProcess.length }),
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

function bengaliToNumber(bn: string): number | null {
  const bnDigits: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  const converted = bn.replace(/[০-৯]/g, d => bnDigits[d] || d).trim();
  const num = parseInt(converted);
  return isNaN(num) ? null : num;
}

function extractEvents(html: string, month: number, day: number, sourceUrl: string): any[] {
  const events: any[] = [];
  
  // Remove script/style tags
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  
  // Find the "ঘটনাবলী" (Events) section
  const sections = ['ঘটনাবলী', 'ঘটনা', 'Events'];
  
  for (const section of sections) {
    const sectionRegex = new RegExp(`<span[^>]*id=["']${section}["'][^>]*>|<h[23][^>]*>\\s*${section}`, 'i');
    const sectionMatch = sectionRegex.exec(cleaned);
    if (!sectionMatch) continue;
    
    // Get content after the section header until next h2/h3
    const afterSection = cleaned.substring(sectionMatch.index);
    const nextSectionMatch = afterSection.substring(100).match(/<h[23][^>]*>/i);
    const sectionContent = nextSectionMatch 
      ? afterSection.substring(0, 100 + nextSectionMatch.index!)
      : afterSection.substring(0, 5000);
    
    // Extract list items
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let li;
    while ((li = liRegex.exec(sectionContent)) !== null && events.length < 30) {
      let text = li[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (text.length < 5) continue;
      
      // Try to extract year from the beginning
      let year: number | null = null;
      const yearMatch = text.match(/^(\d{3,4})\s*[-–—:]\s*/);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
        text = text.substring(yearMatch[0].length).trim();
      } else {
        // Try Bengali year
        const bnYearMatch = text.match(/^([০-৯]{৩,৪})\s*[-–—:]\s*/);
        if (bnYearMatch) {
          year = bengaliToNumber(bnYearMatch[1]);
          text = text.substring(bnYearMatch[0].length).trim();
        }
      }
      
      if (text.length > 3) {
        events.push({
          month,
          day,
          year,
          title: text.substring(0, 500),
          source_url: sourceUrl,
          category: 'historical',
        });
      }
    }
    
    if (events.length > 0) break;
  }
  
  // If no events found in specific section, try all list items
  if (events.length === 0) {
    const contentMatch = cleaned.match(/<div[^>]*class=["'][^"']*mw-parser-output[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<div|$)/i);
    if (contentMatch) {
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let li;
      while ((li = liRegex.exec(contentMatch[1])) !== null && events.length < 20) {
        let text = li[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        if (text.length < 10) continue;
        
        let year: number | null = null;
        const yearMatch = text.match(/^(\d{3,4})\s*[-–—:]\s*/);
        if (yearMatch) {
          year = parseInt(yearMatch[1]);
          text = text.substring(yearMatch[0].length).trim();
        }
        
        if (text.length > 5) {
          events.push({ month, day, year, title: text.substring(0, 500), source_url: sourceUrl, category: 'historical' });
        }
      }
    }
  }
  
  return events;
}
