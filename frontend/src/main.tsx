import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

import { ThemeProvider } from "./components/common/ThemeProvider";
import { Toaster } from "./components/ui/toast";

// Implementation Design v1.1's documented Retry Behavior: "TanStack Query
// default (3 retries for GETs). No retries for POST/PUT." The library's
// own default of 3 retries applies to both queries and mutations unless
// overridden, so mutations are explicitly opted out here.
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="cowork-hub-theme">
        <QueryClientProvider client={queryClient}>
          <App />
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
