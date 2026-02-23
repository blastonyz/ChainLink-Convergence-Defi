// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {StrategyExecutor} from "../src/strategy/StrategyExecutor.sol";
import {Action, OperationType} from "../src/strategy/StrategyTypes.sol";
import {UniswapV3FocusAddresses} from "../src/libraries/addresses/UniswapV3FocusAddresses.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

interface IWETH {
	function deposit() external payable;
}

contract PositionFlow is Script {
	address internal constant USDC = UniswapV3FocusAddresses.USDC;
	address internal constant WETH = UniswapV3FocusAddresses.WETH;
	address internal constant DEFAULT_EXECUTOR = 0x17d132281849911e52942AB19Cd7Aee239abB549;

	function run() external {
		uint256 privateKey = vm.envUint("PRIVATE_KEY");
		address executorAddress = vm.envOr("EXECUTOR", DEFAULT_EXECUTOR);
		address beneficiary = vm.envOr("BENEFICIARY", vm.addr(privateKey));

		uint256 collateralInEth = vm.envOr("COLLATERAL_IN_ETH", uint256(1 ether));
		uint256 borrowAmount = vm.envOr("BORROW_AMOUNT_USDC", uint256(1_000e6));
		uint256 minWethOut = vm.envOr("MIN_WETH_OUT", uint256(0));
		uint24 fee = uint24(vm.envOr("FEE_USDC_TO_WETH", uint256(3000)));

		Action[] memory actions = new Action[](3);
		actions[0] = Action({
			dexId: 0,
			tokenIn: WETH,
			tokenOut: address(0),
			amountIn: collateralInEth,
			minOut: 0,
			fee: 0,
			amountAux: 0,
			beneficiary: beneficiary,
			data: ""
		});

		actions[1] = Action({
			dexId: 0,
			tokenIn: USDC,
			tokenOut: address(0),
			amountIn: borrowAmount,
			minOut: 0,
			fee: 0,
			amountAux: 0,
			beneficiary: beneficiary,
			data: ""
		});

		actions[2] = Action({
			dexId: 0,
			tokenIn: USDC,
			tokenOut: WETH,
			amountIn: 0,
			minOut: minWethOut,
			fee: fee,
			amountAux: 0,
			beneficiary: beneficiary,
			data: ""
		});

		vm.startBroadcast(privateKey);
		IWETH(WETH).deposit{value: collateralInEth}();
		IERC20(WETH).transfer(executorAddress, collateralInEth);
		StrategyExecutor(payable(executorAddress)).execute(OperationType.Position, actions);
		vm.stopBroadcast();

		console2.log("Position flow executed on", executorAddress);
		console2.log("Collateral ETH in (wei)", collateralInEth);
	}
}
