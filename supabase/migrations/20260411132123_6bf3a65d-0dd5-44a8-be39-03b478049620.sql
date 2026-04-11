-- Allow anyone to submit website links (as pending status)
CREATE POLICY "Anyone can submit website links"
  ON public.website_links
  FOR INSERT
  TO public
  WITH CHECK (status = 'pending');
