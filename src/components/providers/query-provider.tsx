"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { getApiErrorStatus } from "@/lib/toast";

const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 500, 502, 504]);

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (failureCount >= 2) return false;

              const status = getApiErrorStatus(error);
              return (
                status === undefined || RETRYABLE_HTTP_STATUSES.has(status)
              );
            },
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 8000),
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
