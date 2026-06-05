import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ----------------------------------------------------------------------------
// Server-side cart pricing — SINGLE SOURCE OF TRUTH for any payable amount.
// Never trust client-supplied amounts.
// ----------------------------------------------------------------------------

type SupabaseCtx = { supabase: any; userId: string };

async function computeServerCartTotal(ctx: SupabaseCtx, couponCode: string | null) {
  const { data: cartRows, error: cartErr } = await ctx.supabase
    .from("cart")
    .select("quantity, product:products(id, price, status, quantity)")
    .eq("user_id", ctx.userId);
  if (cartErr) throw new Error("Could not read cart");
  if (!cartRows || cartRows.length === 0) throw new Error("Cart is empty");

  let subtotal = 0;
  for (const row of cartRows as any[]) {
    const p = row.product;
    if (!p) throw new Error("Cart contains unavailable product");
    if (p.status === "out_of_stock" || (typeof p.quantity === "number" && p.quantity < row.quantity)) {
      throw new Error("One or more items are out of stock");
    }
    subtotal += Number(p.price) * row.quantity;
  }

  let discount = 0;
  let appliedCoupon: string | null = null;
  if (couponCode) {
    const code = couponCode.trim().toUpperCase();
    const { data: c } = await ctx.supabase
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();
    if (c) {
      const expired = c.expires_at && new Date(c.expires_at).getTime() < Date.now();
      const overLimit = typeof c.usage_limit === "number" && c.used_count >= c.usage_limit;
      const meetsMin = subtotal >= Number(c.min_order_amount ?? 0);
      if (!expired && !overLimit && meetsMin) {
        if (c.type === "flat") {
          discount = Math.min(Number(c.value), subtotal);
        } else {
          discount = (subtotal * Number(c.value)) / 100;
          if (c.max_discount_amount) discount = Math.min(discount, Number(c.max_discount_amount));
        }
        appliedCoupon = c.code;
      }
    }
  }

  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  return { subtotal, discount, total, appliedCoupon };
}

// ----------------------------------------------------------------------------
// Create Razorpay order — amount is computed server-side, not accepted from client
// ----------------------------------------------------------------------------

const CreateOrderInput = z.object({
  coupon_code: z.string().trim().max(64).nullable().optional(),
});

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateOrderInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return { error: "Razorpay not configured", keyId: null, order: null, amount: 0 };
    }

    let pricing;
    try {
      pricing = await computeServerCartTotal(context as SupabaseCtx, data.coupon_code ?? null);
    } catch (e: any) {
      return { error: e.message || "Invalid cart", keyId: null, order: null, amount: 0 };
    }
    if (pricing.total <= 0) {
      return { error: "Order total must be greater than zero", keyId: null, order: null, amount: 0 };
    }

    const amountPaise = Math.round(pricing.total * 100);
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `dk_${context.userId.slice(0, 8)}_${Date.now()}`,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Razorpay order failed:", res.status, text);
      return { error: `Razorpay error: ${res.status}`, keyId: null, order: null, amount: 0 };
    }
    const order = await res.json();
    return { error: null, keyId, order, amount: amountPaise };
  });

// ----------------------------------------------------------------------------
// Verify + place order in one server-side transaction-ish flow
// ----------------------------------------------------------------------------

