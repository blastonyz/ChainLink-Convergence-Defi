// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {GMXExecutor} from "../src/strategy/GMXExecutor.sol";
import {GMXFocusAddresses} from "../src/libraries/addresses/GMXFocusAddresses.sol";

contract DeployGmxExecutor is Script {
	function run() external returns (GMXExecutor deployed) {
		uint256 privateKey = vm.envUint("PRIVATE_KEY");
		address gmxRouter = vm.envOr("GMX_ROUTER", GMXFocusAddresses.ARBITRUM_EXCHANGE_ROUTER);
		require(gmxRouter != address(0), "GMX_ROUTER_NOT_SET");
		address gmxRouterSpender = vm.envOr(
			"GMX_ROUTER_SPENDER",
			GMXFocusAddresses.ARBITRUM_ROUTER_TOKEN_SPENDER
		);
		require(gmxRouterSpender != address(0), "GMX_ROUTER_SPENDER_NOT_SET");
		address creForwarder = vm.envOr("CRE_FORWARDER", address(0));

		vm.startBroadcast(privateKey);
		deployed = new GMXExecutor(gmxRouter, gmxRouterSpender, creForwarder);
		vm.stopBroadcast();

		console2.log("GMXExecutor deployed at", address(deployed));
		console2.log("GMX router", gmxRouter);
		console2.log("GMX router spender", gmxRouterSpender);
		console2.log("CRE forwarder", creForwarder);
	}
}
