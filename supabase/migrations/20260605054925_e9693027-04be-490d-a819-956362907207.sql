
DROP VIEW IF EXISTS public.reviews_public;

CREATE OR REPLACE FUNCTION public.get_product_reviews(_product_id uuid)
RETURNS TABLE (
  id uuid,
  product_id uuid,
  rating int,
  comment text,
  created_at timestamptz,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.product_id, r.rating, r.comment, r.created_at,
         COALESCE(p.full_name, 'Anonymous') AS display_name
  FROM public.reviews r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.product_id = _product_id
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_product_reviews(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid) TO anon, authenticated;
