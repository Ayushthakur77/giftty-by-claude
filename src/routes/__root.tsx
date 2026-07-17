import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import appCss from "@/styles/app.css?url";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Giftty — Thoughtful gifting, delivered across India" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 10_000, retry: 1 } },
  }));

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-white text-gray-900 antialiased">
        <QueryClientProvider client={queryClient}>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 pb-16 md:pb-0">
              <Outlet />
            </main>
            <Footer />
            <MobileBottomNav />
          </div>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
