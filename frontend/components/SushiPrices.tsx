type SushiPoolToken = {
  id: string;
  symbol: string;
  name: string;
};

type SushiPoolRow = {
  id: string;
  token0: SushiPoolToken;
  token1: SushiPoolToken;
  token0Price: string;
  token1Price: string;
  totalValueLockedUSD: string;
  volumeUSD: string;
  feesUSD: string;
};

type SushiTokenPriceRow = {
  symbol: string;
  priceUSD: number | null;
  sourcePoolId: string | null;
};

type SushiPricesProps = {
  ethPriceUsd: string | null;
  pools: SushiPoolRow[];
  tokenPrices: SushiTokenPriceRow[];
};

const formatUsd = (value: string | null) => {
  if (!value) return 'N/A';
  const num = Number(value);
  if (!Number.isFinite(num)) return 'N/A';
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const formatTokenPriceUsd = (value: number | null) => {
  if (value === null) return 'N/A';
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
};

export default function SushiPrices({
  ethPriceUsd,
  pools,
  tokenPrices,
}: SushiPricesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          SushiSwap v3 Pools
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          ETH Price (bundle): {formatUsd(ethPriceUsd)}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">Pool</th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">Pair</th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">token0Price</th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">token1Price</th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">TVL (USD)</th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">Volume (USD)</th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">Fees (USD)</th>
            </tr>
          </thead>
          <tbody>
            {pools.map((pool) => (
              <tr key={pool.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2 text-zinc-700 dark:text-zinc-300">{pool.id}</td>
                <td className="py-2 text-zinc-900 dark:text-zinc-100">
                  {pool.token0.symbol}/{pool.token1.symbol}
                </td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">{pool.token0Price}</td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">{pool.token1Price}</td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">
                  {formatUsd(pool.totalValueLockedUSD)}
                </td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">
                  {formatUsd(pool.volumeUSD)}
                </td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">
                  {formatUsd(pool.feesUSD)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Derived Token Prices (USD)
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">Token</th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">Price (USD)</th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">Source Pool</th>
            </tr>
          </thead>
          <tbody>
            {tokenPrices.map((tokenPrice) => (
              <tr
                key={tokenPrice.symbol}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2 text-zinc-900 dark:text-zinc-100">{tokenPrice.symbol}</td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">
                  {formatTokenPriceUsd(tokenPrice.priceUSD)}
                </td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">
                  {tokenPrice.sourcePoolId ?? 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type { SushiPoolRow, SushiTokenPriceRow };
