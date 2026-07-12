import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Must be named getRouter (not createRouter) — TanStack Start's internal
// #tanstack-router-entry virtual module looks for this exact export name.
export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
