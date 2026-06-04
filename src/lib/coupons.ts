import { supabase } from "@/integrations/supabase/client";

export type AppliedCoupon = {
  code: string;
  discount: number;
};

export async function validateCoupon(code: string, subtotal: number): Promise<{ ok: true; discount: number; coupon: any } | { ok: false; error: string }> {
  const c = code.trim().toUpperCase();
  if (!c) return { ok: false, error: "Enter a coupon code" };
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", c)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Invalid coupon code" };
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { ok: false, error: "Coupon has expired" };
  if (data.usage_limit && data.used_count >= data.usage_limit) return { ok: false, error: "Coupon usage limit reached" };
  if (subtotal < Number(data.min_order_amount)) {
    return { ok: false, error: `Minimum order ₹${data.min_order_amount} required` };
  }
  let discount =
    data.type === "percent"
      ? Math.round((subtotal * Number(data.value)) / 100)
      : Math.round(Number(data.value));
  if (data.max_discount_amount) discount = Math.min(discount, Number(data.max_discount_amount));
  discount = Math.min(discount, subtotal);
  return { ok: true, discount, coupon: data };
}

export async function incrementCouponUsage(code: string) {
  const { data } = await supabase.from("coupons").select("id,used_count").eq("code", code).maybeSingle();
  if (!data) return;
  await supabase.from("coupons").update({ used_count: (data.used_count ?? 0) + 1 }).eq("id", data.id);
}
