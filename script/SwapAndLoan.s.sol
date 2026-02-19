// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {SwapAndFlash} from "src/SwapAndFlash.sol";

contract SwapAndLoan is Script {
	address payable internal constant SWAP_AND_FLASH_ADDRESS =
		payable(0xf3dFD47811E4C07bFeB6Db7442164Cdf5520df0e);

	error FeeOutOfRange(uint256 feeRaw);

	function _toUint24(uint256 feeRaw) internal pure returns (uint24) {
		if (feeRaw > type(uint24).max) revert FeeOutOfRange(feeRaw);
		return uint24(feeRaw);
	}

	function run() external {
		uint256 privateKey = vm.envUint("PRIVATE_KEY");

		uint256 ethInWei = vm.envOr("SWAP_ETH_IN_WEI", uint256(100 ether));
		uint256 minUsdcOutFromEth = vm.envOr("MIN_USDC_OUT_FROM_ETH", uint256(0));
		uint256 flashAmountUsdc = vm.envOr("FLASH_AMOUNT_USDC", uint256(1_000_000e6));
		uint256 minWethOut = vm.envOr("MIN_WETH_OUT", uint256(0));
		uint256 minUsdcOutAfterFlash = vm.envOr("MIN_USDC_OUT_AFTER_FLASH", uint256(0));

		uint24 feeEthToUsdc = _toUint24(vm.envOr("FEE_ETH_TO_USDC", uint256(500)));
		uint24 feeUsdcToWeth = _toUint24(vm.envOr("FEE_USDC_TO_WETH", uint256(500)));
		uint24 feeWethToUsdc = _toUint24(vm.envOr("FEE_WETH_TO_USDC", uint256(500)));

		address beneficiary = vm.envOr("BENEFICIARY", vm.addr(privateKey));

		vm.startBroadcast(privateKey);
		SwapAndFlash(SWAP_AND_FLASH_ADDRESS).swapLoanSwap{value: ethInWei}(
			minUsdcOutFromEth,
			flashAmountUsdc,
			minWethOut,
			minUsdcOutAfterFlash,
			feeEthToUsdc,
			feeUsdcToWeth,
			feeWethToUsdc,
			beneficiary
		);
		vm.stopBroadcast();

		console2.log("SwapAndFlash", SWAP_AND_FLASH_ADDRESS);
		console2.log("Beneficiary", beneficiary);
		console2.log("ETH in (wei)", ethInWei);
		console2.log("Flash amount USDC (6d)", flashAmountUsdc);
	}
}