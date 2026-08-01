import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="bg-cream border-t border-gray-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-10 text-sm">
        <div className="col-span-2 md:col-span-1">
          <span className="font-script text-2xl text-maroon">Giftty</span>
          <p className="text-gray-500 mt-2 leading-relaxed">Thoughtful gifting, delivered across India.</p>
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
          <h3 className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-3">Account</h3>
          <ul className="space-y-2 text-gray-600">
            <li><Link to="/account" className="hover:text-maroon transition">My Account</Link></li>
            <li><Link to="/account" className="hover:text-maroon transition">My Orders</Link></li>
            <li><Link to="/wishlist" className="hover:text-maroon transition">Wishlist</Link></li>
            <li><Link to="/account/referrals" className="hover:text-maroon transition">Refer a Friend</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-3">Help</h3>
          <ul className="space-y-2 text-gray-600">
            <li><Link to="/help" className="hover:text-maroon transition">FAQ</Link></li>
            <li><Link to="/help" className="hover:text-maroon transition">Shipping</Link></li>
            <li><Link to="/help" className="hover:text-maroon transition">Returns</Link></li>
            <li><Link to="/help" className="hover:text-maroon transition">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-3">Company</h3>
          <ul className="space-y-2 text-gray-600">
            <li><Link to="/about" className="hover:text-maroon transition">About us</Link></li>
            <li><Link to="/legal/privacy" className="hover:text-maroon transition">Privacy policy</Link></li>
            <li><Link to="/legal/terms" className="hover:text-maroon transition">Terms of service</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-200 py-5 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Giftty. All rights reserved.
      </div>
    </footer>
  );
}
