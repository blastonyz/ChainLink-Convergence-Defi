// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IPermit2} from "./interfaces/IPermit2.sol";

enum OperationType {
	Arbitrage,
	Position,
	Trading
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

struct Permit2Data {
	IPermit2.PermitTransferFrom permit;
	IPermit2.SignatureTransferDetails transferDetails;
	address owner;
	bytes signature;
}
