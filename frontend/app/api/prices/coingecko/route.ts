import { NextRequest, NextResponse } from 'next/server';

import { fetchJson, parseCsvParam } from '@/lib/api/http';

type CoinGeckoSimplePrice = Record<
  string,
  {
    [currency: string]: number;
  }
>;

type CoinGeckoOhlcRaw = [number, number, number, number, number];

const DEFAULT_IDS = ['ethereum', 'bitcoin'];
const DEFAULT_VS_CURRENCY = 'usd';
const DEFAULT_OHLC_ID = 'ethereum';
const DEFAULT_OHLC_DAYS = '7';
const MAX_IDS = 50;

const VALID_OHLC_DAYS = new Set([
  '1',
  '7',
  '14',
  '30',
  '90',
  '180',
  '365',
  'max',
]);

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

function buildCoinGeckoOhlcUrl(id: string, vsCurrency: string, days: string): string {
  const usePro = Boolean(process.env.COINGECKO_PRO_API_KEY);
  const baseUrl = usePro
    ? 'https://pro-api.coingecko.com/api/v3'
    : 'https://api.coingecko.com/api/v3';

  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    days,
  });

  return `${baseUrl}/coins/${encodeURIComponent(id)}/ohlc?${params.toString()}`;
}

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get('type') ?? 'simple';
    const apiKey = process.env.COINGECKO_PRO_API_KEY;

    if (type === 'ohlc') {
      const id = request.nextUrl.searchParams.get('id') ?? DEFAULT_OHLC_ID;
      const vsCurrency =
        request.nextUrl.searchParams.get('vs_currency') ?? DEFAULT_VS_CURRENCY;
      const daysParam = request.nextUrl.searchParams.get('days') ?? DEFAULT_OHLC_DAYS;
      const days = VALID_OHLC_DAYS.has(daysParam) ? daysParam : DEFAULT_OHLC_DAYS;

      const url = buildCoinGeckoOhlcUrl(id, vsCurrency, days);
      const raw = await fetchJson<CoinGeckoOhlcRaw[]>(url, {
        headers: apiKey ? { 'x-cg-pro-api-key': apiKey } : undefined,
      });

      const data = raw.map(([timestamp, open, high, low, close]) => ({
        timestamp,
        open,
        high,
        low,
        close,
      }));

      return NextResponse.json({
        source: 'coingecko',
        type: 'ohlc',
        id,
        vsCurrency,
        days,
        data,
        requestedAt: new Date().toISOString(),
      });
    }

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
