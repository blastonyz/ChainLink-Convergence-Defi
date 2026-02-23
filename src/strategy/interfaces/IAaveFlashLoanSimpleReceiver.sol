// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IAaveFlashLoanSimpleReceiver {
	function executeOperation(
		address asset,
		uint256 amount,
		uint256 premium,
		address initiator,
		bytes calldata params
	) external returns (bool);
}
