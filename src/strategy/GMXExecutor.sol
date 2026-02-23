// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {IGMXExecutor} from "./interfaces/IGMXExecutor.sol";
import {IGMXExchangeRouter} from "./interfaces/IGMXExchangeRouter.sol";
import {Order} from "gmx/order/Order.sol";

contract GMXExecutor is IGMXExecutor {
	address public immutable gmxRouter;
	address public immutable gmxRouterSpender;
	IGMXExchangeRouter internal immutable exchangeRouter;

	enum GmxOperation {
		Long,
		Short,
		Close
	}

	event GmxOperationExecuted(GmxOperation indexed operation, uint256 value);

	error InvalidRouter();
	error InvalidRouterSpender();
	error InvalidOrderDirection();
	error InvalidOrderType();
	error CallFailed();

	constructor(address router, address routerSpender) {
		if (router == address(0)) revert InvalidRouter();
		if (routerSpender == address(0)) revert InvalidRouterSpender();
		gmxRouter = router;
		gmxRouterSpender = routerSpender;
		exchangeRouter = IGMXExchangeRouter(router);
	}

	function createLongOrder(CreateOrderRequest calldata request)
		external
		payable
		returns (bytes32 orderKey)
	{
		if (!request.orderParams.isLong) revert InvalidOrderDirection();
		if (
			request.orderParams.orderType != Order.OrderType.MarketIncrease
				&& request.orderParams.orderType != Order.OrderType.LimitIncrease
				&& request.orderParams.orderType != Order.OrderType.StopIncrease
		) revert InvalidOrderType();

		orderKey = _createOrder(request);
		emit GmxOperationExecuted(GmxOperation.Long, request.executionFee);
	}


	function createShortOrder(CreateOrderRequest calldata request)
		external
		payable
		returns (bytes32 orderKey)
	{
		if (request.orderParams.isLong) revert InvalidOrderDirection();
		if (
			request.orderParams.orderType != Order.OrderType.MarketIncrease
				&& request.orderParams.orderType != Order.OrderType.LimitIncrease
				&& request.orderParams.orderType != Order.OrderType.StopIncrease
		) revert InvalidOrderType();

		orderKey = _createOrder(request);
		emit GmxOperationExecuted(GmxOperation.Short, request.executionFee);
	}


	function createCloseOrder(CreateOrderRequest calldata request)
		external
		payable
		returns (bytes32 orderKey)
	{
		if (
			request.orderParams.orderType != Order.OrderType.MarketDecrease
				&& request.orderParams.orderType != Order.OrderType.LimitDecrease
				&& request.orderParams.orderType != Order.OrderType.StopLossDecrease
		) revert InvalidOrderType();

		orderKey = _createOrder(request);
		emit GmxOperationExecuted(GmxOperation.Close, request.executionFee);
	}

	function _createOrder(CreateOrderRequest calldata request)
		internal
		returns (bytes32 orderKey)
	{
		if (request.executionFee > 0) {
			exchangeRouter.sendWnt{value: request.executionFee}(request.orderVault, request.executionFee);
		}

		if (request.collateralAmount > 0) {
			IERC20(request.collateralToken).approve(gmxRouterSpender, request.collateralAmount);
			exchangeRouter.sendTokens(request.collateralToken, request.orderVault, request.collateralAmount);
		}

		orderKey = exchangeRouter.createOrder(request.orderParams);
	}

	receive() external payable {}
}
