// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {UniswapBase} from "./UniswapBase.sol";
import {SushiBase} from "./SushiBase.sol";
import {AaveBase} from "./AaveBase.sol";
import {TradingCase} from "./TradingCase.sol";
import {ArbitrageCase} from "./ArbitrageCase.sol";
import {IPermit2} from "./interfaces/IPermit2.sol";
import {Action, OperationType, Permit2Data} from "./StrategyTypes.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

contract StrategyExecutor is
	UniswapBase,
	SushiBase,
	AaveBase,
	TradingCase,
	ArbitrageCase
{
	IPermit2 public immutable permit2;
	address public owner;

	event OperationExecuted(OperationType indexed operation, address indexed caller, address indexed beneficiary);
	event Permit2Pulled(address indexed owner, address indexed token, uint256 amount);

	error NotOwner();
	error InvalidActionSet();
	error InvalidDex(uint8 dexId);
	error Permit2Required(OperationType op);
	error InvalidPermitOwner(address signer, address caller);
	error InvalidPermitRecipient(address recipient);
	error InvalidPermitToken(address expected, address provided);
	error InvalidPermitAmount(uint256 expected, uint256 provided);
	error InvalidPositionActions();
	error InvalidCollateralAmount();
	error InvalidCollateralAsset();
	error InvalidBorrowAmount();
	error InvalidBorrowAsset();
	error InvalidPositionActionLength();

	event PositionCollateralSupplied(address indexed asset, uint256 amount, address indexed onBehalfOf);
	event PositionBorrowed(address indexed asset, uint256 amount, address indexed onBehalfOf);
	event PositionSwapExecuted(
		uint8 dexId,
		address indexed tokenIn,
		address indexed tokenOut,
		uint256 amountIn,
		uint256 amountOut
	);
	event PositionPrepared(address indexed beneficiary, uint256 borrowedAmount, uint256 swappedAmount);

	modifier onlyOwner() {
		if (msg.sender != owner) revert NotOwner();
		_;
	}

	constructor(
		address uniswapRouter,
		address sushiRouter,
		address aavePool,
		address permit2Address
	)
		UniswapBase(uniswapRouter)
		SushiBase(sushiRouter)
		AaveBase(aavePool)
	{
		require(permit2Address != address(0), "PERMIT2_ZERO");
		permit2 = IPermit2(permit2Address);
		owner = msg.sender;
	}

	function setOwner(address newOwner) external onlyOwner {
		require(newOwner != address(0), "OWNER_ZERO");
		owner = newOwner;
	}

	function execute(OperationType op, Action[] calldata actions)
		external
		payable
		returns (bytes memory result)
	{
		if (op != OperationType.Arbitrage) {
			revert Permit2Required(op);
		}
		result = _execute(op, actions, msg.sender);
	}

	function executeWithPermit(
		OperationType op,
		Action[] calldata actions,
		Permit2Data calldata permitData
	) external payable returns (bytes memory result) {
		_validatePermit(op, actions, permitData);
		_pullWithPermit(permitData);
		result = _execute(op, actions, msg.sender);
	}

	function _validatePermit(
		OperationType op,
		Action[] calldata actions,
		Permit2Data calldata permitData
	) internal view {
		if (permitData.owner != msg.sender) {
			revert InvalidPermitOwner(permitData.owner, msg.sender);
		}

		if (permitData.transferDetails.to != address(this)) {
			revert InvalidPermitRecipient(permitData.transferDetails.to);
		}

		if (actions.length == 0) revert InvalidActionSet();

		if (op == OperationType.Arbitrage) {
			return;
		}

		Action calldata fundingAction = actions[0];
		address permitToken = permitData.permit.permitted.token;
		if (permitToken != fundingAction.tokenIn) {
			revert InvalidPermitToken(fundingAction.tokenIn, permitToken);
		}

		uint256 requiredAmount = fundingAction.amountIn;
		uint256 requestedAmount = permitData.transferDetails.requestedAmount;
		if (requiredAmount == 0 || requestedAmount != requiredAmount) {
			revert InvalidPermitAmount(requiredAmount, requestedAmount);
		}

		if (permitData.permit.permitted.amount < requestedAmount) {
			revert InvalidPermitAmount(requestedAmount, permitData.permit.permitted.amount);
		}
	}

	function _execute(OperationType op, Action[] calldata actions, address beneficiary)
		internal
		returns (bytes memory result)
	{
		if (beneficiary == address(0)) revert InvalidBeneficiary();
		if (actions.length == 0) revert InvalidActionSet();

		if (op == OperationType.Arbitrage) {
			if (actions.length < 3) revert InvalidActionSet();
			Action calldata meta = actions[0];
			Action[] memory legs = new Action[](2);
			legs[0] = actions[1];
			legs[1] = actions[2];
			_executeArbitrage(legs, meta.tokenIn, meta.amountIn, beneficiary);
			result = abi.encode(true);
		} else if (op == OperationType.Position) {
			bytes32 positionKey = _executePosition(actions, beneficiary);
			result = abi.encode(positionKey);
		} else {
			uint256 amountOut = _executeTrading(actions, beneficiary);
			result = abi.encode(amountOut);
		}

		emit OperationExecuted(op, msg.sender, beneficiary);
	}

	function _pullWithPermit(Permit2Data calldata permitData) internal {
		permit2.permitTransferFrom(
			permitData.permit,
			permitData.transferDetails,
			permitData.owner,
			permitData.signature
		);

		emit Permit2Pulled(
			permitData.owner,
			permitData.permit.permitted.token,
			permitData.transferDetails.requestedAmount
		);
	}

	function _swapByDex(Action memory action, uint256 amountIn, address recipient)
		internal
		override(TradingCase, ArbitrageCase)
		returns (uint256 amountOut)
	{
		if (action.dexId == 0) {
			amountOut = _uniswapSwapExactTokensForTokens(
				action.tokenIn,
				action.tokenOut,
				action.fee,
				amountIn,
				action.minOut,
				recipient
			);
		} else if (action.dexId == 1) {
			amountOut = _sushiSwapExactTokensForTokens(
				action.tokenIn,
				action.tokenOut,
				action.fee,
				amountIn,
				action.minOut,
				recipient
			);
		} else {
			revert InvalidDex(action.dexId);
		}
	}

	function _requestFlashloan(address flashAsset, uint256 flashAmount, bytes memory params)
		internal
		override(ArbitrageCase)
	{
		_aaveFlashloanSimple(address(this), flashAsset, flashAmount, params);
	}

	function _aavePoolAddress() internal view override(ArbitrageCase) returns (address) {
		return address(aave);
	}

	function _executePosition(Action[] calldata actions, address beneficiary)
		internal
		returns (bytes32 positionKey)
	{
		if (actions.length < 2) revert InvalidPositionActions();
		if (actions.length > 3) revert InvalidPositionActionLength();

		Action calldata collateralAction = actions[0];
		if (collateralAction.tokenIn == address(0)) revert InvalidCollateralAsset();
		if (collateralAction.amountIn == 0) revert InvalidCollateralAmount();

		IERC20(collateralAction.tokenIn).approve(address(aave), collateralAction.amountIn);
		_aaveSupply(collateralAction.tokenIn, collateralAction.amountIn, address(this));
		_aaveSetUseReserveAsCollateral(collateralAction.tokenIn, true);
		emit PositionCollateralSupplied(collateralAction.tokenIn, collateralAction.amountIn, address(this));

		Action calldata borrowAction = actions[1];
		if (borrowAction.tokenIn == address(0)) revert InvalidBorrowAsset();
		if (borrowAction.amountIn == 0) revert InvalidBorrowAmount();

		_aaveBorrow(borrowAction.tokenIn, borrowAction.amountIn, address(this));
		emit PositionBorrowed(borrowAction.tokenIn, borrowAction.amountIn, address(this));

		uint256 workingAmount = borrowAction.amountIn;

		if (actions.length == 3) {
			Action calldata swapAction = actions[2];
			workingAmount = _swapByDex(swapAction, workingAmount, address(this));
			emit PositionSwapExecuted(
				swapAction.dexId,
				swapAction.tokenIn,
				swapAction.tokenOut,
				borrowAction.amountIn,
				workingAmount
			);
		}

		emit PositionPrepared(beneficiary, borrowAction.amountIn, workingAmount);
		positionKey = bytes32(0);
	}

	receive() external payable {}
}
