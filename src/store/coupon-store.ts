import { create } from "zustand";
import type { AppliedCoupon } from "@/lib/coupons";

type State = {
  coupon: AppliedCoupon | null;
  apply: (c: AppliedCoupon) => void;
  clear: () => void;
};

export const useCoupon = create<State>((set) => ({
  coupon: null,
  apply: (c) => set({ coupon: c }),
  clear: () => set({ coupon: null }),
}));
