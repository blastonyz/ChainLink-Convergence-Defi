// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IAave} from "./interfaces/IAave.sol";

abstract contract AaveBase {
	IAave public immutable aave;
	uint256 internal constant VARIABLE_RATE_MODE = 2;

	constructor(address aavePool) {
		require(aavePool != address(0), "AAVE_POOL_ZERO");
		aave = IAave(aavePool);
	}

	function _aaveSupply(address asset, uint256 amount, address onBehalfOf) internal {
		aave.supply(asset, amount, onBehalfOf, 0);
	}

	function _aaveSetUseReserveAsCollateral(address asset, bool useAsCollateral) internal {
		aave.setUserUseReserveAsCollateral(asset, useAsCollateral);
	}

	function _aaveBorrow(address asset, uint256 amount, address onBehalfOf) internal {
		aave.borrow(asset, amount, VARIABLE_RATE_MODE, 0, onBehalfOf);
	}

	function _aaveRepay(
		address asset,
		uint256 amount,
		uint256 rateMode,
		address onBehalfOf
	) internal returns (uint256 repaid) {
		repaid = aave.repay(asset, amount, rateMode, onBehalfOf);
	}

	function _aaveFlashloanSimple(address receiver, address asset, uint256 amount, bytes memory params)
		internal
	{
		aave.flashLoanSimple(receiver, asset, amount, params, 0);
	}
}
