import { useState, type MouseEvent } from "react";

export function ImageZoom({ src, alt }: { src: string; alt: string }) {
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [open, setOpen] = useState(false);

  const move = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <>
      <div
        className="relative aspect-square rounded-2xl bg-card border border-border overflow-hidden cursor-zoom-in"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onMouseMove={move}
        onClick={() => setOpen(true)}
      >
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-200"
          style={hover ? { transform: "scale(1.8)", transformOrigin: `${pos.x}% ${pos.y}%` } : undefined}
        />
      </div>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4 cursor-zoom-out animate-in fade-in"
        >
          <img src={src} alt={alt} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </>
  );
}
