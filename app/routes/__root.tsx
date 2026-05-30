import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { useState } from "react";
import { ThemeProvider } from "../../src/components/theme-provider";
import { AuthProvider } from "../../src/features/auth";
import "../../src/index.css";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <html lang="en" className="h-screen overflow-hidden">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <HeadContent />
      </head>
      <body className="h-screen overflow-hidden">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <Outlet />
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
