
DROP POLICY IF EXISTS "Anon can read reviews via view" ON public.reviews;
DROP POLICY IF EXISTS "reviews_public_read" ON public.reviews;

REVOKE SELECT ON public.reviews FROM anon;

ALTER VIEW public.reviews_public SET (security_invoker = false);

GRANT SELECT ON public.reviews_public TO anon, authenticated;
