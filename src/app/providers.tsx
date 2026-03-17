"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";

import { ToastProvider } from "@/components/ui/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig
        value={{
          dedupingInterval: 10000,
          focusThrottleInterval: 60000,
          revalidateOnFocus: true,
          revalidateOnReconnect: true,
          keepPreviousData: true,
        }}
      >
        <ToastProvider>{children}</ToastProvider>
      </SWRConfig>
    </SessionProvider>
  );
}
