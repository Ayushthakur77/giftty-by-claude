import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabase-client";
import { signUpSchema } from "@/lib/auth-schemas";
import { recordReferralSignupFn } from "@/lib/referral.functions";

export const Route = createFileRoute("/auth/sign-up")({
  validateSearch: z.object({ ref: z.string().optional() }),
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { ref } = Route.useSearch();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = signUpSchema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setLoading(true);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });
    setLoading(false);

    if (signUpError) {
      // Generic message — never confirm/deny whether an email already exists.
      setError("Could not create account. Please check your details and try again.");
      return;
    }

    if (ref && signUpData.user) {
      recordReferralSignupFn({ data: { referralCode: ref, newUserId: signUpData.user.id } }).catch(() => {
        // Non-critical — a failed referral record shouldn't block account creation.
      });
    }

    navigate({ to: "/account" });
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/account` },
    });
    if (oauthError) {
      setGoogleLoading(false);
      setError("Google sign-in failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="font-heading text-2xl font-bold text-maroon mb-1">Create your account</h1>
        <p className="text-gray-500 mb-6">Join Giftty to start sending thoughtful gifts.</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-maroon"
              required
            />
          </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-maroon"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-maroon text-white rounded-lg py-2.5 font-medium hover:bg-maroon-dark disabled:opacity-60 transition"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-gray-400">OR</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full border border-gray-300 rounded-lg py-2.5 font-medium hover:bg-gray-50 disabled:opacity-60 transition"
        >
          {googleLoading ? "Redirecting…" : "Sign up with Google"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link to="/auth/sign-in" className="text-maroon font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
