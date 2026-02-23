import { gql } from 'urql';
import { NextResponse } from 'next/server';
import { createUniswapV3Client } from '@/lib/subgraph/uniswapV3Client';
import {
	UNISWAP_V3_FILTER_TOKEN_ADDRESSES,
	UNISWAP_V3_TARGET_PAIRS,
} from '@/lib/constants/uniswap';

type SubgraphToken = {
	id: string;
	symbol: string;
};

type SubgraphPool = {
	id: string;
	liquidity?: string | null;
	totalValueLockedUSD?: string | null;
	volumeUSD?: string | null;
	token0Price?: string | null;
	token1Price?: string | null;
	token0: SubgraphToken;
	token1: SubgraphToken;
};

type PoolsQueryResult = {
	pools: SubgraphPool[];
};

const POOLS_QUERY = gql`
	query PoolsByTokenAddresses($tokenAddresses: [String!]) {
		pools(
			first: 200
			orderBy: totalValueLockedUSD
			orderDirection: desc
			where: { token0_in: $tokenAddresses, token1_in: $tokenAddresses }
		) {
			id
			liquidity
			totalValueLockedUSD
			volumeUSD
			sqrtPrice
			token0Price
			token1Price
			token0 {
				id
				symbol
			}
			token1 {
				id
				symbol
			}
		}
	}
`;

function normalizeSymbol(symbol: string): string {
	return symbol.toUpperCase();
}

function pairKey(a: string, b: string): string {
	return [normalizeSymbol(a), normalizeSymbol(b)].sort().join('/');
}

function parseNumeric(value: string | null | undefined): number | null {
	if (!value) return null;
	const num = Number(value);
	return Number.isFinite(num) ? num : null;
}

export async function GET() {
	try {
		const client = createUniswapV3Client();
		const result = await client
			.query<PoolsQueryResult>(POOLS_QUERY, {
				tokenAddresses: UNISWAP_V3_FILTER_TOKEN_ADDRESSES,
			})
			.toPromise();

		if (result.error) {
			return NextResponse.json(
				{
					source: 'uniswap-v3-subgraph',
					error: result.error.message,
				},
				{ status: 502 },
			);
		}

		const pools = result.data?.pools ?? [];

		const bestByPair = new Map<string, SubgraphPool>();

		for (const pool of pools) {
			const key = pairKey(pool.token0.symbol, pool.token1.symbol);
			const current = bestByPair.get(key);

			if (!current) {
				bestByPair.set(key, pool);
				continue;
			}

			const currentTvl = parseNumeric(current.totalValueLockedUSD) ?? 0;
			const nextTvl = parseNumeric(pool.totalValueLockedUSD) ?? 0;

			if (nextTvl > currentTvl) {
				bestByPair.set(key, pool);
			}
		}

		const comparisons = UNISWAP_V3_TARGET_PAIRS.map(([base, quote]) => {
			const key = pairKey(base, quote);
			const pool = bestByPair.get(key);

			if (!pool) {
				return {
					pair: `${base}/${quote}`,
					found: false,
					poolId: null,
					price: {
						[`${base}_in_${quote}`]: null,
						[`${quote}_in_${base}`]: null,
					},
					liquidity: {
						raw: null,
						totalValueLockedUSD: null,
						volumeUSD: null,
					},
				};
			}

			const token0 = normalizeSymbol(pool.token0.symbol);
			const token1 = normalizeSymbol(pool.token1.symbol);
			const token0Price = parseNumeric(pool.token0Price);
			const token1Price = parseNumeric(pool.token1Price);

			let baseInQuote: number | null = null;
			let quoteInBase: number | null = null;

			if (token0 === base && token1 === quote) {
				baseInQuote = token1Price;
				quoteInBase = token0Price;
			} else if (token0 === quote && token1 === base) {
				baseInQuote = token0Price;
				quoteInBase = token1Price;
			}

			return {
				pair: `${base}/${quote}`,
				found: true,
				poolId: pool.id,
				poolTokens: {
					token0,
					token1,
				},
				price: {
					[`${base}_in_${quote}`]: baseInQuote,
					[`${quote}_in_${base}`]: quoteInBase,
				},
				liquidity: {
					raw: pool.liquidity ?? null,
					totalValueLockedUSD: parseNumeric(pool.totalValueLockedUSD),
					volumeUSD: parseNumeric(pool.volumeUSD),
				},
			};
		});

		return NextResponse.json({
			source: 'uniswap-v3-subgraph',
			pairsRequested: UNISWAP_V3_TARGET_PAIRS.map(([a, b]) => `${a}/${b}`),
			comparisons,
			requestedAt: new Date().toISOString(),
		});
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: 'Unexpected Uniswap v3 subgraph error';

		return NextResponse.json(
			{
				source: 'uniswap-v3-subgraph',
				error: message,
			},
			{ status: 502 },
		);
	}
}
