import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getProductBySlug } from "@/lib/public-catalog";
import { useCartStore } from "@/lib/cart-store";

export const Route = createFileRoute("/p/$slug")({
  component: ProductPage,
});

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function ProductPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const addLine = useCartStore((s) => s.addLine);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [personalizationName, setPersonalizationName] = useState("");
  const [personalizationMessage, setPersonalizationMessage] = useState("");

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug(slug),
  });

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-12">Loading…</div>;
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">This product is no longer available.</p>
        <Link to="/" className="text-maroon hover:underline mt-2 inline-block">
          Back to homepage
        </Link>
      </div>
    );
  }

  const images: string[] = Array.isArray(product.images) ? (product.images as string[]) : [];
  const variants = (product.product_variants ?? []) as Array<{
    id: string;
    variant_type: string;
    value: string;
    extra_price_paise: number;
    stock: number;
  }>;
  const personalizationOptions =
    (product.personalization_options as Record<
      string,
      { enabled: boolean; maxLength?: number; extraPaise?: number }
    >) ?? {};

  const outOfStock = product.stock <= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-10">
      <div>
        <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden">
          {images[0] ? (
            <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              No image
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 mt-3">
            {images.slice(1, 5).map((img, i) => (
              <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50">
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">{product.name}</h1>
        <p className="text-gray-500 mt-1">{product.short_description}</p>

        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-2xl font-bold text-maroon">{formatINR(product.price_paise)}</span>
          {product.compare_at_price_paise && product.compare_at_price_paise > product.price_paise && (
            <span className="text-gray-400 line-through">
              {formatINR(product.compare_at_price_paise)}
            </span>
          )}
        </div>

        {variants.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {variants[0]?.variant_type === "size" ? "Size" : "Color"}
            </p>
            <div className="flex gap-2 flex-wrap">
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v.id)}
                  disabled={v.stock <= 0}
                  className={`px-4 py-2 rounded-lg border text-sm transition ${
                    selectedVariant === v.id
                      ? "border-maroon bg-maroon text-white"
                      : "border-gray-300 hover:border-maroon"
                  } ${v.stock <= 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {v.value}
                </button>
              ))}
            </div>
          </div>
        )}

        {personalizationOptions.name?.enabled && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personalize with a name
              {(personalizationOptions.name.extraPaise ?? 0) > 0 &&
                ` (+${formatINR(personalizationOptions.name.extraPaise!)})`}
            </label>
            <input
              type="text"
              value={personalizationName}
              onChange={(e) => setPersonalizationName(e.target.value)}
              maxLength={personalizationOptions.name.maxLength ?? 30}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="e.g. Priya"
            />
          </div>
        )}

        {personalizationOptions.message?.enabled && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add a message
              {(personalizationOptions.message.extraPaise ?? 0) > 0 &&
                ` (+${formatINR(personalizationOptions.message.extraPaise!)})`}
            </label>
            <textarea
              value={personalizationMessage}
              onChange={(e) => setPersonalizationMessage(e.target.value)}
              maxLength={personalizationOptions.message.maxLength ?? 200}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Write your gift message…"
            />
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <button
            disabled={outOfStock}
            onClick={() =>
              addLine({
                type: "product",
                productId: product.id,
                variantId: selectedVariant ?? undefined,
                quantity: 1,
                personalization: {
                  name: personalizationName || undefined,
                  message: personalizationMessage || undefined,
                },
              })
            }
            className="flex-1 bg-maroon text-white rounded-lg py-3 font-medium hover:bg-maroon-dark disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {outOfStock ? "Out of stock" : "Add to Cart"}
          </button>
          <button
            disabled={outOfStock}
            onClick={() => {
              addLine({
                type: "product",
                productId: product.id,
                variantId: selectedVariant ?? undefined,
                quantity: 1,
                personalization: {
                  name: personalizationName || undefined,
                  message: personalizationMessage || undefined,
                },
              });
              navigate({ to: "/cart" });
            }}
            className="flex-1 border border-maroon text-maroon rounded-lg py-3 font-medium hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Buy Now
          </button>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6">
          <h2 className="font-medium text-gray-900 mb-2">Description</h2>
          <p className="text-gray-600 text-sm whitespace-pre-line">{product.long_description}</p>
        </div>
      </div>
    </div>
  );
}
