import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIsSuperAdmin } from "@/lib/use-role";
import { LayoutDashboard, Package, FolderTree, Gift, PackageOpen, ClipboardList, Ticket, Truck, Star, Users, BarChart3, Settings, LayoutTemplate, Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const NAV_ITEMS = [
  { to: "/admin/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/orders" as const, label: "Orders", icon: ClipboardList },
  { to: "/admin/products" as const, label: "Products", icon: Package },
  { to: "/admin/categories" as const, label: "Categories", icon: FolderTree },
  { to: "/admin/empty-boxes" as const, label: "Empty Boxes", icon: PackageOpen },
  { to: "/admin/ready-boxes" as const, label: "Ready Boxes", icon: Gift },
  { to: "/admin/coupons" as const, label: "Coupons", icon: Ticket },
  { to: "/admin/delivery" as const, label: "Delivery", icon: Truck },
  { to: "/admin/reviews" as const, label: "Reviews", icon: Star },
  { to: "/admin/customers" as const, label: "Customers", icon: Users },
  { to: "/admin/reports" as const, label: "Reports", icon: BarChart3 },
  { to: "/admin/homepage" as const, label: "Homepage", icon: LayoutTemplate },
  { to: "/admin/ai-logs" as const, label: "AI Logs", icon: Sparkles },
  { to: "/admin/settings" as const, label: "Store Settings", icon: Settings },
];

function AdminLayout() {
  const { isSuperAdmin, loading } = useIsSuperAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      navigate({ to: "/" });
    }
  }, [loading, isSuperAdmin, navigate]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-400">Loading…</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">
        You don't have access to this page.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex gap-8">
      <aside className="w-52 shrink-0">
        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Admin</h2>
        <nav className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                  active ? "bg-maroon text-white" : "text-gray-600 hover:bg-cream"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
