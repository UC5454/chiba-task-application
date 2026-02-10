"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";

import { ToastProvider } from "@/components/ui/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig
        value={{
          dedupingInterval: 30000,
          focusThrottleInterval: 300000,
          revalidateOnFocus: false,
          keepPreviousData: true,
        }}
      >
        <ToastProvider>{children}</ToastProvider>
      </SWRConfig>
    </SessionProvider>
  );
}