const PlaceOrderInput = z.object({
  address_id: z.string().uuid(),
  coupon_code: z.string().trim().max(64).nullable().optional(),
  payment_method: z.enum(["razorpay", "cod"]),
  razorpay_order_id: z.string().min(1).max(64).optional(),
  razorpay_payment_id: z.string().min(1).max(64).optional(),
  razorpay_signature: z.string().min(1).max(256).optional(),
});

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => PlaceOrderInput.parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as SupabaseCtx;

    // Re-read cart + recompute pricing server-side
    const { data: cartRows, error: cartErr } = await ctx.supabase
      .from("cart")
      .select("quantity, product:products(id, name, price, images)")
      .eq("user_id", ctx.userId);
    if (cartErr || !cartRows || cartRows.length === 0) {
      return { error: "Cart is empty", orderId: null as string | null };
    }
    const pricing = await computeServerCartTotal(ctx, data.coupon_code ?? null);
    if (pricing.total <= 0) {
      return { error: "Order total must be greater than zero", orderId: null };
    }

    // Address must belong to the user
    const { data: address, error: addrErr } = await ctx.supabase
      .from("addresses")
      .select("*")
      .eq("id", data.address_id)
      .eq("user_id", ctx.userId)
      .single();
    if (addrErr || !address) return { error: "Address not found", orderId: null };

    let paymentId = `cod_${Date.now()}`;
    let paymentStatus: "paid" | "pending" = "pending";
    let orderStatus: "pending" | "processing" = "pending";

    if (data.payment_method === "razorpay") {
      if (!data.razorpay_order_id || !data.razorpay_payment_id || !data.razorpay_signature) {
        return { error: "Missing Razorpay payment proof", orderId: null };
      }
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) return { error: "Razorpay not configured", orderId: null };

      // 1. Timing-safe HMAC signature verification
      const { createHmac, timingSafeEqual } = await import("crypto");
      const expectedHex = createHmac("sha256", keySecret)
        .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
        .digest("hex");
      const expectedBuf = Buffer.from(expectedHex, "hex");
      let providedBuf: Buffer;
      try {
        providedBuf = Buffer.from(data.razorpay_signature, "hex");
      } catch {
        return { error: "Invalid signature", orderId: null };
      }
      if (
        expectedBuf.length !== providedBuf.length ||
        !timingSafeEqual(expectedBuf, providedBuf)
      ) {
        return { error: "Invalid signature", orderId: null };
      }

      // 2. Re-fetch the Razorpay order and assert amount matches server-computed total
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rRes = await fetch(`https://api.razorpay.com/v1/orders/${data.razorpay_order_id}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!rRes.ok) return { error: "Could not verify Razorpay order", orderId: null };
      const rOrder = await rRes.json();
      const expectedPaise = Math.round(pricing.total * 100);
      if (Number(rOrder.amount) !== expectedPaise || rOrder.currency !== "INR") {
        return { error: "Payment amount mismatch", orderId: null };
      }

      // 3. Confirm the payment was actually captured/authorized
      const pRes = await fetch(`https://api.razorpay.com/v1/payments/${data.razorpay_payment_id}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!pRes.ok) return { error: "Could not verify payment", orderId: null };
      const payment = await pRes.json();
      if (
        payment.order_id !== data.razorpay_order_id ||
        Number(payment.amount) !== expectedPaise ||
        !["captured", "authorized"].includes(payment.status)
      ) {
        return { error: "Payment not successful", orderId: null };
      }

      paymentId = data.razorpay_payment_id;
      paymentStatus = "paid";
      orderStatus = "processing";
    }

    // Insert order using authenticated supabase (RLS scoped to user)
    const { data: order, error: orderErr } = await ctx.supabase
      .from("orders")
      .insert({
        user_id: ctx.userId,
        total_amount: pricing.total,
        shipping_address: address,
        payment_id: paymentId,
        payment_status: paymentStatus,
        status: orderStatus,
        coupon_code: pricing.appliedCoupon,
        discount_amount: pricing.discount,
      })
      .select()
      .single();
    if (orderErr || !order) return { error: "Could not create order", orderId: null };

    const orderItems = (cartRows as any[]).map((row) => ({
      order_id: order.id,
      product_id: row.product.id,
      product_name: row.product.name,
      product_image: row.product.images?.[0] ?? null,
      price: row.product.price,
      quantity: row.quantity,
    }));
    await ctx.supabase.from("order_items").insert(orderItems);

    if (pricing.appliedCoupon) {
      const { data: c } = await ctx.supabase
        .from("coupons")
        .select("used_count")
        .eq("code", pricing.appliedCoupon)
        .maybeSingle();
      if (c) {
        await ctx.supabase
          .from("coupons")
          .update({ used_count: (c.used_count ?? 0) + 1 })
          .eq("code", pricing.appliedCoupon);
      }
    }

    await ctx.supabase.from("cart").delete().eq("user_id", ctx.userId);

    return {
      error: null,
      orderId: order.id as string,
      total: pricing.total,
      discount: pricing.discount,
      appliedCoupon: pricing.appliedCoupon,
    };
  });
