import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listReadyBoxes } from "@/lib/public-catalog";

export const Route = createFileRoute("/gift-boxes")({ component: GiftBoxesPage });

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function GiftBoxesPage() {
  const { data: boxes, isLoading } = useQuery({ queryKey: ["ready-boxes", "all"], queryFn: listReadyBoxes });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-maroon">Ready-made Gift Boxes</h1>
        <Link to="/gift-box" className="text-sm text-maroon hover:underline">Prefer to build your own? →</Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      )}

      {!isLoading && boxes?.length === 0 && (
        <div className="text-center py-20 text-gray-500">No gift boxes published yet — check back soon.</div>
      )}

      {!isLoading && boxes && boxes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {boxes.map((b) => (
            <Link key={b.id} to="/box/$slug" params={{ slug: b.slug }} className="group rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition">
              <div className="aspect-square bg-gray-50">
                {Array.isArray(b.images) && b.images[0] ? (
                  <img src={b.images[0] as string} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">No image</div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm text-gray-800 line-clamp-2">{b.name}</p>
                <p className="font-semibold text-maroon mt-1">{formatINR(b.price_paise)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
