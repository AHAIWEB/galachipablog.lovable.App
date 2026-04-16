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
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { text, url, style, size } = body;

    if (!text && !url) {
      return new Response(JSON.stringify({ error: 'Text or URL is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'AI API key not configured' }), { status: 500, headers: corsHeaders });
    }

    // If URL provided, fetch content from it
    let contentText = text || '';
    if (url) {
      try {
        const resp = await fetch(url);
        const html = await resp.text();
        // Extract text content from HTML
        const stripped = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 500);
        contentText = contentText ? `${contentText}\n\n${stripped}` : stripped;
      } catch {
        // If fetch fails, use just the text
      }
    }

    const styleMap: Record<string, string> = {
      modern: 'modern minimalist design with clean typography, gradient background, bold colors',
      elegant: 'elegant luxury design with serif fonts, gold accents, dark background',
      playful: 'playful colorful design with rounded shapes, fun illustrations, vibrant colors',
      professional: 'professional corporate design, clean layout, blue and white color scheme',
      bengali: 'beautiful Bengali cultural design with traditional patterns, warm colors, Bengali typography feel',
      quote: 'inspirational quote card with beautiful background, large centered text, decorative borders',
    };

    const selectedStyle = styleMap[style] || styleMap.modern;
    const cardSize = size === 'story' ? '1080x1920 (vertical story)' : size === 'square' ? '1080x1080 (square)' : '1200x630 (landscape)';

    const prompt = `Create a beautiful social media card image with the following specifications:
- Size: ${cardSize}
- Style: ${selectedStyle}
- Content text to display on the card (in Bengali if Bengali text provided): "${contentText.slice(0, 300)}"
- Make the text clearly readable and well-formatted on the card
- Use attractive visual design with proper contrast
- If the text is in Bengali, ensure it looks beautiful with proper Bengali typography`;

    // Use Gemini image generation model
    const aiResponse = await fetch('https://ai-gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt,
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return new Response(
        JSON.stringify({ error: `AI generation failed: ${aiResponse.status}`, details: errText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    // Generate HTML card that can be rendered as image
    const cardHtml = generateCardHtml(contentText.slice(0, 300), style || 'modern', size || 'landscape');

    return new Response(
      JSON.stringify({ 
        success: true, 
        card_html: cardHtml,
        ai_suggestion: aiContent,
        prompt_used: prompt 
      }),
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

function generateCardHtml(text: string, style: string, size: string): string {
  const dimensions = size === 'story' ? { w: 1080, h: 1920 } : size === 'square' ? { w: 1080, h: 1080 } : { w: 1200, h: 630 };
  
  const styles: Record<string, { bg: string; textColor: string; font: string; extra: string }> = {
    modern: {
      bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      textColor: '#ffffff',
      font: "'Noto Sans Bengali', sans-serif",
      extra: '',
    },
    elegant: {
      bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      textColor: '#e8d5b7',
      font: "'Noto Sans Bengali', serif",
      extra: 'border: 3px solid #c9a96e;',
    },
    playful: {
      bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #4facfe 100%)',
      textColor: '#ffffff',
      font: "'Noto Sans Bengali', sans-serif",
      extra: 'border-radius: 24px;',
    },
    professional: {
      bg: 'linear-gradient(135deg, #e8f4fd 0%, #c5e3f6 50%, #89c4e1 100%)',
      textColor: '#1a365d',
      font: "'Noto Sans Bengali', sans-serif",
      extra: '',
    },
    bengali: {
      bg: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 30%, #922b21 100%)',
      textColor: '#ffffff',
      font: "'Noto Sans Bengali', sans-serif",
      extra: '',
    },
    quote: {
      bg: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
      textColor: '#ecf0f1',
      font: "'Noto Sans Bengali', serif",
      extra: '',
    },
  };

  const s = styles[style] || styles.modern;
  const fontSize = text.length > 150 ? '28px' : text.length > 80 ? '36px' : '48px';

  return `<div style="width:${dimensions.w}px;height:${dimensions.h}px;background:${s.bg};color:${s.textColor};font-family:${s.font};display:flex;align-items:center;justify-content:center;padding:60px;box-sizing:border-box;${s.extra}">
    <div style="text-align:center;font-size:${fontSize};line-height:1.6;font-weight:600;text-shadow:0 2px 8px rgba(0,0,0,0.3);">
      ${style === 'quote' ? '<span style="font-size:72px;opacity:0.5;">❝</span><br>' : ''}
      ${text}
      ${style === 'quote' ? '<br><span style="font-size:72px;opacity:0.5;">❞</span>' : ''}
    </div>
  </div>`;
}
