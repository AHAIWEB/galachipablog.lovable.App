
-- Create archived contents table
CREATE TABLE public.archived_contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT,
  excerpt TEXT,
  featured_image TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  source_name TEXT,
  status TEXT NOT NULL DEFAULT 'fetched',
  ai_summary TEXT,
  ai_tags TEXT[] DEFAULT '{}',
  schedule_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.archived_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage archived contents"
ON public.archived_contents FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_archived_contents_status ON public.archived_contents(status);
CREATE INDEX idx_archived_contents_category ON public.archived_contents(category);
CREATE INDEX idx_archived_contents_source_url ON public.archived_contents(source_url);

-- Create archive schedules table
CREATE TABLE public.archive_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  scrape_type TEXT NOT NULL DEFAULT 'single',
  interval_hours INTEGER NOT NULL DEFAULT 24,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.archive_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage archive schedules"
ON public.archive_schedules FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add foreign key from archived_contents to archive_schedules
ALTER TABLE public.archived_contents
ADD CONSTRAINT archived_contents_schedule_id_fkey
FOREIGN KEY (schedule_id) REFERENCES public.archive_schedules(id) ON DELETE SET NULL;

-- Triggers for updated_at
CREATE TRIGGER update_archived_contents_updated_at
BEFORE UPDATE ON public.archived_contents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_archive_schedules_updated_at
BEFORE UPDATE ON public.archive_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
