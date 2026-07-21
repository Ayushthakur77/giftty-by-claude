import { Component, type ReactNode } from "react";

/**
 * Catches any uncaught render/runtime error anywhere below it and shows a
 * recoverable message instead of leaving the whole page blank/stuck.
 * This is a defense-in-depth measure — the specific cause of any one crash
 * should still be fixed at the source, but a single unexpected error in one
 * component (e.g. malformed cached data) should never be able to take down
 * navigation, header, or the rest of the page with it.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[ErrorBoundary] Caught an unexpected error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <p className="text-gray-900 font-medium mb-2">Something went wrong.</p>
          <p className="text-gray-500 text-sm mb-6">
            This page hit an unexpected error. Reloading usually fixes it.
          </p>
          <button
            onClick={() => {
              // Clear potentially-corrupted client-side cached state, then reload.
              try {
                localStorage.removeItem("giftty-cart");
              } catch {
                // ignore
              }
              window.location.href = "/";
            }}
            className="bg-maroon text-white px-6 py-2 rounded-lg text-sm hover:bg-maroon-dark transition"
          >
            Reload Giftty
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
