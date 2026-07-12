import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/terms")({ component: TermsPage });

function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-heading text-2xl font-bold text-gray-900 mb-4">Terms of Service</h1>
      <p className="text-gray-600 text-sm">Terms of service content — to be finalized before launch.</p>
    </div>
  );
}
