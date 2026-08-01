import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Heart, ShoppingBag, User } from "lucide-react";
import { listCategories } from "@/lib/public-catalog";
import { useCartStore } from "@/lib/cart-store";
import { useSession } from "@/lib/use-session";
import { useIsSuperAdmin } from "@/lib/use-role";

export function Header() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const cartCount = useCartStore((s) => (Array.isArray(s.lines) ? s.lines : []).reduce((sum, l) => sum + ("quantity" in l ? l.quantity : 1), 0));
  const { user } = useSession();
  const { isSuperAdmin } = useIsSuperAdmin();

  const { data: categories } = useQuery({
    queryKey: ["categories", "nav"],
    queryFn: listCategories,
    staleTime: 60_000,
  });

  const topLevelCategories = (categories ?? []).filter((c) => !c.parent_id).slice(0, 6);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/search", search: { q: searchInput.trim() } });
  }

  return (
    <header className="sticky top-0 z-40 bg-maroon">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
        <div className="flex items-center gap-4 md:gap-8 py-4">
          <Link to="/" className="shrink-0">
            <span className="font-script text-2xl md:text-3xl text-white">Giftty</span>
          </Link>

          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl relative">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search for gifts…"
              className="w-full rounded-full bg-white/95 pl-5 pr-11 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-maroon hover:bg-maroon/5 transition"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          <div className="hidden sm:flex items-center gap-5 shrink-0 text-white text-sm">
            {isSuperAdmin && (
              <Link to="/admin/dashboard" className="text-gold-light/90 hover:text-gold-light transition font-medium">
                Admin
              </Link>
            )}
            <Link to="/wishlist" aria-label="Wishlist" className="hover:text-gold-light transition">
              <Heart className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </Link>
            <Link to={user ? "/account" : "/auth/sign-in"} aria-label="Account" className="hover:text-gold-light transition">
              <User className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </Link>
            <Link to="/cart" aria-label="Cart" className="relative hover:text-gold-light transition">
              <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.75} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gold text-maroon text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </div>

          <Link to={user ? "/account" : "/auth/sign-in"} aria-label="Account" className="sm:hidden text-white shrink-0">
            <User className="w-5 h-5" strokeWidth={1.75} />
          </Link>
        </div>

        {/* Thin, quiet secondary nav — plain text, no pills/icons */}
        <nav className="flex items-center gap-5 md:gap-7 pb-3.5 text-[13px] overflow-x-auto no-scrollbar text-white/70">
          <Link to="/search" search={{ q: "" }} className="whitespace-nowrap hover:text-white transition">
            All Products
          </Link>
          {topLevelCategories.map((c) => (
            <Link
              key={c.id}
              to="/c/$categorySlug"
              params={{ categorySlug: c.slug }}
              className="whitespace-nowrap hover:text-white transition"
            >
              {c.name}
            </Link>
          ))}
          <Link to="/gift-boxes" className="whitespace-nowrap hover:text-white transition">
            Gift Boxes
          </Link>
          <Link to="/moments" className="whitespace-nowrap hover:text-white transition">
            Surprise Pages
          </Link>
          <Link to="/ai-finder" className="whitespace-nowrap text-gold-light hover:text-gold transition">
            AI Finder
          </Link>
        </nav>
      </div>
    </header>
  );
}
