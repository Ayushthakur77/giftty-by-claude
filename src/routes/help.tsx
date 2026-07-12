import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/help")({ component: HelpPage });

function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-heading text-2xl font-bold text-gray-900 mb-6">Help & FAQ</h1>
      <div className="space-y-6 text-sm text-gray-600">
        <div>
          <h2 className="font-medium text-gray-900 mb-1">Shipping</h2>
          <p>We deliver across India. Shipping charges vary by state and are shown at checkout before you pay.</p>
        </div>
        <div>
          <h2 className="font-medium text-gray-900 mb-1">Returns & Cancellations</h2>
          <p>Orders can be cancelled from "My Orders" any time before they are shipped. Personalized items cannot be returned once dispatched.</p>
        </div>
        <div>
          <h2 className="font-medium text-gray-900 mb-1">Contact us</h2>
          <p>Email support@giftty.in for any order or account questions.</p>
        </div>
      </div>
    </div>
  );
}
