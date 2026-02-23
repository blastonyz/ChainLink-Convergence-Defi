// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IUniswap} from "./interfaces/IUniswap.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

abstract contract UniswapBase {
	IUniswap public immutable uniswap;

	constructor(address uniswapRouter) {
		require(uniswapRouter != address(0), "UNISWAP_ROUTER_ZERO");
		uniswap = IUniswap(uniswapRouter);
	}

	function _uniswapSwapExactTokensForTokens(
		address tokenIn,
		address tokenOut,
		uint24 fee,
		uint256 amountIn,
		uint256 minOut,
		address recipient
	) internal returns (uint256 amountOut) {
		IERC20(tokenIn).approve(address(uniswap), amountIn);

		IUniswap.ExactInputSingleParams memory params = IUniswap.ExactInputSingleParams({
			tokenIn: tokenIn,
			tokenOut: tokenOut,
			fee: fee,
			recipient: recipient,
			deadline: block.timestamp,
			amountIn: amountIn,
			amountOutMinimum: minOut,
			sqrtPriceLimitX96: 0
		});

		amountOut = uniswap.exactInputSingle(params);
	}

	function _uniswapMulticall(bytes[] memory data)
		internal
		returns (bytes[] memory results)
	{
		results = uniswap.multicall(data);
	}
}
