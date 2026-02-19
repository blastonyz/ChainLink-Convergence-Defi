// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {SimpleSwap} from "src/SimpleSwap.sol";

contract DeploySimpleSwap is Script {
    function run() external returns (SimpleSwap deployed) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address swapRouter = vm.envOr("UNISWAP_V3_SWAP_ROUTER", address(0));

        vm.startBroadcast(deployerPrivateKey);
        deployed = new SimpleSwap(swapRouter);
        vm.stopBroadcast();

        console2.log("SimpleSwap deployed at", address(deployed));
    }
}
