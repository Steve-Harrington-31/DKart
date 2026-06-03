-- Enable realtime on products
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- Stock decrement trigger
CREATE OR REPLACE FUNCTION public.decrement_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
     SET quantity = GREATEST(0, quantity - NEW.quantity),
         monthly_sales = COALESCE(monthly_sales, 0) + NEW.quantity,
         status = CASE WHEN GREATEST(0, quantity - NEW.quantity) = 0 THEN 'out_of_stock'::product_status ELSE status END
   WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_stock ON public.order_items;
CREATE TRIGGER trg_decrement_stock
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.decrement_product_stock();

-- Review aggregate trigger
CREATE OR REPLACE FUNCTION public.refresh_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE public.products p
     SET rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE product_id = pid), 0),
         review_count = COALESCE((SELECT COUNT(*) FROM public.reviews WHERE product_id = pid), 0)
   WHERE p.id = pid;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_aggregate ON public.reviews;
CREATE TRIGGER trg_review_aggregate
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_product_rating();