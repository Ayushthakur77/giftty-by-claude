import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Cake, Heart, Users, ListChecks } from "lucide-react";
import { listMomentTemplates } from "@/lib/moments-catalog";

export const Route = createFileRoute("/moments")({ component: MomentsGallery });

const CATEGORY_ICON: Record<string, React.ElementType> = {
  birthday: Cake,
  romantic: Heart,
  friendship: Users,
};

function MomentsGallery() {
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ["moments-templates"],
    queryFn: listMomentTemplates,
  });

  return (
    <div className="bg-[#f1f3f6] min-h-screen">
      <section className="bg-gradient-to-br from-maroon to-maroon-dark text-center px-4 py-14">
        <Sparkles className="w-8 h-8 text-gold mx-auto mb-3" />
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-3">Giftty Moments</h1>
        <p className="text-cream/90 max-w-xl mx-auto text-sm md:text-base">
          Create a beautiful surprise page in under 5 minutes — free, no design skills needed.
          Share it on WhatsApp or Instagram and make someone's day.
        </p>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-bold text-gray-900">Choose a template</h2>
          <Link to="/moments/mine" className="flex items-center gap-1 text-xs font-semibold text-maroon hover:underline">
            <ListChecks className="w-3.5 h-3.5" /> My Pages
          </Link>
        </div>
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-lg bg-gray-200 animate-pulse" />
            ))}
          </div>
        )}

        {error && <p className="text-red-500 text-sm text-center">Could not load templates — please refresh the page.</p>}

        {!isLoading && templates && templates.length === 0 && (
          <p className="text-gray-400 text-sm text-center">No templates available yet — check back soon.</p>
        )}

        {!isLoading && templates && templates.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {templates.map((t) => {
              const Icon = CATEGORY_ICON[t.category] ?? Sparkles;
              return (
                <Link
                  key={t.id}
                  to="/moments/create/$templateSlug"
                  params={{ templateSlug: t.slug }}
                  className="group rounded-lg overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition"
                >
                  <div
                    className="aspect-[4/3] flex items-center justify-center"
                    style={{ background: `linear-gradient(160deg, ${t.default_theme_color}, #1a0a12)` }}
                  >
                    <Icon className="w-10 h-10 text-white/90" />
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-gray-900 group-hover:text-maroon transition">{t.title}</p>
                    {t.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{t.description}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
