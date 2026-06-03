import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateOrderInput = z.object({
  amount: z.number().int().positive().max(100_000_00), // paise, max 1 lakh INR
});

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateOrderInput.parse(input))
  .handler(async ({ data, context }) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return { error: "Razorpay not configured", keyId: null, order: null };
    }
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: data.amount,
        currency: "INR",
        receipt: `dk_${context.userId.slice(0, 8)}_${Date.now()}`,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Razorpay order failed:", res.status, text);
      return { error: `Razorpay error: ${res.status}`, keyId: null, order: null };
    }
    const order = await res.json();
    return { error: null, keyId, order };
  });

const VerifyInput = z.object({
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => VerifyInput.parse(input))
  .handler(async ({ data }) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return { valid: false, error: "Razorpay not configured" };
    const { createHmac } = await import("crypto");
    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");
    const valid = expected === data.razorpay_signature;
    return { valid, error: valid ? null : "Invalid signature" };
  });
