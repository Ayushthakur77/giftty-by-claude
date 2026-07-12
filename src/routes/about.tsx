import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({ component: AboutPage });

function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-heading text-2xl font-bold text-gray-900 mb-4">About Giftty</h1>
      <p className="text-gray-600 text-sm">
        Giftty is a personalized gifting platform built for India — thoughtful gifts, curated
        gift boxes, and an AI assistant to help you find the perfect gift for anyone, any occasion.
      </p>
    </div>
  );
}
