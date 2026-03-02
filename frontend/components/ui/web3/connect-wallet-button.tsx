"use client";

import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

type ConnectWalletButtonProps = {
  className?: string;
};

export function ConnectWalletButton({ className = "" }: ConnectWalletButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`rounded-full bg-card px-5 py-2.5 text-sm text-muted-foreground ${className}`}>
        Connect Wallet
      </div>
    );
  }

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        authenticationStatus,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {!connected ? (
              <button
                onClick={openConnectModal}
                type="button"
                className={`rounded-full bg-gradient-to-r from-cyan to-purple px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 ${className}`}
              >
                Connect Wallet
              </button>
            ) : chain.unsupported ? (
              <button
                onClick={openChainModal}
                type="button"
                className={`rounded-full border border-destructive/50 bg-destructive/10 px-5 py-2.5 text-sm font-semibold text-destructive-foreground transition-all hover:opacity-90 ${className}`}
              >
                Wrong Network
              </button>
            ) : (
              <button
                onClick={openAccountModal}
                type="button"
                className={`rounded-full bg-gradient-to-r from-cyan to-purple px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 ${className}`}
              >
                {account.displayName}
              </button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}