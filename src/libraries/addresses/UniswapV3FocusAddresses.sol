// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

library UniswapV3FocusAddresses {
    uint256 internal constant CHAIN_ID = 1;

    string internal constant SUBGRAPH_ID = "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV";
    address internal constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;

    address internal constant ETH = address(0);
    address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address internal constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    address internal constant ARB = 0x912CE59144191C1204E64559FE8253a0e49E6548;
    address internal constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address internal constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address internal constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address internal constant LINK = 0x514910771AF9Ca656af840dff83E8264EcF986CA;

    address internal constant UNISWAP_POOL_MANAGER = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address internal constant UNISWAP_V3_SWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address internal constant SUSHISWAP_V2_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    address internal constant UNISWAP_UNIVERSAL_ROUTER = 0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B;
    address internal constant UNISWAP_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11FE88;
    address internal constant UNISWAP_STATE_VIEW = 0x61fFE014bA17989E743c5F6cB21bF9697530B21e;
    address internal constant UNISWAP_QUOTER = 0x61fFE014bA17989E743c5F6cB21bF9697530B21e;
    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    struct Pair {
        address base;
        address quote;
    }

    function targetPairs() internal pure returns (Pair[8] memory pairs) {
        pairs[0] = Pair({base: ETH, quote: USDC});
        pairs[1] = Pair({base: ETH, quote: DAI});
        pairs[2] = Pair({base: USDC, quote: DAI});
        pairs[3] = Pair({base: ARB, quote: DAI});
        pairs[4] = Pair({base: ARB, quote: USDT});
        pairs[5] = Pair({base: LINK, quote: USDC});
        pairs[6] = Pair({base: LINK, quote: USDT});
        pairs[7] = Pair({base: LINK, quote: DAI});
    }
}
