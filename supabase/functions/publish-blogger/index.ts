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

    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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

    const { title, content, blog_id, labels } = await req.json();
    
    if (!title || !content) {
      return new Response(JSON.stringify({ error: 'title and content are required' }), { status: 400, headers: corsHeaders });
    }

    const bloggerApiKey = Deno.env.get('BLOGGER_API_KEY');
    const bloggerBlogId = blog_id || Deno.env.get('BLOGGER_BLOG_ID');
    
    if (!bloggerApiKey) {
      return new Response(
        JSON.stringify({ error: 'BLOGGER_API_KEY secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bloggerBlogId) {
      return new Response(
        JSON.stringify({ error: 'Blog ID is required. Set BLOGGER_BLOG_ID secret or pass blog_id.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Publish to Blogger using REST API
    const bloggerResponse = await fetch(
      `https://www.googleapis.com/blogger/v3/blogs/${bloggerBlogId}/posts/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bloggerApiKey}`,
        },
        body: JSON.stringify({
          kind: 'blogger#post',
          blog: { id: bloggerBlogId },
          title,
          content,
          labels: labels || [],
        }),
      }
    );

    if (!bloggerResponse.ok) {
      const errText = await bloggerResponse.text();
      return new Response(
        JSON.stringify({ error: `Blogger API error: ${bloggerResponse.status}`, details: errText }),
        { status: bloggerResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bloggerData = await bloggerResponse.json();

    return new Response(
      JSON.stringify({ success: true, post_url: bloggerData.url, post_id: bloggerData.id }),
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
