// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {SwapAndFlash} from "src/SwapAndFlash.sol";
import {UniswapV3FocusAddresses} from "src/libraries/addresses/UniswapV3FocusAddresses.sol";
import {AaveFocusAddresses} from "src/libraries/addresses/AaveFocusAddresses.sol";

contract DeploySwapAndFlash is Script {

    function run() external returns (SwapAndFlash deployed) {
        address swapRouter = UniswapV3FocusAddresses.UNISWAP_V3_SWAP_ROUTER;
        address aaveProvider = AaveFocusAddresses.MAINNET_AAVE_POOL_ADDRESSES_PROVIDER;//0x878...4E2;
        address usdcAsset = UniswapV3FocusAddresses.USDC;
        address wethAsset = UniswapV3FocusAddresses.WETH;

        vm.startBroadcast();
        deployed = new SwapAndFlash(
            swapRouter,
            aaveProvider,
            usdcAsset,
            wethAsset
        );
        vm.stopBroadcast();

        console2.log("SwapAndFlash deployed at", address(deployed));
    }
}
