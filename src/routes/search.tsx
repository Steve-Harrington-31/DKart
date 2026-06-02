import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProductCard, type Product } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: (s.q as string) || "" }),
  head: () => ({ meta: [{ title: "Search — DKart" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setTerm(q); }, [q]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    supabase
      .from("products")
      .select("id,name,price,original_price,images,rating,review_count,express_shipping")
      .ilike("name", `%${q}%`)
      .limit(40)
      .then(({ data }) => { setResults((data ?? []) as any); setLoading(false); });
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q: term.trim() } });
  };

  return (
    <AppShell hideSearch>
      <form onSubmit={submit} className="sticky top-[64px] z-30 -mt-4 bg-background py-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search for products, brands and more"
            className="w-full rounded-full bg-muted pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {term && (
            <button type="button" onClick={() => setTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {!q.trim() ? (
        <div className="py-16 text-center text-muted-foreground">Start typing to search DKart</div>
      ) : loading ? (
        <div className="py-16 text-center text-muted-foreground">Searching…</div>
      ) : results.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-semibold text-foreground">No results for "{q}"</p>
          <p className="mt-1 text-sm text-muted-foreground">Try different keywords</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{results.length} results for "{q}"</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {results.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </>
      )}
    </AppShell>
  );
}
