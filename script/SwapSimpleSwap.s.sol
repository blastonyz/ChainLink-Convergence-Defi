// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {SimpleSwap} from "src/SimpleSwap.sol";

contract SwapSimpleSwap is Script {
    address internal constant SIMPLE_SWAP_ADDRESS =
        0x2157b12b8841b22A64AF4D049f2914829C8Fdc79;

    function run() external returns (uint256 amountOut) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        uint256 ethInWei = vm.envOr("SWAP_ETH_IN_WEI", uint256(1e15));
        uint256 minUsdcOut = vm.envOr("MIN_USDC_OUT", uint256(0));
        uint256 feeRaw = vm.envOr("SWAP_FEE", uint256(500));
        address recipient = vm.envOr("SWAP_RECIPIENT", vm.addr(privateKey));

        require(feeRaw <= type(uint24).max, "FEE_OUT_OF_RANGE");

        vm.startBroadcast(privateKey);
        amountOut = SimpleSwap(SIMPLE_SWAP_ADDRESS)
            .swapEthToUsdcWithFeeAndRecipient{value: ethInWei}(
            minUsdcOut,
            uint24(feeRaw),
            recipient
        );
        vm.stopBroadcast();

        console2.log("SimpleSwap", SIMPLE_SWAP_ADDRESS);
        console2.log("Recipient", recipient);
        console2.log("ETH in (wei)", ethInWei);
        console2.log("USDC out", amountOut);
    }
}
