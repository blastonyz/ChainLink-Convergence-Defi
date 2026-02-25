/**
 * Strategy and GMX execution types
 */

export type GmxAction = "long" | "short" | "close";

export type ActionResolutionSource = "forced" | "model-action" | "model-text" | "fallback";

export type GmxIntentPayload = {
  collateralToken: `0x${string}`;
  market: `0x${string}`;
  collateralAmountUsd: bigint;
  sizeUsd: bigint;
  triggerPrice: bigint;
  acceptablePrice: bigint;
};

export type StrategyAction = {
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
  minOut: bigint;
  dexId: number;
  fee: number;
};
