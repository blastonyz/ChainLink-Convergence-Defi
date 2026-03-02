"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

export function Hero() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <section className="relative min-h-screen overflow-hidden bg-darker-bg pt-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-navy/20 blur-[150px]" />
        <div className="absolute right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-purple/10 blur-[120px]" />
        <div className="absolute left-1/3 top-1/2 h-[300px] w-[300px] rounded-full bg-cyan/5 blur-[100px]" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,229,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 py-20 lg:py-28">
        <div
          className={`mb-8 inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/5 px-4 py-1.5 transition-all duration-700 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
          <span className="font-mono text-xs text-cyan">
            Live on Arbitrum
          </span>
        </div>

        <h1
          className={`text-balance text-center font-[family-name:var(--font-display)] text-5xl font-bold leading-[1.1] text-foreground transition-all delay-100 duration-700 sm:text-6xl md:text-7xl lg:text-8xl ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          Next-Gen DeFi
          <br />
          <span className="text-gradient-cyan">Powered by AI</span>
        </h1>

        <div
          className={`relative my-10 h-[240px] w-[240px] transition-all delay-200 duration-1000 sm:h-[300px] sm:w-[300px] md:h-[360px] md:w-[360px] ${
            mounted ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
        >
          <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-cyan/20 via-purple/10 to-transparent blur-2xl" />
          <Image
            src="/images/hero-orb.jpg"
            alt="Defiance AI orb"
            fill
            className="rounded-full object-cover"
            priority
          />
          <div className="absolute -inset-1 rounded-full border border-cyan/20" />
          <div className="absolute -inset-3 rounded-full border border-purple/10" />
        </div>

        <div
          className={`flex flex-col items-center gap-4 sm:flex-row transition-all delay-300 duration-700 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <a
            href="#cta"
            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-purple px-7 py-3.5 text-sm font-semibold text-accent-foreground transition-all hover:shadow-[0_0_30px_rgba(0,229,255,0.3)]"
          >
            Launch App
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="#docs"
            className="rounded-full border border-border/60 bg-card/50 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:border-cyan/30 hover:bg-card/80"
          >
            White Paper
          </a>
        </div>

        <p
          className={`mt-8 max-w-lg text-center text-sm leading-relaxed text-muted-foreground transition-all delay-[400ms] duration-700 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          Powered by adaptive AI models that optimize speed, security,
          scalability, and cost in real time.
        </p>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-dark-bg to-transparent" />
    </section>
  )
}
