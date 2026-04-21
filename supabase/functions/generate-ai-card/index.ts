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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { data: roleData } = await supabase
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const {
      text, url, style, size,
      custom_bg_url,      // optional custom background image URL
      title_font_size,    // optional, px number
      body_font_size,     // optional, px number
      text_color,         // optional, hex color
      bg_overlay_opacity, // optional, 0-1
    } = body;

    if (!text && !url) {
      return new Response(JSON.stringify({ error: 'Text or URL is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let contentText = text || '';
    if (url) {
      try {
        const resp = await fetch(url);
        const html = await resp.text();
        const stripped = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ').trim().slice(0, 500);
        contentText = contentText ? `${contentText}\n\n${stripped}` : stripped;
      } catch { /* ignore */ }
    }

    // AI suggestion (optional, non-blocking)
    let aiContent = '';
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (lovableApiKey) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lovableApiKey}` },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [{
              role: 'user',
              content: `এই কন্টেন্টের জন্য একটি সুন্দর ছোট হেডলাইন/ক্যাচলাইন বাংলায় দাও (২০ শব্দের মধ্যে), শুধুমাত্র সেই লাইন রিটার্ন করো:\n\n${contentText.slice(0, 500)}`
            }],
          }),
        });
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiContent = (aiData.choices?.[0]?.message?.content || '').trim();
        }
      } catch { /* ignore */ }
    }

    const cardHtml = generateCardHtml(contentText.slice(0, 400), style || 'modern', size || 'landscape', {
      custom_bg_url, title_font_size, body_font_size, text_color, bg_overlay_opacity,
    });

    return new Response(
      JSON.stringify({ success: true, card_html: cardHtml, ai_suggestion: aiContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateCardHtml(
  text: string,
  style: string,
  size: string,
  opts: { custom_bg_url?: string; title_font_size?: number; body_font_size?: number; text_color?: string; bg_overlay_opacity?: number }
): string {
  const dimensions = size === 'story' ? { w: 1080, h: 1920 } : size === 'square' ? { w: 1080, h: 1080 } : { w: 1200, h: 630 };

  const styles: Record<string, { bg: string; textColor: string; font: string; extra: string }> = {
    modern:       { bg: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', textColor: '#ffffff', font: "'Noto Sans Bengali',sans-serif", extra: '' },
    elegant:      { bg: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)', textColor: '#e8d5b7', font: "'Noto Sans Bengali',serif", extra: 'border:6px solid #c9a96e;' },
    playful:      { bg: 'linear-gradient(135deg,#f093fb 0%,#f5576c 50%,#4facfe 100%)', textColor: '#ffffff', font: "'Noto Sans Bengali',sans-serif", extra: 'border-radius:24px;' },
    professional: { bg: 'linear-gradient(135deg,#e8f4fd 0%,#c5e3f6 50%,#89c4e1 100%)', textColor: '#1a365d', font: "'Noto Sans Bengali',sans-serif", extra: '' },
    bengali:      { bg: 'linear-gradient(135deg,#e74c3c 0%,#c0392b 30%,#922b21 100%)', textColor: '#ffffff', font: "'Noto Sans Bengali',sans-serif", extra: '' },
    quote:        { bg: 'linear-gradient(135deg,#2c3e50 0%,#3498db 100%)', textColor: '#ecf0f1', font: "'Noto Sans Bengali',serif", extra: '' },
  };

  const s = styles[style] || styles.modern;
  const textColor = opts.text_color || s.textColor;
  const autoFs = text.length > 200 ? 32 : text.length > 100 ? 44 : 56;
  const bodyFs = opts.body_font_size || autoFs;
  const overlay = opts.bg_overlay_opacity ?? 0.35;

  const background = opts.custom_bg_url
    ? `linear-gradient(rgba(0,0,0,${overlay}),rgba(0,0,0,${overlay})),url("${opts.custom_bg_url}") center/cover no-repeat`
    : s.bg;

  return `<div style="width:${dimensions.w}px;height:${dimensions.h}px;background:${background};color:${textColor};font-family:${s.font};display:flex;align-items:center;justify-content:center;padding:80px;box-sizing:border-box;${s.extra}">
    <div style="text-align:center;font-size:${bodyFs}px;line-height:1.5;font-weight:700;text-shadow:0 4px 16px rgba(0,0,0,0.5);max-width:100%;word-wrap:break-word;">
      ${style === 'quote' ? `<div style="font-size:${Math.round(bodyFs*1.6)}px;opacity:0.5;line-height:0.5;margin-bottom:24px;">❝</div>` : ''}
      <div>${escapeHtml(text)}</div>
      ${style === 'quote' ? `<div style="font-size:${Math.round(bodyFs*1.6)}px;opacity:0.5;line-height:0.5;margin-top:24px;">❞</div>` : ''}
    </div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
