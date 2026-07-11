import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { z } from "zod";

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
});

const emailSchema = z.string().email();

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError("Enter a valid email");
      return;
    }

    setLoading(true);
    await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    // Always show success, whether or not the email exists — never reveal
    // which emails have accounts.
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="font-heading text-2xl font-bold text-maroon mb-1">Reset your password</h1>
        <p className="text-gray-500 mb-6">We&apos;ll email you a link to reset it.</p>

        {sent ? (
          <div className="rounded-lg bg-green-50 text-green-700 text-sm px-4 py-3">
            If an account exists for that email, a reset link is on its way.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-maroon"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-maroon text-white rounded-lg py-2.5 font-medium hover:bg-maroon-dark disabled:opacity-60 transition"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/auth/sign-in" className="text-maroon font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
