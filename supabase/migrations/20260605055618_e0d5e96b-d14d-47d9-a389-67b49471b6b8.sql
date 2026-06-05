
DROP POLICY IF EXISTS "Authenticated can read reviews" ON public.reviews;

CREATE POLICY "reviews_owner_select"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
