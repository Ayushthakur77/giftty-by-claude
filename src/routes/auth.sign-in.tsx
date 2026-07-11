import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { signInSchema } from "@/lib/auth-schemas";

export const Route = createFileRoute("/auth/sign-in")({
  component: SignInPage,
});

// Reject any redirect target that isn't a same-origin relative path, to
// prevent open-redirect abuse via a crafted `?redirect=` query param.
function safeTarget(raw: string | null): string {
  if (!raw) return "/account";
  if (raw.startsWith("//") || raw.includes("://")) return "/account";
  if (!raw.startsWith("/")) return "/account";
  return raw;
}

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);

    if (signInError) {
      // Same generic message whether the email doesn't exist or the
      // password is wrong — never confirm which one it was.
      setError("Invalid email or password.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    navigate({ to: safeTarget(params.get("redirect")) });
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const params = new URLSearchParams(window.location.search);
    const redirectTarget = safeTarget(params.get("redirect"));
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${redirectTarget}` },
    });
    if (oauthError) {
      setGoogleLoading(false);
      setError("Google sign-in failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="font-heading text-2xl font-bold text-maroon mb-1">Welcome back</h1>
        <p className="text-gray-500 mb-6">Sign in to continue to Giftty.</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <Link to="/auth/forgot-password" className="text-xs text-maroon hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-maroon"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-maroon text-white rounded-lg py-2.5 font-medium hover:bg-maroon-dark disabled:opacity-60 transition"
          >
            {loading ? "Signing in…" : "Sign in"}
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
          {googleLoading ? "Redirecting…" : "Sign in with Google"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link to="/auth/sign-up" className="text-maroon font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
