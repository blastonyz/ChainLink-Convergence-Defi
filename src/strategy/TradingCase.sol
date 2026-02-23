// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Action} from "./StrategyTypes.sol";

abstract contract TradingCase {
	event TradingStepExecuted(
		uint256 indexed index,
		uint8 dexId,
		address indexed tokenIn,
		address indexed tokenOut,
		uint256 amountIn,
		uint256 amountOut,
		address recipient
	);

	error EmptyActions();
	error InvalidAmountIn(uint256 index);

	function _executeTrading(Action[] calldata actions, address defaultBeneficiary)
		internal
		returns (uint256 finalAmountOut)
	{
		if (actions.length == 0) revert EmptyActions();

		uint256 rollingAmount = 0;

		for (uint256 index = 0; index < actions.length; index++) {
			Action calldata action = actions[index];

			uint256 amountIn = action.amountIn;
			if (index > 0 && amountIn == 0) {
				amountIn = rollingAmount;
			}
			if (amountIn == 0) revert InvalidAmountIn(index);

			address recipient = index == actions.length - 1
				? (action.beneficiary == address(0) ? defaultBeneficiary : action.beneficiary)
				: address(this);

			rollingAmount = _swapByDex(action, amountIn, recipient);

			emit TradingStepExecuted(
				index,
				action.dexId,
				action.tokenIn,
				action.tokenOut,
				amountIn,
				rollingAmount,
				recipient
			);
		}

		finalAmountOut = rollingAmount;
	}

	function _swapByDex(Action memory action, uint256 amountIn, address recipient)
		internal
		virtual
		returns (uint256 amountOut);
}
