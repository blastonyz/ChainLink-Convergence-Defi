// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ISushi} from "./interfaces/ISushi.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

abstract contract SushiBase {
	ISushi public immutable sushi;

	constructor(address sushiRouter) {
		require(sushiRouter != address(0), "SUSHI_ROUTER_ZERO");
		sushi = ISushi(sushiRouter);
	}

	function _sushiSwapExactTokensForTokens(
		address tokenIn,
		address tokenOut,
		uint24 fee,
		uint256 amountIn,
		uint256 minOut,
		address recipient
	) internal returns (uint256 amountOut) {
		fee;
		IERC20(tokenIn).approve(address(sushi), amountIn);

		address[] memory path = new address[](2);
		path[0] = tokenIn;
		path[1] = tokenOut;

		uint256[] memory amounts = sushi.swapExactTokensForTokens(
			amountIn,
			minOut,
			path,
			recipient,
			block.timestamp
		);

		amountOut = amounts[amounts.length - 1];
	}
}
