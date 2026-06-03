import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name?: string;
};

export function Reviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id,user_id,rating,comment,created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (!data) return;
    const ids = [...new Set(data.map((r) => r.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id,full_name").in("id", ids);
    const map = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);
    setReviews(data.map((r) => ({ ...r, user_name: map.get(r.user_id) ?? "Anonymous" })));
  };

  useEffect(() => { load(); }, [productId]);

  const myReview = user ? reviews.find((r) => r.user_id === user.id) : null;

  const submit = async () => {
    if (!user) return toast.error("Please login to review");
    setLoading(true);
    const { error } = await supabase
      .from("reviews")
      .upsert({ product_id: productId, user_id: user.id, rating, comment: comment.trim() || null }, { onConflict: "product_id,user_id" });
    setLoading(false);
    if (error) {
      // Fallback if no unique constraint: delete then insert
      if (myReview) {
        await supabase.from("reviews").delete().eq("id", myReview.id);
      }
      const { error: e2 } = await supabase.from("reviews").insert({ product_id: productId, user_id: user.id, rating, comment: comment.trim() || null });
      if (e2) return toast.error(e2.message);
    }
    toast.success("Thanks for your review!");
    setComment("");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("reviews").delete().eq("id", id);
    load();
  };

  return (
    <section className="mt-8">
      <h3 className="font-bold text-foreground mb-3">Customer Reviews ({reviews.length})</h3>

      {user && (
        <div className="rounded-xl border border-border bg-card p-4 mb-4">
          <p className="text-sm font-medium text-foreground mb-2">{myReview ? "Update your review" : "Write a review"}</p>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} type="button">
                <Star className={`h-6 w-6 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={myReview?.comment ?? "Share your experience with this product…"}
            rows={3}
            className="w-full rounded-lg border border-border bg-background p-2 text-sm"
          />
          <button onClick={submit} disabled={loading}
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {loading ? "Saving…" : myReview ? "Update Review" : "Submit Review"}
          </button>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share your thoughts!</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.user_name}</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`} />
                    ))}
                    <span className="ml-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {user?.id === r.user_id && (
                  <button onClick={() => remove(r.id)} className="text-xs text-destructive hover:underline">Delete</button>
                )}
              </div>
              {r.comment && <p className="mt-2 text-sm text-foreground">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
