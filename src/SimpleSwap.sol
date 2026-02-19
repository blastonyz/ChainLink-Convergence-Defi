// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ISwapRouter} from "v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {UniswapV3FocusAddresses} from "./libraries/addresses/UniswapV3FocusAddresses.sol";

contract SimpleSwap {
	ISwapRouter public immutable swapRouter;

	uint24 public constant DEFAULT_POOL_FEE = 500;

	event EthToUsdcSwapped(
		address indexed sender,
		address indexed recipient,
		uint256 amountIn,
		uint256 amountOut,
		uint24 fee
	);

	constructor(address router) {
		if (router == address(0)) {
			swapRouter = ISwapRouter(UniswapV3FocusAddresses.UNISWAP_V3_SWAP_ROUTER);
			return;
		}

		swapRouter = ISwapRouter(router);
	}

	function swapEthToUsdc(
		uint256 amountOutMinimum
	) external payable returns (uint256 amountOut) {
		return
			swapEthToUsdcWithFeeAndRecipient(
				amountOutMinimum,
				DEFAULT_POOL_FEE,
				msg.sender
			);
	}

	function swapEthToUsdcWithFeeAndRecipient(
		uint256 amountOutMinimum,
		uint24 fee,
		address recipient
	) public payable returns (uint256 amountOut) {
		require(msg.value > 0, "ETH_IN_REQUIRED");
		require(recipient != address(0), "INVALID_RECIPIENT");

		ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
			.ExactInputSingleParams({
				tokenIn: UniswapV3FocusAddresses.WETH,
				tokenOut: UniswapV3FocusAddresses.USDC,
				fee: fee,
				recipient: recipient,
				deadline: block.timestamp,
				amountIn: msg.value,
				amountOutMinimum: amountOutMinimum,
				sqrtPriceLimitX96: 0
			});

		amountOut = swapRouter.exactInputSingle{value: msg.value}(params);

		emit EthToUsdcSwapped(msg.sender, recipient, msg.value, amountOut, fee);
	}

	receive() external payable {}
}

