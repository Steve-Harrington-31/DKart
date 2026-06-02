import { ShoppingCart } from "lucide-react";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="grid place-items-center rounded-xl bg-primary text-primary-foreground font-bold shadow-sm"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
      >
        DK
      </div>
      <div className="flex items-center gap-1">
        <span className="font-bold text-lg tracking-tight text-foreground">DKart</span>
        <ShoppingCart className="h-4 w-4 text-accent" strokeWidth={2.5} />
      </div>
    </div>
  );
}
