-- Allow everyone to view all memorials on the Memorial Wall
CREATE POLICY "Anyone can view all memorials"
ON public.memorials
FOR SELECT
USING (true);