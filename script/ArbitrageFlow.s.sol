// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {StrategyExecutor} from "../src/strategy/StrategyExecutor.sol";
import {Action, OperationType} from "../src/strategy/StrategyTypes.sol";

interface IExecutorRouters {
	function uniswap() external view returns (address);
	function sushi() external view returns (address);
}

contract ArbitrageFlow is Script {
	address internal constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
	address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
	address internal constant DEFAULT_EXECUTOR = 0x21131aB05A31E97902e04f9dA60a2D53ADD82121;
	bytes4 internal constant INSUFFICIENT_TO_REPAY_SELECTOR =
		bytes4(keccak256("InsufficientToRepay(uint256,uint256)"));

	function run() external {
		uint256 privateKey = vm.envUint("PRIVATE_KEY");
		address executorAddress = vm.envOr("EXECUTOR", DEFAULT_EXECUTOR);
		address beneficiary = vm.envOr("BENEFICIARY", vm.addr(privateKey));

		uint256 flashAmount = vm.envOr("FLASH_AMOUNT_USDC", uint256(1_000_000e6));
		uint256 minWethOut = vm.envOr("MIN_WETH_OUT", uint256(0));
		uint256 minUsdcOut = vm.envOr("MIN_USDC_OUT", uint256(0));
		uint24 feeUsdcToEth = uint24(vm.envOr("FEE_USDC_TO_ETH", uint256(3000)));
		uint24 feeEthToUsdc = uint24(vm.envOr("FEE_ETH_TO_USDC", uint256(3000)));
		bool startOnUniswap = vm.envOr("START_ON_UNISWAP", true);
		bool autoTuneFlash = vm.envOr("AUTO_TUNE_FLASH", true);
		bool failIfNoOpportunity = vm.envOr("FAIL_IF_NO_OPPORTUNITY", false);

		address uniswapRouter = IExecutorRouters(executorAddress).uniswap();
		address sushiRouter = IExecutorRouters(executorAddress).sushi();
		require(uniswapRouter != sushiRouter, "EXECUTOR_ROUTERS_EQUAL");

		Action[] memory actions = new Action[](3);
		actions[0] = Action({
			dexId: 0,
			tokenIn: USDC,
			tokenOut: address(0),
			amountIn: flashAmount,
			minOut: 0,
			fee: 0,
			amountAux: 0,
			beneficiary: beneficiary,
			data: ""
		});

		actions[1] = Action({
			dexId: startOnUniswap ? 0 : 1,
			tokenIn: USDC,
			tokenOut: WETH,
			amountIn: 0,
			minOut: minWethOut,
			fee: feeUsdcToEth,
			amountAux: 0,
			beneficiary: beneficiary,
			data: ""
		});

		actions[2] = Action({
			dexId: startOnUniswap ? 1 : 0,
			tokenIn: WETH,
			tokenOut: USDC,
			amountIn: 0,
			minOut: minUsdcOut,
			fee: feeEthToUsdc,
			amountAux: 0,
			beneficiary: beneficiary,
			data: ""
		});

		if (autoTuneFlash) {
			uint256 tunedFlashAmount = _findRepayableFlashAmount(executorAddress, actions, flashAmount);
			if (tunedFlashAmount == 0) {
				console2.log("No repayable flash amount found for current market state.");
				if (failIfNoOpportunity) {
					revert("NO_REPAYABLE_FLASH_AMOUNT");
				}
				return;
			}
			actions[0].amountIn = tunedFlashAmount;
			console2.log("Auto-tuned FLASH_AMOUNT_USDC", tunedFlashAmount);
		}

		vm.startBroadcast(privateKey);
		StrategyExecutor(payable(executorAddress)).execute(OperationType.Arbitrage, actions);
		vm.stopBroadcast();

		console2.log("Arbitrage flow executed on", executorAddress);
		console2.log("Final MIN_USDC_OUT used", minUsdcOut);
		console2.log("Uniswap router", uniswapRouter);
		console2.log("Sushi router", sushiRouter);
	}

	function _findRepayableFlashAmount(
		address executorAddress,
		Action[] memory actions,
		uint256 baseFlashAmount
	) internal returns (uint256 repayableAmount) {
		uint256[7] memory bpsCandidates = [uint256(10_000), 7_500, 5_000, 2_500, 1_000, 500, 100];

		for (uint256 i = 0; i < bpsCandidates.length; i++) {
			uint256 candidateAmount = (baseFlashAmount * bpsCandidates[i]) / 10_000;
			if (candidateAmount == 0) continue;

			actions[0].amountIn = candidateAmount;
			(bool ok, bytes memory ret) = executorAddress.call(
				abi.encodeWithSelector(
					StrategyExecutor.execute.selector,
					OperationType.Arbitrage,
					actions
				)
			);

			if (ok) {
				return candidateAmount;
			}

			if (_isInsufficientToRepay(ret)) {
				continue;
			}

			revert("ARBITRAGE_SIMULATION_FAILED");
		}

		return 0;
	}

	function _isInsufficientToRepay(bytes memory revertData) internal pure returns (bool) {
		if (revertData.length < 4) return false;
		bytes4 selector;
		assembly {
			selector := mload(add(revertData, 32))
		}
		return selector == INSUFFICIENT_TO_REPAY_SELECTOR;
	}
}
