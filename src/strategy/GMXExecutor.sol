// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {IERC165} from "openzeppelin-contracts/utils/introspection/IERC165.sol";
import {IGMXExecutor} from "./interfaces/IGMXExecutor.sol";
import {IGMXExchangeRouter} from "./interfaces/IGMXExchangeRouter.sol";
import {IReceiver} from "./interfaces/IReceiver.sol";
import {IBaseOrderUtils} from "gmx/order/IBaseOrderUtils.sol";
import {Order} from "gmx/order/Order.sol";

/**
 * @title GMXExecutor
 * @notice Executes GMX orders directly (manual scripts) or via CRE callbacks (automated flows).
 *
 * **Manual Flow (script execution)**:
 *   - Script deposits collateral to this contract
 *   - Script calls createLongOrder/createShortOrder/createCloseOrder directly
 *   - Receiver is msg.sender (the script/account)
 *
 * **CRE Flow (workflow callback)**:
 *   - CRE report dispatched to onReport() callback
 *   - Receiver defaults to address(this) (the executor contract)
 *   - Workflow persists position accounting on-chain
 */
contract GMXExecutor is IGMXExecutor, IReceiver {
	address public immutable gmxRouter;
	address public immutable gmxRouterSpender;
	IGMXExchangeRouter internal immutable exchangeRouter;
	address public owner;

	// CRE Configuration
	address public creForwarder;
	bytes32 public creWorkflowId;
	address public creWorkflowOwner;

	struct CreOrderConfig {
		address orderVault;
		address cancellationReceiver;
		address callbackContract;
		address uiFeeReceiver;
		uint256 executionFee;
		uint256 callbackGasLimit;
		uint256 minOutputAmount;
		uint256 validFromTime;
		bool shouldUnwrapNativeToken;
		bool autoCancel;
		bytes32 referralCode;
		bool closeIsLong;
	}

	CreOrderConfig public creOrderConfig;

	enum GmxOperation {
		Long,
		Short,
		Close
	}

	event GmxOperationExecuted(GmxOperation indexed operation, uint256 value);
	event OwnerUpdated(address indexed previousOwner, address indexed newOwner);
	event CreForwarderUpdated(address indexed previousForwarder, address indexed newForwarder);
	event CreWorkflowIdUpdated(bytes32 indexed previousWorkflowId, bytes32 indexed newWorkflowId);
	event CreWorkflowOwnerUpdated(address indexed previousWorkflowOwner, address indexed newWorkflowOwner);
	event CreOrderConfigUpdated(address indexed orderVault, uint256 executionFee, bool closeIsLong);
	event CreReportConsumed(uint8 indexed action, bytes32 indexed orderKey, uint256 sizeDeltaUsd, bool isLong);

	error InvalidRouter();
	error InvalidRouterSpender();
	error InvalidOrderDirection();
	error InvalidOrderType();
	error NotOwner();
	error InvalidCreSender(address sender, address expected);
	error InvalidCreWorkflowId(bytes32 received, bytes32 expected);
	error InvalidCreWorkflowOwner(address received, address expected);
	error InvalidCreAction(uint8 action);
	error InvalidCreOrderVault();
	error InvalidCreExecutionFee();
	error InvalidCreMarket();
	error InvalidCreCollateralToken();

	modifier onlyOwner() {
		if (msg.sender != owner) revert NotOwner();
		_;
	}

	constructor(address router, address routerSpender, address initialForwarder) {
		if (router == address(0)) revert InvalidRouter();
		if (routerSpender == address(0)) revert InvalidRouterSpender();
		gmxRouter = router;
		gmxRouterSpender = routerSpender;
		exchangeRouter = IGMXExchangeRouter(router);
		owner = msg.sender;
		creForwarder = initialForwarder;

		emit OwnerUpdated(address(0), msg.sender);
		emit CreForwarderUpdated(address(0), initialForwarder);
	}

	function setOwner(address newOwner) external onlyOwner {
		require(newOwner != address(0), "OWNER_ZERO");
		address previousOwner = owner;
		owner = newOwner;
		emit OwnerUpdated(previousOwner, newOwner);
	}

	function setCreForwarder(address newForwarder) external onlyOwner {
		address previousForwarder = creForwarder;
		creForwarder = newForwarder;
		emit CreForwarderUpdated(previousForwarder, newForwarder);
	}

	function setCreWorkflowId(bytes32 workflowId) external onlyOwner {
		bytes32 previousWorkflowId = creWorkflowId;
		creWorkflowId = workflowId;
		emit CreWorkflowIdUpdated(previousWorkflowId, workflowId);
	}

	function setCreWorkflowOwner(address workflowOwner) external onlyOwner {
		address previousWorkflowOwner = creWorkflowOwner;
		creWorkflowOwner = workflowOwner;
		emit CreWorkflowOwnerUpdated(previousWorkflowOwner, workflowOwner);
	}

	function setCreOrderConfig(CreOrderConfig calldata config) external onlyOwner {
		if (config.orderVault == address(0)) revert InvalidCreOrderVault();
		if (config.executionFee == 0) revert InvalidCreExecutionFee();
		creOrderConfig = config;
		emit CreOrderConfigUpdated(config.orderVault, config.executionFee, config.closeIsLong);
	}

		function createLongOrder(CreateOrderRequest memory request)
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


		function createShortOrder(CreateOrderRequest memory request)
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


		function createCloseOrder(CreateOrderRequest memory request)
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

	       function _createOrder(CreateOrderRequest memory request)
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

	function onReport(bytes calldata , bytes calldata report) external override {
		// Only validate sender if creForwarder is configured
		// Metadata validation is optional and depends on CRE properly populating it
		if (creForwarder != address(0) && msg.sender != creForwarder) {
			revert InvalidCreSender(msg.sender, creForwarder);
		}

		// NOTE: Metadata validation disabled until CRE properly injects workflow values
		// For now, we rely on sender validation (creForwarder) for security
		// if (creWorkflowId != bytes32(0) || creWorkflowOwner != address(0)) {
		// 	(bytes32 workflowId,, address workflowOwner) = _decodeMetadata(metadata);
		// 	if (creWorkflowId != bytes32(0) && workflowId != creWorkflowId) {
		// 		revert InvalidCreWorkflowId(workflowId, creWorkflowId);
		// 	}
		// 	if (creWorkflowOwner != address(0) && workflowOwner != creWorkflowOwner) {
		// 		revert InvalidCreWorkflowOwner(workflowOwner, creWorkflowOwner);
		// 	}
		// }

		(
			uint8 action,
			address collateralToken,
			address market,
			uint256 collateralAmount,
			uint256 sizeDeltaUsd,
			uint256 triggerPrice,
			uint256 acceptablePrice
		) = abi.decode(report, (uint8, address, address, uint256, uint256, uint256, uint256));

		if (market == address(0)) revert InvalidCreMarket();
		if (collateralToken == address(0)) revert InvalidCreCollateralToken();

		CreOrderConfig memory config = creOrderConfig;
		if (config.orderVault == address(0)) revert InvalidCreOrderVault();
		if (config.executionFee == 0) revert InvalidCreExecutionFee();

		address[] memory swapPath = new address[](0);
		bytes32[] memory dataList = new bytes32[](0);

		bool isLong;
		Order.OrderType orderType;
		uint256 initialCollateralDeltaAmount = collateralAmount;
		uint256 collateralForTransfer = collateralAmount;

		if (action == uint8(GmxOperation.Long)) {
			isLong = true;
			orderType = Order.OrderType.MarketIncrease;
		} else if (action == uint8(GmxOperation.Short)) {
			isLong = false;
			orderType = Order.OrderType.MarketIncrease;
		} else if (action == uint8(GmxOperation.Close)) {
			isLong = config.closeIsLong;
			orderType = Order.OrderType.MarketDecrease;
			initialCollateralDeltaAmount = 0;
			collateralForTransfer = 0;
		} else {
			revert InvalidCreAction(action);
		}

		IGMXExecutor.CreateOrderRequest memory request = IGMXExecutor.CreateOrderRequest({
			orderVault: config.orderVault,
			executionFee: config.executionFee,
			collateralToken: collateralToken,
			collateralAmount: collateralForTransfer,
			orderParams: IBaseOrderUtils.CreateOrderParams({
				addresses: IBaseOrderUtils.CreateOrderParamsAddresses({
					receiver: address(this),
					cancellationReceiver: config.cancellationReceiver,
					callbackContract: config.callbackContract,
					uiFeeReceiver: config.uiFeeReceiver,
					market: market,
					initialCollateralToken: collateralToken,
					swapPath: swapPath
				}),
				numbers: IBaseOrderUtils.CreateOrderParamsNumbers({
					sizeDeltaUsd: sizeDeltaUsd,
					initialCollateralDeltaAmount: initialCollateralDeltaAmount,
					triggerPrice: triggerPrice,
					acceptablePrice: acceptablePrice,
					executionFee: config.executionFee,
					callbackGasLimit: config.callbackGasLimit,
					minOutputAmount: config.minOutputAmount,
					validFromTime: config.validFromTime
				}),
				orderType: orderType,
				decreasePositionSwapType: Order.DecreasePositionSwapType.NoSwap,
				isLong: isLong,
				shouldUnwrapNativeToken: config.shouldUnwrapNativeToken,
				autoCancel: config.autoCancel,
				referralCode: config.referralCode,
				dataList: dataList
			})
		});

		bytes32 orderKey = _createOrder(request);
		emit GmxOperationExecuted(GmxOperation(action), config.executionFee);
		emit CreReportConsumed(action, orderKey, sizeDeltaUsd, isLong);
	}

	function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
		return interfaceId == type(IReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
	}

	function _decodeMetadata(bytes memory metadata)
		internal
		pure
		returns (bytes32 workflowId, bytes10 workflowName, address workflowOwner)
	{
		assembly ("memory-safe") {
			workflowId := mload(add(metadata, 32))
			workflowName := mload(add(metadata, 64))
			workflowOwner := shr(mul(12, 8), mload(add(metadata, 74)))
		}
	}

	receive() external payable {}
}
