'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import UniswapPrices, { type UniswapRow } from './UniswapPrices';
import AaveTokens, {
  type AaveRewardTokenRow,
  type AaveTokenRow,
} from './AaveTokens';

type CoinGeckoResponse = {
  source: 'coingecko';
  vsCurrency: string;
  data: Record<string, Record<string, number>>;
  requestedAt: string;
  error?: string;
};

type BitgetItem = {
  symbol: string;
  price: string | null;
  open24h: string | null;
  high24h: string | null;
  low24h: string | null;
  change24h: string | null;
};

type BitgetResponse = {
  source: 'bitget';
  data: BitgetItem[];
  requestedAt: string;
  error?: string;
};

type UniswapV4Comparison = {
  pair: string;
  found: boolean;
  poolId: string | null;
  poolTokens?: {
    token0: string;
    token1: string;
  };
  price: Record<string, number | string | null>;
  liquidity: {
    raw: string | null;
    totalValueLockedUSD: number | string | null;
    volumeUSD: number | string | null;
  };
};

type UniswapV4Response = {
  source: 'uniswap-v3-subgraph';
  pairsRequested: string[];
  comparisons: UniswapV4Comparison[];
  requestedAt: string;
  error?: string;
};

type AaveResponse = {
  source: 'aave-v3-subgraph';
  subgraphId: string;
  tokens: AaveTokenRow[];
  rewardTokens: AaveRewardTokenRow[];
  requestedAt: string;
  error?: string;
};

type PriceRow = {
  label: string;
  coingecko: number | null;
  bitget: string | null;
};

const COINGECKO_IDS = 'bitcoin,ethereum';
const BITGET_SYMBOLS = 'BTCUSDT,ETHUSDT';

export default function PriceComparison() {
  const [coingecko, setCoingecko] = useState<CoinGeckoResponse | null>(null);
  const [bitget, setBitget] = useState<BitgetResponse | null>(null);
  const [uniswapV4, setUniswapV4] = useState<UniswapV4Response | null>(null);
  const [aave, setAave] = useState<AaveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPrices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [coingeckoRes, bitgetRes, uniswapV4Res, aaveRes] =
        await Promise.all([
        fetch(
          `/api/prices/coingecko?ids=${COINGECKO_IDS}&vs_currency=usd`,
          {
            cache: 'no-store',
          },
        ),
        fetch(`/api/prices/bitget?symbols=${BITGET_SYMBOLS}`, {
          cache: 'no-store',
        }),
        fetch('/api/prices/uniswap-v4', {
          cache: 'no-store',
        }),
        fetch('/api/prices/aave', {
          cache: 'no-store',
        }),
      ]);

      const [coingeckoJson, bitgetJson, uniswapV4Json, aaveJson] =
        await Promise.all([
          coingeckoRes.json() as Promise<CoinGeckoResponse>,
          bitgetRes.json() as Promise<BitgetResponse>,
          uniswapV4Res.json() as Promise<UniswapV4Response>,
          aaveRes.json() as Promise<AaveResponse>,
        ]);

      if (!coingeckoRes.ok) {
        throw new Error(coingeckoJson.error ?? 'CoinGecko request failed');
      }

      if (!bitgetRes.ok) {
        throw new Error(bitgetJson.error ?? 'Bitget request failed');
      }

      if (!uniswapV4Res.ok) {
        throw new Error(uniswapV4Json.error ?? 'Uniswap v3 request failed');
      }

      if (!aaveRes.ok) {
        throw new Error(aaveJson.error ?? 'Aave request failed');
      }

      setCoingecko(coingeckoJson);
      setBitget(bitgetJson);
      setUniswapV4(uniswapV4Json);
      setAave(aaveJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrices();
  }, [loadPrices]);

  const toNumber = (value: number | string | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const rows = useMemo<PriceRow[]>(() => {
    if (!coingecko || !bitget) return [];

    const bitgetBySymbol = new Map(
      bitget.data.map((item) => [item.symbol, item.price]),
    );

    return [
      {
        label: 'BTC',
        coingecko: coingecko.data.bitcoin?.usd ?? null,
        bitget: bitgetBySymbol.get('BTCUSDT') ?? null,
      },
      {
        label: 'ETH',
        coingecko: coingecko.data.ethereum?.usd ?? null,
        bitget: bitgetBySymbol.get('ETHUSDT') ?? null,
      },
    ];
  }, [coingecko, bitget]);

  const uniswapRows = useMemo<UniswapRow[]>(() => {
    if (!uniswapV4) return [];

    return uniswapV4.comparisons.map((comparison) => {
      const price = comparison.price;
      const [base, quote] = comparison.pair.split('/');

      const baseInQuoteKey = base && quote ? `${base}_in_${quote}` : null;
      const quoteInBaseKey = base && quote ? `${quote}_in_${base}` : null;

      return {
        pair: comparison.pair,
        found: comparison.found,
        poolId: comparison.poolId,
        priceToken0: toNumber(
          (baseInQuoteKey ? price[baseInQuoteKey] : null) ??
            price.token0 ??
            price.token0Price ??
            price.price0 ??
            null,
        ),
        priceToken1: toNumber(
          (quoteInBaseKey ? price[quoteInBaseKey] : null) ??
            price.token1 ??
            price.token1Price ??
            price.price1 ??
            null,
        ),
        tvlUsd: toNumber(comparison.liquidity.totalValueLockedUSD),
        volumeUsd: toNumber(comparison.liquidity.volumeUSD),
      };
    });
  }, [uniswapV4]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (!uniswapV4) return;

    console.group('Uniswap v3 debug');
    console.log('Raw response', uniswapV4);
    console.log('First comparison', uniswapV4.comparisons[0]);
    console.log('First comparison price object', uniswapV4.comparisons[0]?.price);
    console.table(
      uniswapRows.map((row) => ({
        pair: row.pair,
        poolId: row.poolId,
        priceToken0: row.priceToken0,
        priceToken1: row.priceToken1,
        tvlUsd: row.tvlUsd,
        volumeUsd: row.volumeUsd,
      })),
    );
    console.groupEnd();
  }, [uniswapV4, uniswapRows]);

  return (
    <section className="w-full max-w-3xl rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Coin Prices
        </h2>
        <button
          type="button"
          onClick={() => void loadPrices()}
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-600 dark:text-zinc-400">Loading prices...</p>
      ) : error ? (
        <p className="text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">
                    Asset
                  </th>
                  <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">
                    CoinGecko (USD)
                  </th>
                  <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">
                    Bitget (USDT)
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2 text-zinc-900 dark:text-zinc-100">
                      {row.label}
                    </td>
                    <td className="py-2 text-zinc-700 dark:text-zinc-300">
                      {row.coingecko !== null ? `$${row.coingecko}` : 'N/A'}
                    </td>
                    <td className="py-2 text-zinc-700 dark:text-zinc-300">
                      {row.bitget !== null ? row.bitget : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <UniswapPrices rows={uniswapRows} />
          <AaveTokens
            tokens={aave?.tokens ?? []}
            rewardTokens={aave?.rewardTokens ?? []}
          />
        </div>
      )}
    </section>
  );
}
