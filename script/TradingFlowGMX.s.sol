// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {IGMXExecutor} from "../src/strategy/interfaces/IGMXExecutor.sol";
import {IWETH} from "../src/strategy/interfaces/IWETH.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {IBaseOrderUtils} from "gmx/order/IBaseOrderUtils.sol";
import {Order} from "gmx/order/Order.sol";
import {GMXFocusAddresses} from "../src/libraries/addresses/GMXFocusAddresses.sol";

contract TradingFlowGMX is Script {
	address internal constant DEFAULT_WETH = GMXFocusAddresses.ARBITRUM_WETH;
	string internal constant DEFAULT_GMX_OPERATION = "long";
	string internal constant DEFAULT_GMX_ORDER_TYPE = "market-increase";

	error MissingGmxExecutor();
	error MissingOrderVault();
	error MissingMarket();
	error UnsupportedCollateralToken(address collateralToken, address expectedWeth);
	error InvalidCollateralAmount();
	error MissingExecutionFee();
	error MissingSizeDeltaUsd();
	error MissingAcceptablePrice();
	error MissingTriggerPrice();
	error InvalidGmxOperation(string operation);
	error InvalidOrderType(string orderType);

	function run() external {
		uint256 privateKey = vm.envUint("PRIVATE_KEY");
		address gmxExecutor = vm.envOr("GMX_EXECUTOR", address(0));
		if (gmxExecutor == address(0)) revert MissingGmxExecutor();

		address weth = vm.envOr("WETH_TOKEN", DEFAULT_WETH);
		uint256 amountInEth = vm.envOr("AMOUNT_IN_ETH", uint256(1 ether));
		string memory operation = vm.envOr("GMX_OPERATION", DEFAULT_GMX_OPERATION);
		string memory orderTypeName = vm.envOr("GMX_ORDER_TYPE", DEFAULT_GMX_ORDER_TYPE);
		address orderVault = vm.envOr("GMX_ORDER_VAULT", GMXFocusAddresses.ARBITRUM_ORDER_VAULT);
		if (orderVault == address(0)) revert MissingOrderVault();
		address market = vm.envOr("GMX_MARKET", GMXFocusAddresses.ARBITRUM_GM_TOKEN_ETH_WETH_USDC);
		if (market == address(0)) revert MissingMarket();
		address receiver = vm.envOr("GMX_RECEIVER", address(0));
		if (receiver == address(0)) {
			receiver = gmxExecutor;
		}
		address cancellationReceiver = vm.envOr("GMX_CANCELLATION_RECEIVER", address(0));
		address callbackContract = vm.envOr("GMX_CALLBACK_CONTRACT", address(0));
		address uiFeeReceiver = vm.envOr("GMX_UI_FEE_RECEIVER", address(0));
		address collateralToken = vm.envOr("GMX_COLLATERAL_TOKEN", weth);
		uint256 collateralAmount = vm.envOr("GMX_COLLATERAL_AMOUNT", amountInEth);
		uint256 executionFee = vm.envOr("GMX_EXECUTION_FEE", uint256(0));
		uint256 sizeDeltaUsd = vm.envOr("GMX_SIZE_DELTA_USD", uint256(0));
		uint256 initialCollateralDeltaAmount = vm.envOr("GMX_INITIAL_COLLATERAL_DELTA", uint256(0));
		uint256 triggerPrice = vm.envOr("GMX_TRIGGER_PRICE", uint256(0));
		uint256 acceptablePrice = vm.envOr("GMX_ACCEPTABLE_PRICE", uint256(0));
		uint256 callbackGasLimit = vm.envOr("GMX_CALLBACK_GAS_LIMIT", uint256(0));
		uint256 minOutputAmount = vm.envOr("GMX_MIN_OUTPUT_AMOUNT", uint256(0));
		uint256 validFromTime = vm.envOr("GMX_VALID_FROM_TIME", uint256(0));
		bool isLong = vm.envOr("GMX_IS_LONG", true);
		bool shouldUnwrapNativeToken = vm.envOr("GMX_SHOULD_UNWRAP_NATIVE", false);
		bool autoCancel = vm.envOr("GMX_AUTO_CANCEL", false);
		bytes32 referralCode = vm.envOr("GMX_REFERRAL_CODE", bytes32(0));
		if (collateralToken != weth) {
			revert UnsupportedCollateralToken(collateralToken, weth);
		}
		if (collateralAmount == 0) revert InvalidCollateralAmount();
		if (executionFee == 0) revert MissingExecutionFee();
		if (sizeDeltaUsd == 0) revert MissingSizeDeltaUsd();
		if (acceptablePrice == 0) revert MissingAcceptablePrice();
		if (
			keccak256(bytes(orderTypeName)) == keccak256("limit-increase")
				|| keccak256(bytes(orderTypeName)) == keccak256("stop-increase")
				|| keccak256(bytes(orderTypeName)) == keccak256("limit-decrease")
				|| keccak256(bytes(orderTypeName)) == keccak256("stop-loss-decrease")
		) {
			if (triggerPrice == 0) revert MissingTriggerPrice();
		}

		Order.OrderType orderType = _parseOrderType(orderTypeName);
		address[] memory swapPath = new address[](0);
		bytes32[] memory dataList = new bytes32[](0);

		IGMXExecutor.CreateOrderRequest memory request = IGMXExecutor.CreateOrderRequest({
			orderVault: orderVault,
			executionFee: executionFee,
			collateralToken: collateralToken,
			collateralAmount: collateralAmount,
			orderParams: IBaseOrderUtils.CreateOrderParams({
				addresses: IBaseOrderUtils.CreateOrderParamsAddresses({
					receiver: receiver,
					cancellationReceiver: cancellationReceiver,
					callbackContract: callbackContract,
					uiFeeReceiver: uiFeeReceiver,
					market: market,
					initialCollateralToken: collateralToken,
					swapPath: swapPath
				}),
				numbers: IBaseOrderUtils.CreateOrderParamsNumbers({
					sizeDeltaUsd: sizeDeltaUsd,
					initialCollateralDeltaAmount: initialCollateralDeltaAmount,
					triggerPrice: triggerPrice,
					acceptablePrice: acceptablePrice,
					executionFee: executionFee,
					callbackGasLimit: callbackGasLimit,
					minOutputAmount: minOutputAmount,
					validFromTime: validFromTime
				}),
				orderType: orderType,
				decreasePositionSwapType: Order.DecreasePositionSwapType.NoSwap,
				isLong: isLong,
				shouldUnwrapNativeToken: shouldUnwrapNativeToken,
				autoCancel: autoCancel,
				referralCode: referralCode,
				dataList: dataList
			})
		});

		vm.startBroadcast(privateKey);
		IWETH(weth).deposit{value: collateralAmount}();
		IERC20(weth).transfer(gmxExecutor, collateralAmount);

		bytes32 opHash = keccak256(bytes(operation));
		if (opHash == keccak256("long")) {
			IGMXExecutor(gmxExecutor).createLongOrder{value: executionFee}(request);
		} else if (opHash == keccak256("short")) {
			IGMXExecutor(gmxExecutor).createShortOrder{value: executionFee}(request);
		} else if (opHash == keccak256("close")) {
			IGMXExecutor(gmxExecutor).createCloseOrder{value: executionFee}(request);
		} else {
			revert InvalidGmxOperation(operation);
		}
		vm.stopBroadcast();

		console2.log("GMX trading flow executed on", gmxExecutor);
		console2.log("GMX operation", operation);
		console2.log("WETH token", weth);
		console2.log("Amount in ETH", amountInEth);
		console2.log("Market", market);
		console2.log("Execution fee", executionFee);
	}

	function _parseOrderType(string memory orderTypeName) internal pure returns (Order.OrderType) {
		bytes32 hash = keccak256(bytes(orderTypeName));
		if (hash == keccak256("market-increase")) return Order.OrderType.MarketIncrease;
		if (hash == keccak256("limit-increase")) return Order.OrderType.LimitIncrease;
		if (hash == keccak256("stop-increase")) return Order.OrderType.StopIncrease;
		if (hash == keccak256("market-decrease")) return Order.OrderType.MarketDecrease;
		if (hash == keccak256("limit-decrease")) return Order.OrderType.LimitDecrease;
		if (hash == keccak256("stop-loss-decrease")) return Order.OrderType.StopLossDecrease;
		revert InvalidOrderType(orderTypeName);
	}
}
