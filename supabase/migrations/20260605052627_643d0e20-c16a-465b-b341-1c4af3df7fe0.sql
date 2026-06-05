
-- Fix 1: PRIVILEGE_ESCALATION_RISK — explicit admin-only UPDATE policy on user_roles
CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix 2: EXPOSED_SENSITIVE_DATA — restrict reviews SELECT to authenticated only,
-- and expose a sanitized public view (no user_id) for anon listings.
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Public can read reviews" ON public.reviews;

CREATE POLICY "Authenticated can read reviews" ON public.reviews
  FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE VIEW public.reviews_public
WITH (security_invoker = true) AS
SELECT
  r.id,
  r.product_id,
  r.rating,
  r.comment,
  r.created_at,
  COALESCE(p.full_name, 'Anonymous') AS display_name
FROM public.reviews r
LEFT JOIN public.profiles p ON p.id = r.user_id;

-- The view is security_invoker, so it respects the underlying policies of caller.
-- Add an anon-friendly policy that only exposes non-identifying columns indirectly:
CREATE POLICY "Anon can read reviews via view" ON public.reviews
  FOR SELECT TO anon
  USING (true);

-- But the view above strips user_id from output. To prevent anon from selecting user_id directly,
-- revoke column SELECT on user_id from anon (column-level grant).
REVOKE SELECT ON public.reviews FROM anon;
GRANT SELECT (id, product_id, rating, comment, created_at) ON public.reviews TO anon;
GRANT SELECT ON public.reviews_public TO anon, authenticated;

-- Fix 3: REALTIME_MISSING_AUTHORIZATION — scope realtime subscriptions to product-* topics for authenticated users only
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='realtime' AND tablename='messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can subscribe to product channels" ON realtime.messages';
    EXECUTE $POL$
      CREATE POLICY "Authenticated can subscribe to product channels" ON realtime.messages
        FOR SELECT TO authenticated
        USING ((realtime.topic()) LIKE 'product-%' OR (realtime.topic()) LIKE 'realtime:public:products%')
    $POL$;
  END IF;
END $$;
