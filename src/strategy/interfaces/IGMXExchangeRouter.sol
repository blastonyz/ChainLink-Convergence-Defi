// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IBaseOrderUtils} from "gmx/order/IBaseOrderUtils.sol";

interface IGMXExchangeRouter {
	function sendWnt(address receiver, uint256 amount) external payable;

	function sendTokens(address token, address receiver, uint256 amount) external payable;

	function createOrder(IBaseOrderUtils.CreateOrderParams calldata params)
		external
		payable
		returns (bytes32);
}
