import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const bengaliMonths = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const bengaliDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];

function toBengaliNum(n: number): string {
  return String(n).split('').map(d => bengaliDigits[parseInt(d)]).join('');
}

function bengaliToNumber(bn: string): number | null {
  const map: Record<string, string> = {
    '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'
  };
  const converted = bn.replace(/[০-৯]/g, d => map[d] || d).trim();
  const num = parseInt(converted);
  return isNaN(num) ? null : num;
}

async function fetchDatePage(month: number, day: number): Promise<any[]> {
  const monthName = bengaliMonths[month - 1];
  const dayBn = toBengaliNum(day);
  const title = `${monthName}_${dayBn}`;
  
  const url = `https://bn.wikipedia.org/wiki/${encodeURIComponent(title)}`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  
  if (!resp.ok) return [];
  const html = await resp.text();
  
  const events: any[] = [];
  
  // Find ঘটনাবলী section using data-mw-section-id or heading
  const sectionPattern = /(?:aria-labelledby="ঘটনাবলী"|id="ঘটনাবলী")/;
  const sectionMatch = sectionPattern.exec(html);
  
  let sectionContent = '';
  if (sectionMatch) {
    const afterMatch = html.substring(sectionMatch.index);
    // Find the next section (next h2 or section tag)
    const nextSection = afterMatch.substring(200).match(/<(?:section|\/section|h2)/i);
    sectionContent = nextSection 
      ? afterMatch.substring(0, 200 + nextSection.index!)
      : afterMatch.substring(0, 8000);
  } else {
    // Fallback: search for ঘটনাবলী heading
    const headingIdx = html.indexOf('ঘটনাবলী');
    if (headingIdx === -1) return [];
    // Find the last occurrence which is in actual content
    let lastIdx = -1;
    let searchFrom = 0;
    while (true) {
      const idx = html.indexOf('ঘটনাবলী', searchFrom);
      if (idx === -1) break;
      lastIdx = idx;
      searchFrom = idx + 1;
    }
    if (lastIdx === -1) return [];
    const afterContent = html.substring(lastIdx);
    const nextH2 = afterContent.substring(100).match(/<h2/i);
    sectionContent = nextH2
      ? afterContent.substring(0, 100 + nextH2.index!)
      : afterContent.substring(0, 8000);
  }
  
  // Extract list items
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let li;
  while ((li = liRegex.exec(sectionContent)) !== null && events.length < 50) {
    let text = li[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (text.length < 5) continue;
    
    // Extract year
    let year: number | null = null;
    // Try Arabic numerals first: "1865 - ..."
    const arabicYear = text.match(/^(\d{3,4})\s*[-–—:]\s*/);
    if (arabicYear) {
      year = parseInt(arabicYear[1]);
      text = text.substring(arabicYear[0].length).trim();
    } else {
      // Try Bengali numerals: "১৮৬৫ - ..."
      const bnYear = text.match(/^([০-৯]{3,4})\s*[-–—:]\s*/);
      if (bnYear) {
        year = bengaliToNumber(bnYear[1]);
        text = text.substring(bnYear[0].length).trim();
      }
    }
    
    if (text.length > 3) {
      events.push({
        month, day, year,
        title: text.substring(0, 500),
        source_url: url,
        category: 'historical',
      });
    }
  }
  
  // Also extract জন্ম (birth) section
  const birthSections = ['জন্ম', 'মৃত্যু'];
  for (const secName of birthSections) {
    const secIdx = html.lastIndexOf(`"${secName}"`);
    if (secIdx === -1) continue;
    const afterSec = html.substring(secIdx);
    const nextH = afterSec.substring(100).match(/<(?:h2|section[^>]*data-mw)/i);
    const secContent = nextH
      ? afterSec.substring(0, 100 + nextH.index!)
      : afterSec.substring(0, 5000);
    
    const category = secName === 'জন্ম' ? 'birth' : 'death';
    let secLi;
    const secLiRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    while ((secLi = secLiRegex.exec(secContent)) !== null && events.length < 80) {
      let text = secLi[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length < 5) continue;
      
      let year: number | null = null;
      const ym = text.match(/^(\d{3,4})\s*[-–—:]\s*/);
      if (ym) { year = parseInt(ym[1]); text = text.substring(ym[0].length).trim(); }
      else {
        const bym = text.match(/^([০-৯]{3,4})\s*[-–—:]\s*/);
        if (bym) { year = bengaliToNumber(bym[1]); text = text.substring(bym[0].length).trim(); }
      }
      
      if (text.length > 3) {
        events.push({ month, day, year, title: text.substring(0, 500), source_url: url, category });
      }
    }
  }
  
  return events;
}

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

    // Parse optional month range from request body
    let startMonth = 1, endMonth = 12;
    try {
      const body = await req.json();
      if (body?.start_month) startMonth = body.start_month;
      if (body?.end_month) endMonth = body.end_month;
    } catch { /* no body, scrape all */ }

    const allEvents: any[] = [];
    let pagesProcessed = 0;

    for (let month = startMonth; month <= endMonth; month++) {
      const maxDay = daysInMonth[month - 1];
      // Process 5 days at a time
      for (let dayStart = 1; dayStart <= maxDay; dayStart += 5) {
        const batch = [];
        for (let d = dayStart; d < dayStart + 5 && d <= maxDay; d++) {
          batch.push(fetchDatePage(month, d));
        }
        const results = await Promise.allSettled(batch);
        for (const r of results) {
          pagesProcessed++;
          if (r.status === 'fulfilled') {
            allEvents.push(...r.value);
          }
        }
      }
    }

    // Save to DB
    if (allEvents.length > 0) {
      // Clear existing events for the processed months
      for (let m = startMonth; m <= endMonth; m++) {
        await serviceClient.from('this_day_events').delete().eq('month', m);
      }
      // Insert in batches of 200
      for (let i = 0; i < allEvents.length; i += 200) {
        const batch = allEvents.slice(i, i + 200);
        const { error } = await serviceClient.from('this_day_events').insert(batch);
        if (error) console.error('Insert error:', error.message);
      }
    }

    return new Response(
      JSON.stringify({ success: true, total_events: allEvents.length, pages_processed: pagesProcessed }),
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
