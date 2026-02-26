// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {ArbitrumCoreAddresses} from "../src/libraries/addresses/ArbitrumCoreAddresses.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

interface IPool {
	function getUserAccountData(address user)
		external
		view
		returns (
			uint256 totalCollateralBase,
			uint256 totalDebtBase,
			uint256 availableBorrowsBase,
			uint256 currentLiquidationThreshold,
			uint256 ltv,
			uint256 healthFactor
		);
}

interface IStrategyExecutor {
	function closePosition(address borrowAsset, address collateralAsset, uint256 rateMode) external;
}

/**
 * @title ClosePositionFlow
 * @notice Closes a leveraged position by repaying borrowed USDC and withdrawing WETH collateral
 *
 * Flow:
 * 1. Call executor's closePosition method to repay, withdraw, and convert WETH to ETH
 * 2. The executor handles all operations internally (approval, repayment, withdrawal, conversion)
 * 3. Query final position status to confirm closure
 */
contract ClosePositionFlow is Script {
	address internal constant USDC = ArbitrumCoreAddresses.USDC;
	address internal constant WETH = ArbitrumCoreAddresses.WETH;
	address internal constant AAVE_POOL = ArbitrumCoreAddresses.AAVE_V3_POOL;
	address internal constant DEFAULT_EXECUTOR = 0x17d132281849911e52942AB19Cd7Aee239abB549;

	// Aave rate mode: 2 = variable rate (stable is 1)
	uint256 internal constant RATE_MODE = uint256(2);

	error MissingExecutor();
	error NoDebtToRepay();

	function run() external {
		uint256 privateKey = vm.envUint("PRIVATE_KEY");
		address executorAddress = vm.envOr("EXECUTOR", DEFAULT_EXECUTOR);
		address usdc = vm.envOr("USDC_TOKEN", USDC);
		address weth = vm.envOr("WETH_TOKEN", WETH);
		address aavePool = vm.envOr("AAVE_POOL", AAVE_POOL);

		if (executorAddress == address(0)) revert MissingExecutor();

		vm.startBroadcast(privateKey);

		// Get account data before closing
		(
			uint256 totalCollateralBase,
			uint256 totalDebtBase,
			,
			,
			,
			uint256 healthFactor
		) = IPool(aavePool).getUserAccountData(executorAddress);

		console2.log("=== Position Status Before Close ===");
		console2.log("Total Collateral (USD basis)", totalCollateralBase);
		console2.log("Total Debt (USD basis)", totalDebtBase);
		console2.log("Health Factor (8 decimals)", healthFactor);

		// Get USDC balance before closing
		uint256 usdcBalance = IERC20(usdc).balanceOf(executorAddress);
		console2.log("USDC Balance", usdcBalance);

		// Step 1: Call closePosition on executor contract
		// This handles approval, repayment, withdrawal, and WETH->ETH conversion internally
		if (totalDebtBase > 0) {
			console2.log("Calling closePosition on executor...");
			IStrategyExecutor(executorAddress).closePosition(usdc, weth, RATE_MODE);
			console2.log("Position close transaction sent");
		} else {
			console2.log("No debt to repay");
		}

		// Final account state
		(
			uint256 finalCollateral,
			uint256 finalDebt,
			,
			,
			,
			uint256 finalHealthFactor
		) = IPool(aavePool).getUserAccountData(executorAddress);

		console2.log("=== Final Position Status ===");
		console2.log("Total Collateral (USD basis)", finalCollateral);
		console2.log("Total Debt (USD basis)", finalDebt);
		console2.log("Health Factor (8 decimals)", finalHealthFactor);

		vm.stopBroadcast();

		console2.log("Position closed successfully");
	}
}
