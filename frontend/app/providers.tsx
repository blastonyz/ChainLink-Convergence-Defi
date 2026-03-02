"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { useState } from "react";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { arbitrum } from "wagmi/chains";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  "8a670b98943fc13feaebf4def079310b";

const config = getDefaultConfig({
  appName: "Convergence",
  projectId,
  chains: [arbitrum],
  ssr: false,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
