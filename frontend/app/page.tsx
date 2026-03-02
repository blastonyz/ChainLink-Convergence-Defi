import { Navbar } from "@/components/ui/landing/navbar";
import { Hero } from "@/components/ui/landing/hero";
import { Stats } from "@/components/ui/landing/stats";
import { Features } from "@/components/ui/landing/features";
import { MarketOhlcPanel } from "@/components/ui/charts/market-ohlc-panel";
import { Tokenomics } from "@/components/ui/landing/tokenomics";
import { Roadmap } from "@/components/ui/landing/roadmap";
import { CtaFooter } from "@/components/ui/landing/cta-footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-darker-bg">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <MarketOhlcPanel />
      <Tokenomics />
      <Roadmap />
      <CtaFooter />
    </main>
  );
}
