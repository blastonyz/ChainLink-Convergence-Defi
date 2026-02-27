/**
 * Helper functions for strategy and GMX execution
 */

import type {
  ActionResolutionSource,
  GmxAction,
  GmxIntentConfig,
  GmxIntentPayload,
  Recommendation,
  StrategyAction,
  TradingAction,
} from "./types";
import { encodeAbiParameters, parseAbiParameters } from "viem";
import { asAddress, asBigIntWithDefault, parseSlippageBps } from "./shared/parsers/valueParsers";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const resolveGmxActionFromModel = (strategy: string, rationale: string): GmxAction | "none" => {
  const haystack = `${strategy} ${rationale}`.toLowerCase();

  if (haystack.includes("short")) {
    return "short";
  }

  if (haystack.includes("long") || haystack.includes("buy")) {
    return "long";
  }

  return "none";
};

export const normalizeTextAction = (value: string): GmxAction | "none" | undefined => {
  const normalized = value.trim().toLowerCase();

  if (normalized === "long" || normalized === "short" || normalized === "none") {
    return normalized;
  }

  if (normalized.includes("sell") || normalized.includes("bear") || normalized.includes("downtrend")) {
    return "short";
  }

  if (normalized.includes("buy") || normalized.includes("bull") || normalized.includes("uptrend")) {
    return "long";
  }

  if (normalized.includes("exit") || normalized.includes("reduce")) {
    return "none";
  }

  return undefined;
};

export const parseGmxActionFromModel = (value: unknown): GmxAction | "none" | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  return normalizeTextAction(value);
};

export const resolveSwitcherAction = (
  forcedTradingAction: TradingAction,
  modelAction: GmxAction | "none" | undefined,
  strategy: string,
  rationale: string,
): { action: GmxAction | "none"; source: ActionResolutionSource } => {
  if (forcedTradingAction !== "auto") {
    return { action: forcedTradingAction, source: "forced" };
  }

  if (modelAction !== undefined) {
    return { action: modelAction, source: "model-action" };
  }

  const textAction = resolveGmxActionFromModel(strategy, rationale);
  if (textAction !== "none") {
    return { action: textAction, source: "model-text" };
  }

  return { action: "none", source: "fallback" };
};

export const mergeIntentConfig = (
  globalIntent: GmxIntentConfig | undefined,
  chainIntent: GmxIntentConfig | undefined,
): GmxIntentConfig => ({
  collateralToken: chainIntent?.collateralToken ?? globalIntent?.collateralToken,
  market: chainIntent?.market ?? globalIntent?.market,
  collateralAmountUsd: chainIntent?.collateralAmountUsd ?? globalIntent?.collateralAmountUsd,
  sizeUsd: chainIntent?.sizeUsd ?? globalIntent?.sizeUsd,
  slippageBps: chainIntent?.slippageBps ?? globalIntent?.slippageBps,
});

export const withWethUsdcDefaults = (intent: GmxIntentConfig): GmxIntentConfig => ({
  collateralToken: intent.collateralToken ?? "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  market: intent.market ?? "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
  collateralAmountUsd: intent.collateralAmountUsd,
  sizeUsd: intent.sizeUsd,
  slippageBps: intent.slippageBps,
});

export const buildGmxIntentPayload = (
  action: GmxAction,
  summary: Recommendation["ohlcSummary"],
  confidence: number,
  globalIntent: GmxIntentConfig | undefined,
  chainIntent: GmxIntentConfig | undefined,
): GmxIntentPayload => {
  const merged = withWethUsdcDefaults(mergeIntentConfig(globalIntent, chainIntent));
  const triggerPrice = BigInt(Math.max(1, Math.round(summary.lastClose * 1e8)));
  const dynamicSizeUsd = BigInt(Math.max(100, Math.round(confidence * 20)));
  const sizeUsd = asBigIntWithDefault(merged.sizeUsd, dynamicSizeUsd);
  const collateralAmountUsd = asBigIntWithDefault(merged.collateralAmountUsd, sizeUsd / 5n);
  const slippageBps = parseSlippageBps(merged.slippageBps);

  const acceptablePrice =
    action === "long"
      ? (triggerPrice * (10_000n + slippageBps)) / 10_000n
      : (triggerPrice * (10_000n - slippageBps)) / 10_000n;

  return {
    collateralToken: asAddress(merged.collateralToken),
    market: asAddress(merged.market),
    collateralAmountUsd,
    sizeUsd,
    triggerPrice,
    acceptablePrice,
  };
};

export const stripCodeFences = (content: string): string => {
  const trimmed = content.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  const withoutStart = trimmed.replace(/^```[a-zA-Z]*\s*/, "");
  return withoutStart.replace(/\s*```$/, "").trim();
};

export const getZeroAddress = (): `0x${string}` => ZERO_ADDRESS;

export const buildStrategyPositionActions = (
  collateralToken: string,
  borrowToken: string,
  collateralAmount: bigint,
  borrowAmount: bigint,
  swapEnabled: boolean,
): StrategyAction[] => {
  const actions: StrategyAction[] = [];

  // Action 1: Supply collateral to Aave
  actions.push({
    tokenIn: asAddress(collateralToken),
    tokenOut: ZERO_ADDRESS as `0x${string}`,
    amountIn: collateralAmount,
    minOut: 0n,
    dexId: 0,
    fee: 3000, // 0.3% Uniswap fee
  });

  // Action 2: Borrow asset from Aave
  actions.push({
    tokenIn: asAddress(borrowToken),
    tokenOut: ZERO_ADDRESS as `0x${string}`,
    amountIn: borrowAmount,
    minOut: 0n,
    dexId: 0,
    fee: 3000,
  });

  // Action 3: Swap borrowed asset (if enabled)
  if (swapEnabled && collateralToken && borrowToken) {
    actions.push({
      tokenIn: asAddress(borrowToken),
      tokenOut: asAddress(collateralToken),
      amountIn: borrowAmount,
      minOut: (borrowAmount * 95n) / 100n, // 5% slippage tolerance
      dexId: 0, // Uniswap
      fee: 3000,
    });
  }

  return actions;
};

export const encodeStrategyReport = (
  operationType: number,
  actions: StrategyAction[],
  beneficiary: string,
): string => {
  // Extract collateral and borrow amounts from actions
  // Action[0]: Supply (collateral)
  // Action[1]: Borrow
  const collateralAmount = actions.length > 0 ? actions[0].amountIn : 0n;
  const borrowAmount = actions.length > 1 ? actions[1].amountIn : 0n;

  // Encode as simple scalars (matching StrategyExecutor.onReport decoding)
  const reportData = encodeAbiParameters(
    parseAbiParameters(
      "uint8 operationType, uint256 collateralAmount, uint256 borrowAmount, address beneficiary"
    ),
    [operationType, collateralAmount, borrowAmount, asAddress(beneficiary)],
  );

  return reportData;
};
