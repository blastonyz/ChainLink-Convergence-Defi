// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IPermit2 {
	struct TokenPermissions {
		address token;
		uint256 amount;
	}

	struct PermitTransferFrom {
		TokenPermissions permitted;
		uint256 nonce;
		uint256 deadline;
	}

	struct SignatureTransferDetails {
		address to;
		uint256 requestedAmount;
	}

	function permitTransferFrom(
		PermitTransferFrom calldata permit,
		SignatureTransferDetails calldata transferDetails,
		address owner,
		bytes calldata signature
	) external;

	function DOMAIN_SEPARATOR() external view returns (bytes32);
}
