import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMomentPageBySlug, getMomentTemplateById, incrementMomentPageViews } from "@/lib/moments-catalog";
import { BirthdayTemplate } from "@/components/moments-templates/BirthdayTemplate";
import { LoveLetterTemplate } from "@/components/moments-templates/LoveLetterTemplate";
import { FriendshipTemplate } from "@/components/moments-templates/FriendshipTemplate";

export const Route = createFileRoute("/s/$slug")({ component: ReceiverPage });

const TEMPLATE_COMPONENTS: Record<string, React.ComponentType<{ data: Record<string, string>; themeColor: string }>> = {
  "birthday-surprise": BirthdayTemplate,
  "love-letter": LoveLetterTemplate,
  "friendship-appreciation": FriendshipTemplate,
};

function ReceiverPage() {
  const { slug } = Route.useParams();
  const [revealed, setRevealed] = useState(false);

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["moment-page", slug],
    queryFn: () => getMomentPageBySlug(slug),
  });

  const { data: template } = useQuery({
    queryKey: ["moment-page-template", page?.template_id],
    queryFn: () => getMomentTemplateById(page!.template_id),
    enabled: !!page,
  });

  useEffect(() => {
    if (page) incrementMomentPageViews(slug);
  }, [page, slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-maroon">
        <p className="text-white/70 text-sm">Loading…</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f1f3f6] px-4 text-center">
        <p className="text-gray-600 font-medium mb-2">This surprise page isn't available.</p>
        <p className="text-gray-400 text-sm mb-6">It may have been unpublished or the link is incorrect.</p>
        <Link to="/moments" className="text-maroon hover:underline text-sm">Create your own surprise page →</Link>
      </div>
    );
  }

  const TemplateComponent = template ? TEMPLATE_COMPONENTS[template.slug] : null;

  return (
    <div>
      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div
            key="loading-gate"
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-maroon to-maroon-dark px-6 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              className="text-5xl mb-6"
            >
              💝
            </motion.div>
            <p className="text-white text-lg mb-8">Someone made something special for you ❤️</p>
            <button
              onClick={() => setRevealed(true)}
              className="bg-gold text-white px-8 py-3.5 rounded-full font-semibold hover:bg-gold-light transition shadow-lg"
            >
              Open Your Surprise 🎁
            </button>
          </motion.div>
        ) : (
          <motion.div key="revealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            {TemplateComponent && (
              <TemplateComponent data={page.data_json} themeColor={page.theme_color || "#7a1f3d"} />
            )}

            {!page.is_premium && (
              <div className="bg-white py-6 px-4 text-center border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-3">Made with Giftty ❤️</p>
                <Link
                  to="/moments"
                  className="inline-block bg-maroon text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-maroon-dark transition"
                >
                  Create Yours Free
                </Link>
              </div>
            )}

            <div className="bg-cream py-8 px-4 text-center">
              <p className="text-gray-700 font-medium mb-1">Make this moment even more special 🎁</p>
              <p className="text-gray-500 text-sm mb-4">Send a real gift alongside your message.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link to="/search" search={{ q: "" } as any} className="bg-maroon text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-maroon-dark transition">
                  Send Personalized Gift
                </Link>
                <Link to="/gift-boxes" className="border border-maroon text-maroon text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-maroon/5 transition">
                  Order Surprise Box
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
