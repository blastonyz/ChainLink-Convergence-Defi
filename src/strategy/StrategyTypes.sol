// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

enum OperationType {
	Arbitrage,
	Position
}

struct Action {
	uint8 dexId;
	address tokenIn;
	address tokenOut;
	uint256 amountIn;
	uint256 minOut;
	uint24 fee;
	uint256 amountAux;
	address beneficiary;
	bytes data;
}
