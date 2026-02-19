// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ISwapRouter} from "v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IPoolAddressesProvider} from "aave-v3-origin/src/contracts/interfaces/IPoolAddressesProvider.sol";
import {FlashLoanSimpleReceiverBase} from "aave-v3-origin/src/contracts/misc/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {UniswapV3FocusAddresses} from "./libraries/addresses/UniswapV3FocusAddresses.sol";
import {AaveFocusAddresses} from "./libraries/addresses/AaveFocusAddresses.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

contract SwapAndFlash is FlashLoanSimpleReceiverBase {
	ISwapRouter public immutable swapRouter;

	address public constant AAVE_V3_MAINNET_PROVIDER = AaveFocusAddresses.MAINNET_AAVE_POOL_ADDRESSES_PROVIDER;

	address public immutable usdc;
	address public immutable weth;

	uint24 public constant DEFAULT_POOL_FEE = 500;
	uint256 public constant VARIABLE_RATE_MODE = 2;

	event EthToUsdcSwapped(
		address indexed sender,
		address indexed recipient,
		uint256 amountIn,
		uint256 amountOut,
		uint24 fee
	);

	event FlashLoanRequested(
		address indexed asset,
		uint256 amount,
		uint24 feeUsdcToWeth,
		uint24 feeWethToUsdc
	);

	event FlashLoanExecuted(
		address indexed asset,
		uint256 amount,
		uint256 premium,
		uint256 amountOwed,
		uint256 balanceAfter
	);

	event CollateralSupplied(
		address indexed collateralAsset,
		uint256 amount,
		address indexed onBehalfOf
	);

	event BorrowExecuted(
		address indexed asset,
		uint256 amount,
		uint256 indexed rateMode,
		address indexed onBehalfOf
	);

	event BorrowAssetSwapped(
		address indexed borrowAsset,
		uint256 borrowAmount,
		uint256 usdcOut,
		address indexed beneficiary
	);

	error InvalidRecipient();
	error InvalidFlashAmount();
	error InvalidBorrowAsset();
	error InvalidBorrowAmount();
	error InvalidCaller();
	error InvalidInitiator();
	error InsufficientToRepay(uint256 available, uint256 requiredAmount);

	struct FlashParams {
		address beneficiary;
		uint24 feeUsdcToWeth;
		uint24 feeWethToUsdc;
		uint256 minWethOut;
		uint256 minUsdcOut;
	}

	constructor(address router, address provider, address usdcAsset, address wethAsset)
		FlashLoanSimpleReceiverBase(
			IPoolAddressesProvider(
				provider == address(0)
					? AAVE_V3_MAINNET_PROVIDER
					: provider
			)
		)
	{
		if (router == address(0)) {
			swapRouter = ISwapRouter(UniswapV3FocusAddresses.UNISWAP_V3_SWAP_ROUTER);
		} else {
			swapRouter = ISwapRouter(router);
		}

		usdc = usdcAsset == address(0) ? UniswapV3FocusAddresses.USDC : usdcAsset;
		weth = wethAsset == address(0) ? UniswapV3FocusAddresses.WETH : wethAsset;
	}

	function swapLoanSwap(
		uint256 minUsdcOutFromEth,
		uint256 flashAmountUsdc,
		uint256 minWethOut,
		uint256 minUsdcOutAfterFlash,
		uint24 feeEthToUsdc,
		uint24 feeUsdcToWeth,
		uint24 feeWethToUsdc,
		address beneficiary
	) external payable {
		if (beneficiary == address(0)) revert InvalidRecipient();
		if (flashAmountUsdc == 0) revert InvalidFlashAmount();

		uint256 usdcFromEth = _swapEthToUsdc(
			msg.value,
			minUsdcOutFromEth,
			feeEthToUsdc,
			address(this)
		);

		emit EthToUsdcSwapped(msg.sender, address(this), msg.value, usdcFromEth, feeEthToUsdc);

		bytes memory params = abi.encode(
			FlashParams({
				beneficiary: beneficiary,
				feeUsdcToWeth: feeUsdcToWeth,
				feeWethToUsdc: feeWethToUsdc,
				minWethOut: minWethOut,
				minUsdcOut: minUsdcOutAfterFlash
			})
		);

		emit FlashLoanRequested(usdc, flashAmountUsdc, feeUsdcToWeth, feeWethToUsdc);

		POOL.flashLoanSimple(address(this), usdc, flashAmountUsdc, params, 0);
	}

	function swapSupplyBorrowSwap(
		uint256 minUsdcOutFromEth,
		address borrowAsset,
		uint256 borrowAmount,
		uint256 minUsdcOutFromBorrowSwap,
		uint24 feeEthToUsdc,
		uint24 feeBorrowToUsdc,
		address beneficiary
	) external payable returns (uint256 collateralAmount, uint256 usdcFromBorrowSwap) {
		if (beneficiary == address(0)) revert InvalidRecipient();
		if (borrowAsset == address(0) || borrowAsset == usdc) revert InvalidBorrowAsset();
		if (borrowAmount == 0) revert InvalidBorrowAmount();

		collateralAmount = _swapEthToUsdc(
			msg.value,
			minUsdcOutFromEth,
			feeEthToUsdc,
			address(this)
		);

		emit EthToUsdcSwapped(msg.sender, address(this), msg.value, collateralAmount, feeEthToUsdc);

		IERC20(usdc).approve(address(POOL), collateralAmount);
		POOL.supply(usdc, collateralAmount, address(this), 0);
		POOL.setUserUseReserveAsCollateral(usdc, true);

		emit CollateralSupplied(usdc, collateralAmount, address(this));

		POOL.borrow(borrowAsset, borrowAmount, VARIABLE_RATE_MODE, 0, address(this));

		emit BorrowExecuted(borrowAsset, borrowAmount, VARIABLE_RATE_MODE, address(this));

		IERC20(borrowAsset).approve(address(swapRouter), borrowAmount);
		usdcFromBorrowSwap = _swapExactInputSingle(
			borrowAsset,
			usdc,
			borrowAmount,
			minUsdcOutFromBorrowSwap,
			feeBorrowToUsdc,
			beneficiary
		);

		emit BorrowAssetSwapped(borrowAsset, borrowAmount, usdcFromBorrowSwap, beneficiary);
	}

	function executeOperation(
		address asset,
		uint256 amount,
		uint256 premium,
		address initiator,
		bytes calldata params
	) external override returns (bool) {
		if (msg.sender != address(POOL)) revert InvalidCaller();
		if (initiator != address(this)) revert InvalidInitiator();

		FlashParams memory flashParams = abi.decode(params, (FlashParams));

		IERC20(asset).approve(address(swapRouter), amount);

		uint256 wethOut = _swapExactInputSingle(
			asset,
			weth,
			amount,
			flashParams.minWethOut,
			flashParams.feeUsdcToWeth,
			address(this)
		);

		IERC20(weth).approve(address(swapRouter), wethOut);

		_swapExactInputSingle(
			weth,
			asset,
			wethOut,
			flashParams.minUsdcOut,
			flashParams.feeWethToUsdc,
			address(this)
		);

		uint256 amountOwed = amount + premium;
		uint256 assetBalance = IERC20(asset).balanceOf(address(this));

		if (assetBalance < amountOwed) {
			revert InsufficientToRepay(assetBalance, amountOwed);
		}

		IERC20(asset).approve(address(POOL), amountOwed);

		uint256 profit = assetBalance - amountOwed;
		if (profit > 0) {
			IERC20(asset).transfer(flashParams.beneficiary, profit);
		}

		emit FlashLoanExecuted(asset, amount, premium, amountOwed, assetBalance);

		return true;
	}

	function _swapEthToUsdc(
		uint256 amountIn,
		uint256 amountOutMinimum,
		uint24 fee,
		address recipient
	) internal returns (uint256 amountOut) {
		ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
			tokenIn: weth,
			tokenOut: usdc,
			fee: fee,
			recipient: recipient,
			deadline: block.timestamp,
			amountIn: amountIn,
			amountOutMinimum: amountOutMinimum,
			sqrtPriceLimitX96: 0
		});

		amountOut = swapRouter.exactInputSingle{value: amountIn}(params);
	}

	function _swapExactInputSingle(
		address tokenIn,
		address tokenOut,
		uint256 amountIn,
		uint256 amountOutMinimum,
		uint24 fee,
		address recipient
	) internal returns (uint256 amountOut) {
		ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
			tokenIn: tokenIn,
			tokenOut: tokenOut,
			fee: fee,
			recipient: recipient,
			deadline: block.timestamp,
			amountIn: amountIn,
			amountOutMinimum: amountOutMinimum,
			sqrtPriceLimitX96: 0
		});

		amountOut = swapRouter.exactInputSingle(params);
	}

	receive() external payable {}
}