import { NextRequest, NextResponse } from 'next/server';

import { fetchJson, parseCsvParam } from '@/lib/api/http';

type CoinGeckoSimplePrice = Record<
  string,
  {
    [currency: string]: number;
  }
>;

const DEFAULT_IDS = ['ethereum', 'bitcoin'];
const DEFAULT_VS_CURRENCY = 'usd';
const MAX_IDS = 50;

function buildCoinGeckoUrl(ids: string[], vsCurrency: string): string {
  const usePro = Boolean(process.env.COINGECKO_PRO_API_KEY);
  const baseUrl = usePro
    ? 'https://pro-api.coingecko.com/api/v3'
    : 'https://api.coingecko.com/api/v3';

  const params = new URLSearchParams({
    ids: ids.join(','),
    vs_currencies: vsCurrency,
    include_24hr_change: 'true',
  });

  return `${baseUrl}/simple/price?${params.toString()}`;
}

export async function GET(request: NextRequest) {
  try {
    const idsQuery = request.nextUrl.searchParams.get('ids');
    const vsCurrency =
      request.nextUrl.searchParams.get('vs_currency') ?? DEFAULT_VS_CURRENCY;

    const ids = parseCsvParam(idsQuery);
    const targetIds = ids.length > 0 ? ids : DEFAULT_IDS;

    if (targetIds.length > MAX_IDS) {
      return NextResponse.json(
        {
          error: `Too many ids. Max supported is ${MAX_IDS}.`,
        },
        { status: 400 },
      );
    }

    const apiKey = process.env.COINGECKO_PRO_API_KEY;
    const url = buildCoinGeckoUrl(targetIds, vsCurrency);

    const data = await fetchJson<CoinGeckoSimplePrice>(url, {
      headers: apiKey ? { 'x-cg-pro-api-key': apiKey } : undefined,
    });

    return NextResponse.json({
      source: 'coingecko',
      vsCurrency,
      data,
      requestedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected CoinGecko error';

    return NextResponse.json(
      {
        source: 'coingecko',
        error: message,
      },
      { status: 502 },
    );
  }
}
