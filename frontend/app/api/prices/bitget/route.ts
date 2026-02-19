import { NextRequest, NextResponse } from 'next/server';

import { fetchJson, parseCsvParam } from '@/lib/api/http';

type BitgetTicker = {
  symbol: string;
  lastPr: string;
  open24h?: string;
  high24h?: string;
  low24h?: string;
  change24h?: string;
};

type BitgetTickersResponse = {
  code: string;
  msg: string;
  requestTime: number;
  data: BitgetTicker[];
};

const DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'ARBUSDT'];
const MAX_SYMBOLS = 20;

function normalizeSymbol(symbol: string): string {
  return symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export async function GET(request: NextRequest) {
  try {
    const symbolsQuery = request.nextUrl.searchParams.get('symbols');
    const symbols = parseCsvParam(symbolsQuery).map(normalizeSymbol);
    const targetSymbols = symbols.length > 0 ? symbols : DEFAULT_SYMBOLS;

    if (targetSymbols.length > MAX_SYMBOLS) {
      return NextResponse.json(
        {
          error: `Too many symbols. Max supported is ${MAX_SYMBOLS}.`,
        },
        { status: 400 },
      );
    }

    const url = 'https://api.bitget.com/api/v2/spot/market/tickers';
    const response = await fetchJson<BitgetTickersResponse>(url);

    if (response.code !== '00000') {
      return NextResponse.json(
        {
          source: 'bitget',
          error: `Bitget error: ${response.msg} (${response.code})`,
        },
        { status: 502 },
      );
    }

    const bySymbol = new Map(
      response.data.map((ticker) => [normalizeSymbol(ticker.symbol), ticker]),
    );

    const data = targetSymbols.map((symbol) => {
      const ticker = bySymbol.get(symbol);

      return {
        symbol,
        price: ticker?.lastPr ?? null,
        open24h: ticker?.open24h ?? null,
        high24h: ticker?.high24h ?? null,
        low24h: ticker?.low24h ?? null,
        change24h: ticker?.change24h ?? null,
      };
    });

    return NextResponse.json({
      source: 'bitget',
      data,
      requestedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected Bitget error';

    return NextResponse.json(
      {
        source: 'bitget',
        error: message,
      },
      { status: 502 },
    );
  }
}
