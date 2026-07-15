import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { useSession } from "@/lib/use-session";
import { Star } from "lucide-react";

export function ProductReviews({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: myReview } = useQuery({
    queryKey: ["my-review", productId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  async function handleSubmit() {
    if (!user || rating === 0) {
      setSubmitError("Please select a rating");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    const { error } = await supabase.from("reviews").insert({
      product_id: productId,
      user_id: user.id,
      rating,
      title: title || null,
      body: body || null,
      status: "pending",
    });

    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setSubmitted(true);
    queryClient.invalidateQueries({ queryKey: ["my-review", productId, user.id] });
  }

  return (
    <div className="mt-10 border-t border-gray-100 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-medium text-gray-900">Reviews</h2>
        {reviews && reviews.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Star className="w-4 h-4 fill-gold text-gold" />
            {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
          </div>
        )}
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading reviews…</p>}
      {!isLoading && reviews?.length === 0 && <p className="text-gray-400 text-sm mb-6">No reviews yet — be the first!</p>}

      {!isLoading && reviews && reviews.length > 0 && (
        <div className="space-y-4 mb-8">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-gray-50 pb-4">
              <div className="flex items-center gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-gold text-gold" : "text-gray-200"}`} />
                ))}
              </div>
              {r.title && <p className="text-sm font-medium text-gray-900">{r.title}</p>}
              {r.body && <p className="text-sm text-gray-600 mt-1">{r.body}</p>}
              <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString("en-IN")}</p>
            </div>
          ))}
        </div>
      )}

      {!user && (
        <p className="text-sm text-gray-400">Sign in to write a review.</p>
      )}

      {user && myReview && (
        <p className="text-sm text-gray-500">
          You already reviewed this product {myReview.status === "pending" ? "(pending approval)" : `(${myReview.status})`}.
        </p>
      )}

      {user && !myReview && !submitted && (
        <div className="border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-900 mb-2">Write a review</p>
          <div className="flex gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} onClick={() => setRating(i + 1)}>
                <Star className={`w-6 h-6 ${i < rating ? "fill-gold text-gold" : "text-gray-200"}`} />
              </button>
            ))}
          </div>
          <input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
          />
          <textarea
            placeholder="Share your experience…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
          />
          {submitError && <p className="text-red-600 text-sm mb-2">{submitError}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-maroon text-white px-4 py-2 rounded-lg text-sm hover:bg-maroon-dark disabled:opacity-40 transition"
          >
            {submitting ? "Submitting…" : "Submit review"}
          </button>
        </div>
      )}

      {submitted && (
        <p className="text-sm text-green-600">Thanks! Your review will appear after it's approved.</p>
      )}
    </div>
  );
}
