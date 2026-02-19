import { cacheExchange, createClient, fetchExchange } from '@urql/core';

const SUBGRAPH_BASE =
  process.env.SUBGRAPH_BASE ?? 'https://gateway.thegraph.com/api';
const SUBGRAPH_API_KEY = process.env.SUBGRAPH_API_KEY;
const SUBGRAPH_UNISWAP_V3_ID =
  process.env.SUBGRAPH_UNISWAP_V3_ID ??
  process.env.SUBGRAPH_UNISWAP_V4_ID ??
  'subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV';

function buildSubgraphUrl(): string {
  const base = SUBGRAPH_BASE.replace(/\/$/, '');
  const subgraphPath = SUBGRAPH_UNISWAP_V3_ID.replace(/^\//, '');

  if (subgraphPath.startsWith('subgraphs/')) {
    return `${base}/${subgraphPath}`;
  }

  return `${base}/subgraphs/id/${subgraphPath}`;
}

export function createUniswapV3Client() {
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

export const createUniswapV4Client = createUniswapV3Client;
