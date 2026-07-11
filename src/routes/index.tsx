import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-script text-3xl text-maroon">Giftty</span>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/auth/sign-in" className="text-gray-600 hover:text-maroon">
              Sign in
            </Link>
            <Link
              to="/auth/sign-up"
              className="bg-maroon text-white px-4 py-2 rounded-lg hover:bg-maroon-dark transition"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="font-heading text-4xl md:text-5xl font-bold text-maroon mb-4">
          Thoughtful gifting, delivered across India.
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Personalized gifts, curated gift boxes, and an AI assistant to help you find the
          perfect gift — build v2 in progress.
        </p>
      </section>
    </div>
  );
}
