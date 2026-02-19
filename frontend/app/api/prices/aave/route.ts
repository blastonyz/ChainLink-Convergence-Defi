import { gql } from 'urql';
import { NextResponse } from 'next/server';
import { createAaveV3Client } from '@/lib/subgraph/aaveClient';

type AaveToken = {
  id: string;
  name: string;
  symbol: string;
  decimals: string;
};

type AaveRewardToken = {
  id: string;
  token: {
    id: string;
  };
  type: string;
  _distributionEnd: string;
};

type AaveQueryResult = {
  tokens: AaveToken[];
  rewardTokens: AaveRewardToken[];
};

const AAVE_TOKENS_QUERY = gql`
  query AaveTokensAndRewardTokens {
    tokens(first: 5) {
      id
      name
      symbol
      decimals
    }
    rewardTokens(first: 5) {
      id
      token {
        id
      }
      type
      _distributionEnd
    }
  }
`;

export async function GET() {
  try {
    const client = createAaveV3Client();
    const result = await client.query<AaveQueryResult>(AAVE_TOKENS_QUERY, {}).toPromise();

    if (result.error) {
      return NextResponse.json(
        {
          source: 'aave-v3-subgraph',
          error: result.error.message,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      source: 'aave-v3-subgraph',
      subgraphId: 'C2zniPn45RnLDGzVeGZCx2Sw3GXrbc9gL4ZfL8B8Em2j',
      tokens: result.data?.tokens ?? [],
      rewardTokens: result.data?.rewardTokens ?? [],
      requestedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected Aave subgraph error';

    return NextResponse.json(
      {
        source: 'aave-v3-subgraph',
        error: message,
      },
      { status: 502 },
    );
  }
}
