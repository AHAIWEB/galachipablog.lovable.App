DELETE FROM public.posts WHERE status = 'published' AND (
  LENGTH(title) < 10 AND array_length(string_to_array(trim(title), ' '), 1) < 2
) OR title ~* '^(Privacy Policy|Terms of Uses?|About Us|Contact|Know More|যোগাযোগ|শর্তাবলী)$';