import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, User, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";

const TABS = [
  { to: "/" as const, label: "Home", icon: Home },
  { to: "/search" as const, label: "Search", icon: Search },
  { to: "/account" as const, label: "Account", icon: User },
  { to: "/cart" as const, label: "Cart", icon: ShoppingBag },
];

export function MobileBottomNav() {
  const location = useLocation();
  const cartCount = useCartStore((s) => (Array.isArray(s.lines) ? s.lines : []).reduce((sum, l) => sum + ("quantity" in l ? l.quantity : 1), 0));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex items-center justify-around py-2 pb-safe">
      {TABS.map(({ to, label, icon: Icon }) => {
        const active = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs relative ${active ? "text-maroon" : "text-gray-500"}`}
          >
            <Icon className={`w-5 h-5 ${active ? "fill-maroon/10" : ""}`} />
            {label}
            {to === "/cart" && cartCount > 0 && (
              <span className="absolute -top-0.5 right-1 bg-maroon text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
