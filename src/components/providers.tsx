"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => {
    const qc: QueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 15_000,
          refetchOnWindowFocus: true,
          // A 4xx (not found, forbidden…) won't change on retry; only retry network/5xx once.
          retry: (failureCount, error) =>
            !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 1,
        },
      },
      // Every mutation: show the API's message on failure, refresh all data on success
      // (money screens must never show stale balances after an action).
      mutationCache: new MutationCache({
        onError: (error, _vars, _ctx, mutation) => {
          if (!mutation.meta?.silent) toast.error(error.message);
        },
        onSuccess: () => qc.invalidateQueries(),
      }),
    });
    return qc;
  });

  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        {children}
        <Toaster position="top-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
