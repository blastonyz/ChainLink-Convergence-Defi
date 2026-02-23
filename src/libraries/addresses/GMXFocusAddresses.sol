// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

library GMXFocusAddresses {
	uint256 internal constant ARBITRUM_CHAIN_ID = 42161;

	address internal constant ARBITRUM_WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
	address internal constant ARBITRUM_USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
	address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

	address internal constant ARBITRUM_EXCHANGE_ROUTER = 0x1C3fa76e6E1088bCE750f23a5BFcffa1efEF6A41;
	address internal constant ARBITRUM_ROUTER_TOKEN_SPENDER =
		0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6;
	address internal constant ARBITRUM_ORDER_VAULT = 0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5;

	address internal constant ARBITRUM_GM_TOKEN_ETH_WETH_USDC =
		0x70d95587d40A2caf56bd97485aB3Eec10Bee6336;
}
