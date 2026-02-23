export const UNISWAP_V3_MAINNET_TOKENS = {
  WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
  ARB: '0x912ce59144191c1204e64559fe8253a0e49e6548',
  LINK: '0x514910771af9ca656af840dff83e8264ecf986ca',
} as const;

export const UNISWAP_V3_TARGET_PAIRS = [
  ['WETH', 'USDC'],
  ['WETH', 'DAI'],
  ['USDC', 'DAI'],
  ['ARB', 'DAI'],
  ['ARB', 'USDT'],
  ['LINK', 'USDC'],
  ['LINK', 'USDT'],
  ['LINK', 'DAI'],
] as const;

export const UNISWAP_V3_FILTER_TOKEN_ADDRESSES = Object.values(
  UNISWAP_V3_MAINNET_TOKENS,
).map((address) => address.toLowerCase());
