-- Fix swapped name/url in feed_sources
UPDATE public.feed_sources 
SET name = 'আজকের পরিবর্তন', url = 'https://ajkerparibartan.com/category/patuakhali-news'
WHERE id = '950d7aae-ee1a-47ef-bc8c-6ee9a8a9a245';

UPDATE public.feed_sources 
SET name = 'ভ্রমণ', url = 'https://www.prothomalo.com/lifestyle/travel'
WHERE id = '20f45cf5-a42d-4b65-b555-afb98b9557e6';
