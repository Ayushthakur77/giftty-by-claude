import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/privacy")({ component: PrivacyPage });

function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-heading text-2xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
      <p className="text-gray-600 text-sm">Privacy policy content — to be finalized before launch.</p>
    </div>
  );
}
