import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Heart, ShoppingBag, User, Bell, Sparkles, ShieldCheck } from "lucide-react";
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

  // Real DB-backed categories — this is the fix for the v1 bug where admin-created
  // categories never appeared anywhere on the storefront.
  const { data: categories } = useQuery({
    queryKey: ["categories", "nav"],
    queryFn: listCategories,
    staleTime: 60_000,
  });

  const topLevelCategories = (categories ?? []).filter((c) => !c.parent_id).slice(0, 8);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/search", search: { q: searchInput.trim() } });
  }

  return (
    <header className="sticky top-0 z-40 bg-mint-light border-b border-mint-dark/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-6 py-3">
          <Link to="/" className="font-script text-3xl text-maroon shrink-0">
            Giftty
          </Link>

          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl relative">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search for gifts, flowers, cakes, occasions…"
              className="w-full rounded-full border border-mint-dark/30 bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </form>

          <nav className="flex items-center gap-3 shrink-0 text-gray-700">
            {isSuperAdmin && (
              <Link to="/admin/dashboard" aria-label="Admin Panel" className="flex items-center gap-1 bg-maroon text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-maroon-dark transition">
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden md:inline">Admin</span>
              </Link>
            )}
            <Link to="/notifications" aria-label="Notifications" className="hover:text-maroon">
              <Bell className="w-5 h-5" />
            </Link>
            <Link to="/wishlist" aria-label="Wishlist" className="hover:text-maroon">
              <Heart className="w-5 h-5" />
            </Link>
            <Link
              to={user ? "/account" : "/auth/sign-in"}
              aria-label="Account"
              className="flex items-center gap-1 bg-white/70 hover:bg-white text-maroon px-3 py-1.5 rounded-full text-xs font-medium transition"
            >
              <User className="w-4 h-4" />
              <span className="hidden md:inline">Account</span>
            </Link>
            <Link to="/cart" aria-label="Cart" className="relative hover:text-maroon">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-maroon text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </nav>
        </div>

        <nav className="flex items-center gap-2 py-2 text-sm overflow-x-auto no-scrollbar border-t border-mint-dark/20">
          <Link
            to="/search"
            search={{ q: "" }}
            className="whitespace-nowrap flex items-center gap-1 bg-white/70 hover:bg-white text-gray-700 px-3 py-1.5 rounded-full transition"
          >
            <Search className="w-3.5 h-3.5" /> All Products
          </Link>
          {topLevelCategories.map((c) => (
            <Link
              key={c.id}
              to="/c/$categorySlug"
              params={{ categorySlug: c.slug }}
              className="whitespace-nowrap text-gray-700 hover:text-maroon transition px-2 py-1.5"
            >
              {c.name}
            </Link>
          ))}
          <Link
            to="/gift-boxes"
            className="whitespace-nowrap bg-white/70 hover:bg-white text-gray-700 px-3 py-1.5 rounded-full font-medium transition"
          >
            Gift Boxes
          </Link>
          <Link
            to="/gift-box"
            className="whitespace-nowrap bg-mint-dark/80 hover:bg-mint-dark text-white px-3 py-1.5 rounded-full font-medium transition"
          >
            Build a Box
          </Link>
          <Link
            to="/ai-finder"
            className="whitespace-nowrap bg-gold hover:bg-gold-light text-white px-3 py-1.5 rounded-full font-medium flex items-center gap-1 transition"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Finder
          </Link>
        </nav>
      </div>
    </header>
  );
}
