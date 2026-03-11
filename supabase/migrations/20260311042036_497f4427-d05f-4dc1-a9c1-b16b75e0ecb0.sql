
-- Allow anyone to read limited lead data for map and friend rankings
CREATE POLICY "Anyone can read leads for map and rankings"
ON public.leads
FOR SELECT
TO anon, authenticated
USING (true);
