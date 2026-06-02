import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    original_price: number | null;
    images: string[];
    quantity: number;
  };
};

type CartState = {
  items: CartItem[];
  loading: boolean;
  load: (userId: string) => Promise<void>;
  add: (userId: string, productId: string, qty?: number) => Promise<void>;
  updateQty: (id: string, qty: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: (userId: string) => Promise<void>;
  total: () => number;
  count: () => number;
};

export const useCart = create<CartState>((set, get) => ({
  items: [],
  loading: false,
  load: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from("cart")
      .select("id, product_id, quantity, product:products(id,name,price,original_price,images,quantity)")
      .eq("user_id", userId);
    set({ items: (data ?? []) as any, loading: false });
  },
  add: async (userId, productId, qty = 1) => {
    const existing = get().items.find((i) => i.product_id === productId);
    if (existing) {
      await get().updateQty(existing.id, existing.quantity + qty);
      return;
    }
    const { data } = await supabase
      .from("cart")
      .insert({ user_id: userId, product_id: productId, quantity: qty })
      .select("id, product_id, quantity, product:products(id,name,price,original_price,images,quantity)")
      .single();
    if (data) set({ items: [...get().items, data as any] });
  },
  updateQty: async (id, qty) => {
    if (qty < 1) return get().remove(id);
    await supabase.from("cart").update({ quantity: qty }).eq("id", id);
    set({ items: get().items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)) });
  },
  remove: async (id) => {
    await supabase.from("cart").delete().eq("id", id);
    set({ items: get().items.filter((i) => i.id !== id) });
  },
  clear: async (userId) => {
    await supabase.from("cart").delete().eq("user_id", userId);
    set({ items: [] });
  },
  total: () => get().items.reduce((s, i) => s + i.quantity * i.product.price, 0),
  count: () => get().items.reduce((s, i) => s + i.quantity, 0),
}));
