import { cacheExchange, createClient, fetchExchange } from '@urql/core';

const SUBGRAPH_BASE =
  process.env.SUBGRAPH_BASE ?? 'https://gateway.thegraph.com/api';
const SUBGRAPH_API_KEY = process.env.SUBGRAPH_API_KEY;
const SUBGRAPH_AAVE_V3_ID =
  process.env.SUBGRAPH_AAVE_V3_ID ??
  process.env.SUBGRAPH_AAVE_ID ??
  'subgraphs/id/C2zniPn45RnLDGzVeGZCx2Sw3GXrbc9gL4ZfL8B8Em2j';

function buildSubgraphUrl(): string {
  const base = SUBGRAPH_BASE.replace(/\/$/, '');
  const subgraphPath = SUBGRAPH_AAVE_V3_ID.replace(/^\//, '');

  if (subgraphPath.startsWith('subgraphs/')) {
    return `${base}/${subgraphPath}`;
  }

  return `${base}/subgraphs/id/${subgraphPath}`;
}

export function createAaveV3Client() {
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
