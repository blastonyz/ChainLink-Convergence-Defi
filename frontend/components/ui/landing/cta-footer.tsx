"use client"

import Image from "next/image"
import { ArrowRight } from "lucide-react"

const footerLinks = [
  { label: "Home", href: "#" },
  { label: "Features", href: "#features" },
  { label: "Tokenomics", href: "#tokenomics" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "Docs", href: "#docs" },
]

export function CtaFooter() {
  return (
    <>
      <section id="cta" className="relative overflow-hidden bg-darker-bg py-24 lg:py-32">
        <div className="absolute inset-0">
          <Image
            src="/images/cta-bg.jpg"
            alt=""
            fill
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-darker-bg via-darker-bg/80 to-darker-bg/60" />
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple/10 blur-[150px]" />
        <div className="pointer-events-none absolute left-1/3 top-1/3 h-[300px] w-[300px] rounded-full bg-cyan/5 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mx-auto mb-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan/10 to-purple/10 ring-1 ring-cyan/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-cyan">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold text-foreground md:text-5xl lg:text-6xl">
            <span className="text-balance">
              Get Defiance and join the future of{" "}
              <span className="text-gradient-cyan">AI-native finance</span>
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Building the future of AI-native decentralized finance with
            intelligent blockchain architecture. Connect your wallet and start
            trading smarter.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#"
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-purple px-8 py-4 text-sm font-semibold text-accent-foreground transition-all hover:shadow-[0_0_30px_rgba(0,229,255,0.3)]"
            >
              Connect Wallet
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#"
              className="rounded-full border border-border/60 bg-card/50 px-8 py-4 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:border-cyan/30 hover:bg-card/80"
            >
              White Paper
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 bg-darker-bg">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-8 md:flex-row">
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan to-purple">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-darker-bg">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
              Defiance
            </span>
          </a>

          <nav className="flex flex-wrap items-center justify-center gap-6">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <p className="text-xs text-muted-foreground">
            {"2025 Defiance. All rights reserved."}
          </p>
        </div>
      </footer>
    </>
  )
}
