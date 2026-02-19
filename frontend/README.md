This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Price API Routes

This frontend exposes backend API routes to fetch coin prices from CoinGecko and Bitget.

### 1) CoinGecko

- Route: `/api/prices/coingecko`
- Query params:
	- `ids`: comma-separated CoinGecko IDs (example: `ethereum,bitcoin`)
	- `vs_currency`: quote currency (default: `usd`)
- Example:
	- `/api/prices/coingecko?ids=ethereum,bitcoin&vs_currency=usd`

If `COINGECKO_PRO_API_KEY` is set, the route uses `pro-api.coingecko.com`; otherwise it uses the public API.

### 2) Bitget

- Route: `/api/prices/bitget`
- Query params:
	- `symbols`: comma-separated symbols (example: `BTCUSDT,ETHUSDT`)
- Example:
	- `/api/prices/bitget?symbols=BTCUSDT,ETHUSDT`

### 3) Uniswap v4 (The Graph Gateway)

- Route: `/api/prices/uniswap-v4`
- Uses `urql` server-side client with Gateway API key in request header.
- Returns normalized JSON with prices and liquidity for at least these pairs:
	- `ETH/USDC`
	- `ETH/DAI`
	- `USDC/DAI`
	- `LINK/ETH`
	- `ARB/USDC`

### Environment variables

Copy `.env.example` to `.env.local` and set:

- `COINGECKO_PRO_API_KEY` (optional)
- `SUBGRAPH_API_KEY` (required for `/api/prices/uniswap-v4`)
- `SUBGRAPH_BASE` (optional, default: `https://gateway.thegraph.com/api`)
- `SUBGRAPH_UNISWAP_V4_ID` (optional)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
