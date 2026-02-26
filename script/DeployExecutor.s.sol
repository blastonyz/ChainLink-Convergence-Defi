// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {StrategyExecutor} from "../src/strategy/StrategyExecutor.sol";
import {UniswapV3FocusAddresses} from "../src/libraries/addresses/UniswapV3FocusAddresses.sol";
import {ArbitrumCoreAddresses} from "../src/libraries/addresses/ArbitrumCoreAddresses.sol";

contract DeployExecutor is Script {
	function run() external returns (StrategyExecutor deployed) {
		uint256 privateKey = vm.envUint("PRIVATE_KEY");

		address uniswapRouter = vm.envOr(
			"UNISWAP_ROUTER",
			UniswapV3FocusAddresses.UNISWAP_V3_SWAP_ROUTER
		);
		address sushiRouter = vm.envOr(
			"SUSHI_ROUTER",
			UniswapV3FocusAddresses.SUSHISWAP_V2_ROUTER
		);
		require(sushiRouter != uniswapRouter, "ROUTERS_MUST_DIFFER");
		address aavePool = vm.envOr("AAVE_POOL", ArbitrumCoreAddresses.AAVE_V3_POOL);
		address creForwarder = vm.envOr("CRE_FORWARDER", address(0));

		vm.startBroadcast(privateKey);
		deployed = new StrategyExecutor(
			uniswapRouter,
			sushiRouter,
			aavePool,
			creForwarder
		);
		vm.stopBroadcast();

		console2.log("StrategyExecutor deployed at", address(deployed));
		console2.log("Uniswap router", uniswapRouter);
		console2.log("Sushi router", sushiRouter);
		console2.log("Aave pool", aavePool);
		console2.log("CRE forwarder", creForwarder);
	}
}
