import type { ChainConfig } from "../../../types";

type PositionExecutionConfig = {
  collateralToken: string;
  borrowToken: string;
  chainSelectorName: string;
  collateralAmount: bigint;
  borrowAmount: bigint;
};

const POSITION_EXECUTION_CONFIG_ARB: PositionExecutionConfig = {
  collateralToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  borrowToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  chainSelectorName: "ethereum-mainnet-arbitrum-1",
  collateralAmount: 1000n * 10n ** 6n,
  borrowAmount: 250n * 10n ** 15n,
};

export const getPositionExecutionConfig = (_chain: ChainConfig["chain"]): PositionExecutionConfig =>
  POSITION_EXECUTION_CONFIG_ARB;