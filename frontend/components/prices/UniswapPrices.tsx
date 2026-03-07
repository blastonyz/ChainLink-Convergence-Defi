type UniswapRow = {
  pair: string;
  found: boolean;
  poolId: string | null;
  priceToken0: number | null;
  priceToken1: number | null;
  tvlUsd: number | null;
  volumeUsd: number | null;
};

type UniswapPricesProps = {
  rows: UniswapRow[];
};

const formatUsd = (value: number | null) => {
  if (value === null) return 'N/A';
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const formatPrice = (value: number | null) => {
  if (value === null) return 'N/A';
  return value.toLocaleString(undefined, { maximumFractionDigits: 8 });
};

export default function UniswapPrices({ rows }: UniswapPricesProps) {
  return (
    <div>
      <h3 className="mb-2 text-base font-medium text-zinc-900 dark:text-zinc-100">
        Uniswap v3 Pools
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Pair
              </th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Found
              </th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Pool ID
              </th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Token0 Price
              </th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Token1 Price
              </th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">
                TVL (USD)
              </th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Volume (USD)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.pair}-${row.poolId ?? 'no-pool'}`}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2 text-zinc-900 dark:text-zinc-100">
                  {row.pair}
                </td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">
                  {row.found ? 'Yes' : 'No'}
                </td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">
                  {row.poolId ?? 'N/A'}
                </td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">
                  {formatPrice(row.priceToken0)}
                </td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">
                  {formatPrice(row.priceToken1)}
                </td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">
                  {formatUsd(row.tvlUsd)}
                </td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">
                  {formatUsd(row.volumeUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type { UniswapRow };
