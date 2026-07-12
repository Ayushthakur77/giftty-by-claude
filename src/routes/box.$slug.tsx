import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getReadyBoxBySlug } from "@/lib/public-catalog";
import { useCartStore } from "@/lib/cart-store";

export const Route = createFileRoute("/box/$slug")({ component: BoxDetailPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function BoxDetailPage() {
  const { slug } = Route.useParams();
  const addLine = useCartStore((s) => s.addLine);

  const { data: box, isLoading } = useQuery({
    queryKey: ["ready-box", slug],
    queryFn: () => getReadyBoxBySlug(slug),
  });

  if (isLoading) return <div className="max-w-7xl mx-auto px-4 py-12">Loading…</div>;

  if (!box) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">This gift box is no longer available.</p>
        <Link to="/gift-boxes" className="text-maroon hover:underline mt-2 inline-block">Back to gift boxes</Link>
      </div>
    );
  }

  const images: string[] = Array.isArray(box.images) ? (box.images as string[]) : [];
  const items = (box.ready_gift_box_items ?? []) as Array<{ quantity: number; products: { name: string; images: unknown } | null }>;
  const outOfStock = box.stock <= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-10">
      <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden">
        {images[0] ? <img src={images[0]} alt={box.name} className="w-full h-full object-cover" /> : null}
      </div>
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">{box.name}</h1>
        <p className="text-gray-500 mt-1">{box.description}</p>
        <p className="text-2xl font-bold text-maroon mt-4">{formatINR(box.price_paise)}</p>

        {items.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <h2 className="font-medium text-gray-900 mb-2">What's inside</h2>
            <ul className="text-sm text-gray-600 space-y-1">
              {items.map((it, i) => (
                <li key={i}>• {it.products?.name} × {it.quantity}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          disabled={outOfStock}
          onClick={() => addLine({ type: "ready_box", readyBoxId: box.id, quantity: 1 })}
          className="mt-8 w-full bg-maroon text-white rounded-lg py-3 font-medium hover:bg-maroon-dark disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {outOfStock ? "Out of stock" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
