
CREATE TYPE public.coupon_type AS ENUM ('flat', 'percent');

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type public.coupon_type NOT NULL DEFAULT 'percent',
  value numeric NOT NULL CHECK (value > 0),
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_discount_amount numeric,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active coupons" ON public.coupons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;
