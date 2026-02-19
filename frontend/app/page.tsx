import PriceComparison from '@/components/PriceComparison';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
            DeFi Price Integrator
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Compare spot prices from CoinGecko and Bitget through internal API routes.
          </p>
        </header>
        <PriceComparison />
      </main>
    </div>
  );
}
