
CREATE TABLE public.this_day_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  day INTEGER NOT NULL CHECK (day >= 1 AND day <= 31),
  year INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_this_day_month_day ON public.this_day_events (month, day);

ALTER TABLE public.this_day_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "This day events viewable by everyone"
ON public.this_day_events FOR SELECT USING (true);

CREATE POLICY "Admins can manage this day events"
ON public.this_day_events FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
