import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

export type HeroBanner = {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  link?: string | null;
  image_url?: string | null;
};

const DEFAULT_SLIDE: HeroBanner = {
  id: "__default__",
  title: "Send joy across India in a click.",
  subtitle:
    "Personalized gifts, curated gift boxes, and an AI assistant to help you find the perfect gift for anyone, any occasion.",
  link: "/gift-box",
  image_url: null,
};

const SLIDE_INTERVAL_MS = 2000;

export function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const slides = banners.length > 0 ? banners : [DEFAULT_SLIDE];
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reset to the first slide whenever the slide set itself changes (e.g.
    // banners finish loading), so we don't get stuck on an out-of-range index.
    setActive(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length]);

  function goTo(i: number) {
    setActive(i);
    // Restart the auto-advance timer so a manual click doesn't get
    // immediately overridden by an in-flight interval tick.
    if (timerRef.current) clearInterval(timerRef.current);
    if (slides.length > 1) {
      timerRef.current = setInterval(() => {
        setActive((cur) => (cur + 1) % slides.length);
      }, SLIDE_INTERVAL_MS);
    }
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-maroon to-maroon-dark">
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {slides.map((banner) => (
          <div
            key={banner.id}
            className="w-full shrink-0 bg-cover bg-center"
            style={banner.image_url ? { backgroundImage: `url(${banner.image_url})` } : undefined}
          >
            <div
              className={`max-w-[1400px] mx-auto px-4 py-10 md:py-16 text-center ${
                banner.image_url ? "bg-maroon/60 backdrop-blur-sm" : ""
              }`}
            >
              <h1 className="font-heading text-2xl md:text-4xl font-bold text-white mb-3">
                {banner.title || DEFAULT_SLIDE.title}
              </h1>
              <p className="text-cream/90 text-sm md:text-base max-w-xl mx-auto mb-6">
                {banner.subtitle || DEFAULT_SLIDE.subtitle}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  to={(banner.link as any) || "/gift-box"}
                  className="bg-gold text-white px-5 py-2.5 rounded-sm font-semibold text-sm hover:bg-gold-light transition"
                >
                  {banner.id === "__default__" ? "Build a gift box" : "Shop now"}
                </Link>
                <Link
                  to="/ai-finder"
                  className="border border-white/60 text-white px-5 py-2.5 rounded-sm font-semibold text-sm hover:bg-white/10 transition"
                >
                  Ask AI for a gift idea
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {slides.map((banner, i) => (
            <button
              key={banner.id}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
