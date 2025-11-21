"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export function PrivyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        defaultChain: {
          id: 8453,
          caipId: "eip155:8453",
          name: "Base",
          nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
          rpcUrl: "https://mainnet.base.org",
          blockExplorerUrl: "https://basescan.org",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
