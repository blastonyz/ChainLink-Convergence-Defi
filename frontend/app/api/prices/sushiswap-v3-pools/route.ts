import { cacheExchange, createClient, fetchExchange, gql } from '@urql/core';
import { NextResponse } from 'next/server';

type PoolToken = {
	id: string;
	symbol: string;
	name: string;
};

type Pool = {
	id: string;
	token0: PoolToken;
	token1: PoolToken;
	token0Price: string;
	token1Price: string;
	totalValueLockedUSD: string;
	volumeUSD: string;
	feesUSD: string;
};

type TokenPriceRow = {
	symbol: string;
	priceUSD: number | null;
	sourcePoolId: string | null;
};

type Bundle = {
	ethPriceUSD: string;
};

type PoolsAndBundlesResult = {
	pools: Pool[];
	bundles: Bundle[];
};

const SUBGRAPH_ID = '5nnoU1nUFeWqtXgbpC54L9PWdpgo7Y9HYinR3uTMsfzs';
const SUBGRAPH_BASE =
	process.env.SUBGRAPH_BASE ?? 'https://gateway.thegraph.com/api';
const SUBGRAPH_API_KEY = process.env.SUBGRAPH_API_KEY;

const TOKENS = ['WETH', 'WBTC', 'USDC', 'DAI', 'LINK', 'ARB'];

const POOLS_AND_BUNDLES_QUERY = gql`
	query PoolsAndBundles($symbols: [String!]) {
		pools(
			first: 50
			orderBy: totalValueLockedUSD
			orderDirection: desc
			where: { token0_: { symbol_in: $symbols }, token1_: { symbol_in: $symbols } }
		) {
			id
			token0 {
				id
				symbol
				name
			}
			token1 {
				id
				symbol
				name
			}
			token0Price
			token1Price
			totalValueLockedUSD
			volumeUSD
			feesUSD
		}
		bundles(first: 1) {
			ethPriceUSD
		}
	}
`;

const TARGET_SYMBOLS = ['WETH', 'WBTC', 'USDC', 'DAI', 'LINK', 'ARB'];

function toNumber(value: string | null | undefined): number | null {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function isStable(symbol: string): boolean {
	const upper = symbol.toUpperCase();
	return upper === 'USDC' || upper === 'DAI';
}

function buildTokenPricesUSD(
	pools: Pool[],
	ethPriceUSD: number | null,
): TokenPriceRow[] {
	const bySymbol = new Map<string, TokenPriceRow>();

	for (const symbol of TARGET_SYMBOLS) {
		bySymbol.set(symbol, {
			symbol,
			priceUSD: null,
			sourcePoolId: null,
		});
	}

	for (const symbol of ['USDC', 'DAI']) {
		bySymbol.set(symbol, {
			symbol,
			priceUSD: 1,
			sourcePoolId: null,
		});
	}

	if (ethPriceUSD !== null) {
		bySymbol.set('WETH', {
			symbol: 'WETH',
			priceUSD: ethPriceUSD,
			sourcePoolId: null,
		});
	}

	for (const pool of pools) {
		const symbol0 = pool.token0.symbol.toUpperCase();
		const symbol1 = pool.token1.symbol.toUpperCase();
		const token0Price = toNumber(pool.token0Price);
		const token1Price = toNumber(pool.token1Price);

		if (token0Price === null || token1Price === null) continue;

		if (isStable(symbol0)) {
			const candidate = token0Price;
			const current = bySymbol.get(symbol1);
			if (current && current.priceUSD === null) {
				bySymbol.set(symbol1, {
					symbol: symbol1,
					priceUSD: candidate,
					sourcePoolId: pool.id,
				});
			}
		}

		if (isStable(symbol1)) {
			const candidate = token1Price;
			const current = bySymbol.get(symbol0);
			if (current && current.priceUSD === null) {
				bySymbol.set(symbol0, {
					symbol: symbol0,
					priceUSD: candidate,
					sourcePoolId: pool.id,
				});
			}
		}
	}

	const wethUsd = bySymbol.get('WETH')?.priceUSD ?? null;

	if (wethUsd !== null) {
		for (const pool of pools) {
			const symbol0 = pool.token0.symbol.toUpperCase();
			const symbol1 = pool.token1.symbol.toUpperCase();
			const token0Price = toNumber(pool.token0Price);
			const token1Price = toNumber(pool.token1Price);

			if (token0Price === null || token1Price === null) continue;

			if (symbol0 === 'WETH') {
				const candidate = token0Price * wethUsd;
				const current = bySymbol.get(symbol1);
				if (current && current.priceUSD === null) {
					bySymbol.set(symbol1, {
						symbol: symbol1,
						priceUSD: candidate,
						sourcePoolId: pool.id,
					});
				}
			}

			if (symbol1 === 'WETH') {
				const candidate = token1Price * wethUsd;
				const current = bySymbol.get(symbol0);
				if (current && current.priceUSD === null) {
					bySymbol.set(symbol0, {
						symbol: symbol0,
						priceUSD: candidate,
						sourcePoolId: pool.id,
					});
				}
			}
		}
	}

	return TARGET_SYMBOLS.map((symbol) => bySymbol.get(symbol)!).filter(Boolean);
}

function buildSubgraphUrl(): string {
	const base = SUBGRAPH_BASE.replace(/\/$/, '');
	return `${base}/subgraphs/id/${SUBGRAPH_ID}`;
}

function createPoolsClient() {
	if (!SUBGRAPH_API_KEY) {
		throw new Error('Missing SUBGRAPH_API_KEY in server environment');
	}

	return createClient({
		url: buildSubgraphUrl(),
		exchanges: [cacheExchange, fetchExchange],
		preferGetMethod: false,
		fetchOptions: {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${SUBGRAPH_API_KEY}`,
			},
		},
		requestPolicy: 'network-only',
	});
}

export async function GET() {
	try {
		const client = createPoolsClient();
		const result = await client
			.query<PoolsAndBundlesResult>(POOLS_AND_BUNDLES_QUERY, {
				symbols: TOKENS,
			})
			.toPromise();

		if (result.error) {
			return NextResponse.json(
				{
					source: 'sushiswap-v3-pools-subgraph',
					subgraphId: SUBGRAPH_ID,
					error: result.error.message,
				},
				{ status: 502 },
			);
		}

		const pools = result.data?.pools ?? [];
		const bundles = result.data?.bundles ?? [];
		const ethPriceUSD = toNumber(bundles[0]?.ethPriceUSD);
		const tokenPricesUSD = buildTokenPricesUSD(pools, ethPriceUSD);

		return NextResponse.json({
			source: 'sushiswap-v3-pools-subgraph',
			subgraphId: SUBGRAPH_ID,
			data: {
				bundles,
				pools,
				tokenPricesUSD,
			},
			requestedAt: new Date().toISOString(),
		});
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: 'Unexpected SushiSwap pools subgraph error';

		return NextResponse.json(
			{
				source: 'sushiswap-v3-pools-subgraph',
				subgraphId: SUBGRAPH_ID,
				error: message,
			},
			{ status: 502 },
		);
	}
}
