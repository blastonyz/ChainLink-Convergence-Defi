// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IAave {
	function supply(
		address asset,
		uint256 amount,
		address onBehalfOf,
		uint16 referralCode
	) external;

	function setUserUseReserveAsCollateral(address asset, bool useAsCollateral) external;

	function borrow(
		address asset,
		uint256 amount,
		uint256 interestRateMode,
		uint16 referralCode,
		address onBehalfOf
	) external;

	function repay(
		address asset,
		uint256 amount,
		uint256 interestRateMode,
		address onBehalfOf
	) external returns (uint256);

	function flashLoanSimple(
		address receiverAddress,
		address asset,
		uint256 amount,
		bytes calldata params,
		uint16 referralCode
	) external;
}
