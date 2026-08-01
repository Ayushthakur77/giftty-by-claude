import { Link } from "@tanstack/react-router";

const OCCASION_LINKS = [
  { label: "Birthday", query: "birthday" },
  { label: "Anniversary", query: "anniversary" },
  { label: "Housewarming", query: "housewarming" },
  { label: "Congratulations", query: "congratulations" },
  { label: "Thank You", query: "thank you" },
];

const RECIPIENT_LINKS = [
  { label: "Gifts for Her", query: "her" },
  { label: "Gifts for Him", query: "him" },
  { label: "Gifts for Parents", query: "parents" },
  { label: "Gifts for Friends", query: "friend" },
  { label: "Gifts for Kids", query: "kids" },
];

export function Footer() {
  return (
    <footer className="bg-cream border-t border-gray-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-10 text-sm">
        <div className="col-span-2 md:col-span-1">
          <span className="font-script text-2xl text-maroon">Giftty</span>
          <p className="text-gray-500 mt-2 leading-relaxed">Thoughtful gifting, delivered across India. Starting at just ₹99.</p>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-3">Shop by Occasion</h3>
          <ul className="space-y-2 text-gray-600">
            {OCCASION_LINKS.map((o) => (
              <li key={o.label}>
                <Link to="/search" search={{ q: o.query } as any} className="hover:text-maroon transition">{o.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-3">Shop by Recipient</h3>
          <ul className="space-y-2 text-gray-600">
            {RECIPIENT_LINKS.map((r) => (
              <li key={r.label}>
                <Link to="/search" search={{ q: r.query } as any} className="hover:text-maroon transition">{r.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-3">Shop</h3>
          <ul className="space-y-2 text-gray-600">
            <li><Link to="/gift-boxes" className="hover:text-maroon transition">Gift Boxes</Link></li>
            <li><Link to="/gift-box" className="hover:text-maroon transition">Build a Box</Link></li>
            <li><Link to="/ai-finder" className="hover:text-maroon transition">AI Gift Finder</Link></li>
            <li><Link to="/moments" className="hover:text-maroon transition">Surprise Pages</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-3">Account &amp; Help</h3>
          <ul className="space-y-2 text-gray-600">
            <li><Link to="/account" className="hover:text-maroon transition">My Account</Link></li>
            <li><Link to="/wishlist" className="hover:text-maroon transition">Wishlist</Link></li>
            <li><Link to="/account/referrals" className="hover:text-maroon transition">Refer a Friend</Link></li>
            <li><Link to="/help" className="hover:text-maroon transition">FAQ &amp; Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-200 py-5 px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-center text-xs text-gray-400">
        <span>© {new Date().getFullYear()} Giftty. All rights reserved.</span>
        <span className="hidden sm:inline">·</span>
        <Link to="/legal/privacy" className="hover:text-maroon transition">Privacy policy</Link>
        <span className="hidden sm:inline">·</span>
        <Link to="/legal/terms" className="hover:text-maroon transition">Terms of service</Link>
        <span className="hidden sm:inline">·</span>
        <Link to="/about" className="hover:text-maroon transition">About us</Link>
      </div>
    </footer>
  );
}
