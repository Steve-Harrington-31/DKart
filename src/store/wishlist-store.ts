import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

type Item = {
  id: string;
  product_id: string;
  product: {
    id: string;
    name: string;
    price: number;
    original_price: number | null;
    images: string[];
    rating: number;
  };
};

type State = {
  items: Item[];
  load: (userId: string) => Promise<void>;
  toggle: (userId: string, productId: string) => Promise<void>;
  has: (productId: string) => boolean;
  remove: (id: string) => Promise<void>;
};

export const useWishlist = create<State>((set, get) => ({
  items: [],
  load: async (userId) => {
    const { data } = await supabase
      .from("wishlist")
      .select("id, product_id, product:products(id,name,price,original_price,images,rating)")
      .eq("user_id", userId);
    set({ items: (data ?? []) as any });
  },
  toggle: async (userId, productId) => {
    const existing = get().items.find((i) => i.product_id === productId);
    if (existing) return get().remove(existing.id);
    const { data } = await supabase
      .from("wishlist")
      .insert({ user_id: userId, product_id: productId })
      .select("id, product_id, product:products(id,name,price,original_price,images,rating)")
      .single();
    if (data) set({ items: [...get().items, data as any] });
  },
  has: (productId) => get().items.some((i) => i.product_id === productId),
  remove: async (id) => {
    await supabase.from("wishlist").delete().eq("id", id);
    set({ items: get().items.filter((i) => i.id !== id) });
  },
}));
