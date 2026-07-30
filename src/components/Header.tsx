import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Heart, ShoppingBag, User, Bell, Sparkles, ShieldCheck, ChevronDown, Gift, Wand2 } from "lucide-react";
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

  const topLevelCategories = (categories ?? []).filter((c) => !c.parent_id).slice(0, 9);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/search", search: { q: searchInput.trim() } });
  }

  return (
    <header className="sticky top-0 z-40">
      {/* Primary bar — dense, brand-solid, search-first */}
      <div className="bg-maroon">
        <div className="max-w-[1400px] mx-auto px-3 md:px-5">
          <div className="flex items-center gap-3 md:gap-6 py-2.5">
            <Link to="/" className="shrink-0 flex flex-col leading-none">
              <span className="font-script text-2xl md:text-3xl text-white">Giftty</span>
              <span className="hidden md:block text-[10px] text-gold-light tracking-wide -mt-1">Thoughtful gifting</span>
            </Link>

            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl relative">
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search for gifts, flowers, cakes, occasions…"
                className="w-full rounded-sm bg-white pl-4 pr-11 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-maroon hover:text-maroon-dark"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            <nav className="hidden sm:flex items-center gap-4 md:gap-5 shrink-0 text-white text-sm">
              {isSuperAdmin && (
                <Link to="/admin/dashboard" aria-label="Admin Panel" className="flex items-center gap-1 bg-gold text-white px-2.5 py-1 rounded text-xs font-semibold hover:bg-gold-light transition">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </Link>
              )}
              <Link to="/notifications" aria-label="Notifications" className="hover:text-gold-light transition">
                <Bell className="w-[18px] h-[18px]" />
              </Link>
              <Link to="/wishlist" aria-label="Wishlist" className="hover:text-gold-light transition">
                <Heart className="w-[18px] h-[18px]" />
              </Link>
              <Link
                to={user ? "/account" : "/auth/sign-in"}
                className="flex items-center gap-1 font-medium hover:text-gold-light transition"
              >
                <User className="w-[18px] h-[18px]" />
                <span className="hidden lg:inline">{user ? "Account" : "Login"}</span>
                <ChevronDown className="w-3 h-3 hidden lg:inline" />
              </Link>
              <Link to="/cart" aria-label="Cart" className="relative flex items-center gap-1.5 font-medium hover:text-gold-light transition">
                <ShoppingBag className="w-[18px] h-[18px]" />
                <span className="hidden lg:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-gold text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            </nav>

            {/* Compact icons for small screens (search occupies most width there) */}
            <Link to={user ? "/account" : "/auth/sign-in"} aria-label="Account" className="sm:hidden text-white shrink-0">
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Secondary category strip */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-3 md:px-5">
          <nav className="flex items-center gap-1 py-2 text-[13px] overflow-x-auto no-scrollbar">
            <Link
              to="/search"
              search={{ q: "" }}
              className="whitespace-nowrap flex items-center gap-1 text-gray-600 hover:text-maroon font-medium px-2.5 py-1 transition"
            >
              <Search className="w-3.5 h-3.5" /> All Products
            </Link>
            {topLevelCategories.map((c) => (
              <Link
                key={c.id}
                to="/c/$categorySlug"
                params={{ categorySlug: c.slug }}
                className="whitespace-nowrap text-gray-600 hover:text-maroon font-medium transition px-2.5 py-1"
              >
                {c.name}
              </Link>
            ))}
            <Link
              to="/gift-boxes"
              className="whitespace-nowrap flex items-center gap-1 text-gray-600 hover:text-maroon font-medium px-2.5 py-1 transition"
            >
              <Gift className="w-3.5 h-3.5" /> Gift Boxes
            </Link>
            <Link
              to="/gift-box"
              className="whitespace-nowrap bg-mint-dark/15 text-mint-dark hover:bg-mint-dark/25 px-2.5 py-1 rounded font-semibold transition ml-1"
            >
              Build a Box
            </Link>
            <Link
              to="/moments"
              className="whitespace-nowrap flex items-center gap-1 text-maroon hover:text-maroon-dark font-semibold px-2.5 py-1 transition"
            >
              <Wand2 className="w-3.5 h-3.5" /> Surprise Pages ✨
            </Link>
            <Link
              to="/ai-finder"
              className="whitespace-nowrap bg-gold/15 text-gold hover:bg-gold/25 px-2.5 py-1 rounded font-semibold flex items-center gap-1 transition"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Finder
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
