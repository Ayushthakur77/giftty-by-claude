import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="bg-cream border-t border-gray-100 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
        <div>
          <span className="font-script text-2xl text-maroon">Giftty</span>
          <p className="text-gray-500 mt-2">Thoughtful gifting, delivered across India.</p>
        </div>
        <div>
          <h3 className="font-medium text-gray-900 mb-2">Shop</h3>
          <ul className="space-y-1 text-gray-500">
            <li><Link to="/gift-boxes" className="hover:text-maroon">Gift Boxes</Link></li>
            <li><Link to="/gift-box" className="hover:text-maroon">Build a Box</Link></li>
            <li><Link to="/ai-finder" className="hover:text-maroon">AI Gift Finder</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-gray-900 mb-2">Account</h3>
          <ul className="space-y-1 text-gray-500">
            <li><Link to="/account" className="hover:text-maroon">My Account</Link></li>
            <li><Link to="/account" className="hover:text-maroon">My Orders</Link></li>
            <li><Link to="/wishlist" className="hover:text-maroon">Wishlist</Link></li>
            <li><Link to="/account/referrals" className="hover:text-maroon">Refer a Friend</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-gray-900 mb-2">Help</h3>
          <ul className="space-y-1 text-gray-500">
            <li><Link to="/help" className="hover:text-maroon">FAQ</Link></li>
            <li><Link to="/help" className="hover:text-maroon">Shipping</Link></li>
            <li><Link to="/help" className="hover:text-maroon">Returns</Link></li>
            <li><Link to="/help" className="hover:text-maroon">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-gray-900 mb-2">Company</h3>
          <ul className="space-y-1 text-gray-500">
            <li><Link to="/about" className="hover:text-maroon">About us</Link></li>
            <li><Link to="/legal/privacy" className="hover:text-maroon">Privacy policy</Link></li>
            <li><Link to="/legal/terms" className="hover:text-maroon">Terms of service</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Giftty. All rights reserved.
      </div>
    </footer>
  );
}
