import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Heart, ShoppingBag, User, Bell, Sparkles } from "lucide-react";
import { listCategories } from "@/lib/public-catalog";
import { useCartStore } from "@/lib/cart-store";
import { useSession } from "@/lib/use-session";

export function Header() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const cartCount = useCartStore((s) => s.lines.reduce((sum, l) => sum + ("quantity" in l ? l.quantity : 1), 0));
  const { user } = useSession();

  // Real DB-backed categories — this is the fix for the v1 bug where admin-created
  // categories never appeared anywhere on the storefront.
  const { data: categories } = useQuery({
    queryKey: ["categories", "nav"],
    queryFn: listCategories,
    staleTime: 60_000,
  });

  const topLevelCategories = (categories ?? []).filter((c) => !c.parent_id).slice(0, 9);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate({ to: "/search", search: { q: searchInput.trim() } });
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
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
              className="w-full rounded-full border border-gray-200 bg-gray-50 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 focus:bg-white"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </form>

          <nav className="flex items-center gap-4 shrink-0 text-gray-600">
            <Link to="/notifications" aria-label="Notifications" className="hover:text-maroon">
              <Bell className="w-5 h-5" />
            </Link>
            <Link to="/wishlist" aria-label="Wishlist" className="hover:text-maroon">
              <Heart className="w-5 h-5" />
            </Link>
            <Link to="/gift-box" aria-label="Build a gift box" className="hover:text-maroon">
              <Sparkles className="w-5 h-5" />
            </Link>
            <Link
              to={user ? "/account" : "/auth/sign-in"}
              aria-label="Account"
              className="hover:text-maroon"
            >
              <User className="w-5 h-5" />
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

        <nav className="flex items-center gap-5 py-2 text-sm text-gray-600 overflow-x-auto no-scrollbar border-t border-gray-50">
          {topLevelCategories.map((c) => (
            <Link
              key={c.id}
              to="/c/$categorySlug"
              params={{ categorySlug: c.slug }}
              className="whitespace-nowrap hover:text-maroon transition"
            >
              {c.name}
            </Link>
          ))}
          <Link to="/gift-boxes" className="whitespace-nowrap hover:text-maroon transition font-medium">
            Gift Boxes
          </Link>
          <Link to="/gift-box" className="whitespace-nowrap hover:text-maroon transition font-medium">
            Build a Box
          </Link>
          <Link to="/ai-finder" className="whitespace-nowrap hover:text-maroon transition font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> AI Finder
          </Link>
        </nav>
      </div>
    </header>
  );
}
