// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IAaveFlashLoanSimpleReceiver} from "./interfaces/IAaveFlashLoanSimpleReceiver.sol";
import {Action} from "./StrategyTypes.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

abstract contract ArbitrageCase is IAaveFlashLoanSimpleReceiver {
	event ArbitrageRequested(address indexed flashAsset, uint256 flashAmount, address indexed beneficiary);
	event ArbitrageExecuted(
		address indexed flashAsset,
		uint256 flashAmount,
		uint256 premium,
		uint256 amountOwed,
		uint256 finalBalance,
		uint256 profit,
		address indexed beneficiary
	);

	error InvalidArbitrageActions();
	error InvalidFlashAmount();
	error InvalidBeneficiary();
	error InvalidFlashCaller();
	error InvalidInitiator();
	error InsufficientToRepay(uint256 finalBalance, uint256 amountOwed);

	struct ArbitrageContext {
		Action legA;
		Action legB;
		address beneficiary;
	}

	function _executeArbitrage(
		Action[] memory actions,
		address flashAsset,
		uint256 flashAmount,
		address beneficiary
	) internal {
		if (actions.length < 2) revert InvalidArbitrageActions();
		if (flashAmount == 0) revert InvalidFlashAmount();
		if (beneficiary == address(0)) revert InvalidBeneficiary();

		bytes memory params = abi.encode(
			ArbitrageContext({legA: actions[0], legB: actions[1], beneficiary: beneficiary})
		);

		emit ArbitrageRequested(flashAsset, flashAmount, beneficiary);
		_requestFlashloan(flashAsset, flashAmount, params);
	}

	function executeOperation(
		address asset,
		uint256 amount,
		uint256 premium,
		address initiator,
		bytes calldata params
	) external override returns (bool) {
		if (msg.sender != _aavePoolAddress()) revert InvalidFlashCaller();
		if (initiator != address(this)) revert InvalidInitiator();

		ArbitrageContext memory context = abi.decode(params, (ArbitrageContext));

		uint256 midAmount = _swapByDex(context.legA, amount, address(this));
		uint256 finalAmount = _swapByDex(context.legB, midAmount, address(this));

		uint256 amountOwed = amount + premium;
		if (finalAmount < amountOwed) {
			revert InsufficientToRepay(finalAmount, amountOwed);
		}

		IERC20(asset).approve(_aavePoolAddress(), amountOwed);

		uint256 profit = finalAmount - amountOwed;
		if (profit > 0) {
			IERC20(asset).transfer(context.beneficiary, profit);
		}

		emit ArbitrageExecuted(
			asset,
			amount,
			premium,
			amountOwed,
			finalAmount,
			profit,
			context.beneficiary
		);

		return true;
	}

	function _requestFlashloan(address flashAsset, uint256 flashAmount, bytes memory params)
		internal
		virtual;

	function _aavePoolAddress() internal view virtual returns (address);

	function _swapByDex(Action memory action, uint256 amountIn, address recipient)
		internal
		virtual
		returns (uint256 amountOut);
}
