import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ----------------------------------------------------------------------------
// Defense-in-depth: every admin mutation goes through a server fn that
// re-checks `has_role(auth.uid(), 'admin')` server-side. RLS is the primary
// gate; this is a second, explicit barrier.
// ----------------------------------------------------------------------------

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden: admin role required");
}

async function logAudit(
  ctx: { supabase: any; userId: string },
  entity: string,
  action: string,
  entity_id: string | null,
  details: Record<string, any> = {},
) {
  try {
    await ctx.supabase.from("admin_audit_log").insert({
      actor_id: ctx.userId,
      entity,
      action,
      entity_id,
      details,
    });
  } catch {
    // Never block the mutation on audit failure
  }
}


// ---------- Users / roles ----------

const ToggleAdminInput = z.object({
  user_id: z.string().uuid(),
  make_admin: z.boolean(),
});

export const adminToggleUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ToggleAdminInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const ctx = context as any;
    if (data.make_admin) {
      const { error } = await ctx.supabase
        .from("user_roles")
        .insert({ user_id: data.user_id, role: "admin" });
      if (error && !/duplicate/i.test(error.message)) {
        return { error: error.message };
      }
      await logAudit(ctx, "user_role", "grant_admin", data.user_id, { role: "admin" });
    } else {
      if (data.user_id === ctx.userId) {
        return { error: "You cannot revoke your own admin role" };
      }
      const { error } = await ctx.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", "admin");
      if (error) return { error: error.message };
      await logAudit(ctx, "user_role", "revoke_admin", data.user_id, { role: "admin" });
    }
    return { error: null };
  });

// ---------- Products ----------

const ProductPayload = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).default(""),
  price: z.number().nonnegative().max(10_000_000),
  original_price: z.number().nonnegative().max(10_000_000).nullable(),
  category_id: z.string().uuid().nullable(),
  images: z.array(z.string().url().max(2000)).max(20),
  quantity: z.number().int().nonnegative().max(1_000_000),
  express_shipping: z.boolean(),
  status: z.enum(["available", "low_stock", "out_of_stock"]),
});

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ id: z.string().uuid().optional(), data: ProductPayload }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const ctx = context as any;
    if (data.id) {
      const { error } = await ctx.supabase.from("products").update(data.data).eq("id", data.id);
      if (error) return { error: error.message, id: null };
      await logAudit(ctx, "product", "update", data.id, { name: data.data.name, price: data.data.price });
      return { error: null, id: data.id };
    }
    const reference_id = "DK" + Math.random().toString(36).slice(2, 10).toUpperCase();
    const { data: row, error } = await ctx.supabase
      .from("products")
      .insert({ ...data.data, reference_id })
      .select("id")
      .single();
    if (error || !row) return { error: error?.message ?? "Insert failed", id: null };
    await logAudit(ctx, "product", "create", row.id, { name: data.data.name, reference_id });
    return { error: null, id: row.id as string };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const ctx = context as any;
    const { data: prev } = await ctx.supabase.from("products").select("name").eq("id", data.id).maybeSingle();
    const { error } = await ctx.supabase.from("products").delete().eq("id", data.id);
    if (error) return { error: error.message };
    await logAudit(ctx, "product", "delete", data.id, { name: prev?.name ?? null });
    return { error: null };
  });

// ---------- Categories ----------

const CategoryPayload = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/),
  image_url: z.string().trim().max(2000).optional().default(""),
});

export const adminUpsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ id: z.string().uuid().optional(), data: CategoryPayload }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const ctx = context as any;
    if (data.id) {
      const { error } = await ctx.supabase.from("categories").update(data.data).eq("id", data.id);
      if (error) return { error: error.message };
      await logAudit(ctx, "category", "update", data.id, { name: data.data.name, slug: data.data.slug });
      return { error: null };
    }
    const { data: row, error } = await ctx.supabase.from("categories").insert(data.data).select("id").single();
    if (error) return { error: error.message };
    await logAudit(ctx, "category", "create", row?.id ?? null, { name: data.data.name, slug: data.data.slug });
    return { error: null };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const ctx = context as any;
    const { data: prev } = await ctx.supabase.from("categories").select("name,slug").eq("id", data.id).maybeSingle();
    const { error } = await ctx.supabase.from("categories").delete().eq("id", data.id);
    if (error) return { error: error.message };
    await logAudit(ctx, "category", "delete", data.id, { name: prev?.name ?? null, slug: prev?.slug ?? null });
    return { error: null };
  });

// ---------- Coupons ----------

const CouponPayload = z.object({
  code: z.string().trim().min(1).max(64).regex(/^[A-Z0-9_-]+$/),
  type: z.enum(["flat", "percent"]),
  value: z.number().nonnegative().max(1_000_000),
  min_order_amount: z.number().nonnegative().max(10_000_000).default(0),
  max_discount_amount: z.number().nonnegative().max(10_000_000).nullable(),
  usage_limit: z.number().int().positive().max(10_000_000).nullable(),
  expires_at: z.string().min(1).nullable(),
  is_active: z.boolean(),
});

export const adminUpsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ id: z.string().uuid().optional(), data: CouponPayload }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const ctx = context as any;
    if (data.id) {
      const { error } = await ctx.supabase.from("coupons").update(data.data).eq("id", data.id);
      if (error) return { error: error.message };
      await logAudit(ctx, "coupon", "update", data.id, { code: data.data.code, type: data.data.type, value: data.data.value });
      return { error: null };
    }
    const { data: row, error } = await ctx.supabase.from("coupons").insert(data.data).select("id").single();
    if (error) return { error: error.message };
    await logAudit(ctx, "coupon", "create", row?.id ?? null, { code: data.data.code, type: data.data.type, value: data.data.value });
    return { error: null };
  });

export const adminToggleCouponActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const ctx = context as any;
    const { error } = await ctx.supabase
      .from("coupons")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) return { error: error.message };
    await logAudit(ctx, "coupon", data.is_active ? "activate" : "deactivate", data.id, {});
    return { error: null };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const ctx = context as any;
    const { data: prev } = await ctx.supabase.from("coupons").select("code").eq("id", data.id).maybeSingle();
    const { error } = await ctx.supabase.from("coupons").delete().eq("id", data.id);
    if (error) return { error: error.message };
    await logAudit(ctx, "coupon", "delete", data.id, { code: prev?.code ?? null });
    return { error: null };
  });

// ---------- Orders ----------

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        order_id: z.string().uuid(),
        status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const ctx = context as any;
    const { data: prev } = await ctx.supabase.from("orders").select("status").eq("id", data.order_id).maybeSingle();
    const { error } = await ctx.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.order_id);
    if (error) return { error: error.message };
    await logAudit(ctx, "order", "status_change", data.order_id, { from: prev?.status ?? null, to: data.status });
    return { error: null };
  });

