-- Delete older duplicates, keep newest per source_url
DELETE FROM public.archived_contents a
USING public.archived_contents b
WHERE a.source_url = b.source_url
  AND a.created_at < b.created_at;

-- Now add unique index
CREATE UNIQUE INDEX IF NOT EXISTS archived_contents_source_url_key
  ON public.archived_contents (source_url);