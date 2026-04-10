-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add category_id to archive_schedules for proper category hierarchy
ALTER TABLE public.archive_schedules ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id);
