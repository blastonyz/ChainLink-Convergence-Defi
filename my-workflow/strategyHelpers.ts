/**
 * Helper functions for strategy and GMX execution
 */

import type { GmxAction, GmxIntentPayload, StrategyAction, ActionResolutionSource } from "./strategyTypes";
import type { ChainConfig, GmxIntentConfig, OhlcPoint, Recommendation, StrategyRunOptions, TradingAction } from "./types";
import { encodeAbiParameters, parseAbiParameters } from "viem";
import {
  consensusIdenticalAggregation,
  HTTPClient,
  type HTTPSendRequester,
  safeJsonStringify,
  type Runtime,
} from "@chainlink/cre-sdk";

import type { Config } from "./types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const utf8ToBase64 = (input: string): string => {
  const bytes = new TextEncoder().encode(input);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index] ?? 0;
    const byte2 = bytes[index + 1] ?? 0;
    const byte3 = bytes[index + 2] ?? 0;

    const chunk = (byte1 << 16) | (byte2 << 8) | byte3;
    out += chars[(chunk >> 18) & 63];
    out += chars[(chunk >> 12) & 63];
    out += index + 1 < bytes.length ? chars[(chunk >> 6) & 63] : "=";
    out += index + 2 < bytes.length ? chars[chunk & 63] : "=";
  }

  return out;
};

export const asNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

export const asAddress = (value: string | undefined): `0x${string}` => {
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return ZERO_ADDRESS;
  }

  return value as `0x${string}`;
};

export const asBigIntWithDefault = (value: string | undefined, fallback: bigint): bigint => {
  if (!value) {
    return fallback;
  }

  try {
    return BigInt(value);
  } catch {
    return fallback;
  }
};

export const parseSlippageBps = (value: number | undefined): bigint => {
  const bps = typeof value === "number" && Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 100;
  return BigInt(Math.min(500, bps));
};

export const parseMinConfidence = (value: unknown, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Invalid minConfidence. Expected a finite number between 0 and 100");
  }

  if (value < 0 || value > 100) {
    throw new Error("Invalid minConfidence. Expected a value between 0 and 100");
  }

  return value;
};

export const resolveGmxActionFromModel = (strategy: string, rationale: string): GmxAction | "none" => {
  const haystack = `${strategy} ${rationale}`.toLowerCase();

  if (haystack.includes("short")) {
    return "short";
  }

  if (haystack.includes("close") || haystack.includes("reduce")) {
    return "close";
  }

  if (haystack.includes("long") || haystack.includes("buy")) {
    return "long";
  }

  return "none";
};

export const normalizeTextAction = (value: string): GmxAction | "none" | undefined => {
  const normalized = value.trim().toLowerCase();

  if (normalized === "long" || normalized === "short" || normalized === "close" || normalized === "none") {
    return normalized;
  }

  if (normalized.includes("sell") || normalized.includes("bear") || normalized.includes("downtrend")) {
    return "short";
  }

  if (normalized.includes("buy") || normalized.includes("bull") || normalized.includes("uptrend")) {
    return "long";
  }

  if (normalized.includes("exit") || normalized.includes("reduce")) {
    return "close";
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

export const summarizeOhlc = (ohlc: OhlcPoint[]) => {
  const firstOpen = asNumber(ohlc[0]?.[1]);
  const lastClose = asNumber(ohlc[ohlc.length - 1]?.[4]);
  const highs = ohlc.map((point) => asNumber(point[2]));
  const lows = ohlc.map((point) => asNumber(point[3]));
  const periodHigh = highs.length ? Math.max(...highs) : 0;
  const periodLow = lows.length ? Math.min(...lows) : 0;
  const pctChange = firstOpen > 0 ? ((lastClose - firstOpen) / firstOpen) * 100 : 0;

  return {
    candles: ohlc.length,
    firstOpen,
    lastClose,
    pctChange,
    periodHigh,
    periodLow,
  };
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

export const buildPrompt = (
  chain: ChainConfig,
  summary: ReturnType<typeof summarizeOhlc>,
  ohlc: OhlcPoint[],
  forcedTradingAction: TradingAction,
  generatedAt: string,
): string => {
  const recent = ohlc.slice(-5);
  const directionInstruction =
    chain.recommendationTarget === "gmx" && forcedTradingAction !== "auto"
      ? `Action is forced to ${forcedTradingAction}. Set action="${forcedTradingAction}" and align strategy/rationale to that action.`
      : "Choose action from market context and return it in action field.";
  const routeHint =
    chain.recommendationTarget === "gmx"
      ? `Use GMXExecutor route on chain=${chain.chain}. gmxExecutorAddress=${chain.gmxExecutorAddress || "n/a"}`
      : `Use StrategyExecutor position flow on chain=${chain.chain}. strategyExecutorAddress=${chain.strategyExecutorAddress || "n/a"}`;

  return [
    "You are a DeFi strategy analyst for an automated Chainlink CRE workflow.",
    "Respond strictly in JSON with keys: action, strategy, confidence, rationale, riskControls.",
    "action must be one of: long, short, close, none.",
    "confidence must be a number from 0 to 100.",
    "riskControls must be an array of 3 short strings.",
    directionInstruction,
    `Network=${chain.chain}; target=${chain.recommendationTarget}; coin=${chain.coingeckoCoinId}`,
    routeHint,
    `GeneratedAt=${generatedAt}`,
    `OHLC summary: candles=${summary.candles}, firstOpen=${summary.firstOpen}, lastClose=${summary.lastClose}, pctChange=${summary.pctChange}, high=${summary.periodHigh}, low=${summary.periodLow}`,
    `Recent OHLC candles (ts,open,high,low,close): ${safeJsonStringify(recent)}`,
    "Prioritize conservative risk management and avoid guaranteed claims.",
  ].join("\n");
};

// Nota: recommendForChain no es async porque CRE SDK usa patrón sincrónico con .result()
export const recommendForChain = (
  runtime: Runtime<Config>,
  httpClient: HTTPClient,
  chain: ChainConfig,
  coingeckoApiKey: string,
  geminiApiKey: string,
  options: StrategyRunOptions,
  fetchOhlcFn: (
    sendRequester: HTTPSendRequester,
    request: { url: string; apiKey: string; apiKeyHeader: string },
  ) => string,
  askGeminiFn: (
    sendRequester: HTTPSendRequester,
    request: { url: string; prompt: string; temperature: number; maxOutputTokens: number },
  ) => string,
  tryExecuteGmxIntentFn: (
    runtime: Runtime<Config>,
    receiver: string,
    action: GmxAction,
    intent: GmxIntentPayload,
  ) => { txHash: string; status: "success" | "failed"; detail: string },
  tryExecuteStrategyIntentFn: (
    runtime: Runtime<Config>,
    receiver: string,
    action: "long" | "short" | "close",
    collateralToken: string,
    borrowToken: string,
    collateralAmount: bigint,
    borrowAmount: bigint,
    chainSelectorName: string,
  ) => { txHash: string; status: "success" | "failed"; detail: string },
): Recommendation => {
  const ohlcUrl = `${runtime.config.coingeckoApiBaseUrl}/coins/${chain.coingeckoCoinId}/ohlc?vs_currency=${runtime.config.coingeckoVsCurrency}&days=${runtime.config.ohlcDays}`;
  const coingeckoApiKeyHeader = runtime.config.coingeckoApiKeyHeader || "x-cg-pro-api-key";

  const serializedOhlc = httpClient
    .sendRequest(runtime, fetchOhlcFn, consensusIdenticalAggregation<string>())({
      url: ohlcUrl,
      apiKey: coingeckoApiKey,
      apiKeyHeader: coingeckoApiKeyHeader,
    })
    .result();

  const ohlc = JSON.parse(serializedOhlc) as OhlcPoint[];
  if (!Array.isArray(ohlc) || ohlc.length === 0) {
    throw new Error(`No OHLC data returned for ${chain.coingeckoCoinId}`);
  }

  const summary = summarizeOhlc(ohlc);
  const prompt = buildPrompt(chain, summary, ohlc, options.forcedTradingAction, runtime.now().toISOString());
  const geminiUrl = `${runtime.config.geminiApiBaseUrl}/models/${runtime.config.geminiModel}:generateContent?key=${geminiApiKey}`;
  const geminiTemperature =
    typeof runtime.config.geminiTemperature === "number" && Number.isFinite(runtime.config.geminiTemperature)
      ? Math.max(0, Math.min(1, runtime.config.geminiTemperature))
      : 0.25;
  const geminiMaxOutputTokens =
    typeof runtime.config.geminiMaxOutputTokens === "number" && Number.isFinite(runtime.config.geminiMaxOutputTokens)
      ? Math.max(128, Math.floor(runtime.config.geminiMaxOutputTokens))
      : 700;

  const rawGemini = httpClient
    .sendRequest(runtime, askGeminiFn, consensusIdenticalAggregation<string>())({
      url: geminiUrl,
      prompt,
      temperature: geminiTemperature,
      maxOutputTokens: geminiMaxOutputTokens,
    })
    .result();

  const parsedGemini = JSON.parse(stripCodeFences(rawGemini)) as {
    action?: string;
    strategy?: string;
    confidence?: number;
    rationale?: string;
    riskControls?: string[];
  };

  const confidence = Math.max(0, Math.min(100, asNumber(parsedGemini.confidence)));
  const modelAction = parseGmxActionFromModel(parsedGemini.action);
  const actionResolution = resolveSwitcherAction(
    options.forcedTradingAction,
    modelAction,
    parsedGemini.strategy || "",
    parsedGemini.rationale || "",
  );
  const action = actionResolution.action;

  if (chain.recommendationTarget === "gmx") {
    runtime.log(
      `[GMX switcher] source=${actionResolution.source} modelAction=${modelAction ?? "n/a"} resolvedAction=${action}`,
    );
  }

  // GMX Execution
  const shouldExecuteGmx =
    chain.recommendationTarget === "gmx" &&
    action !== "none" &&
    confidence >= options.minConfidence &&
    (chain.gmxExecutorAddress || "").length > 0;

  const gmxIntent =
    chain.recommendationTarget === "gmx" && action !== "none"
      ? buildGmxIntentPayload(action, summary, confidence, runtime.config.gmxIntent, chain.gmxIntent)
      : undefined;

  const gmxExecutionResult = shouldExecuteGmx && gmxIntent
    ? tryExecuteGmxIntentFn(runtime, chain.gmxExecutorAddress || "", action, gmxIntent)
    : {
        txHash: "",
        status: "failed" as const,
        detail:
          chain.recommendationTarget !== "gmx"
            ? "Not a GMX target"
            : action === "none"
              ? "No GMX action resolved"
              : confidence < options.minConfidence
                ? `Confidence ${confidence.toFixed(2)} below threshold ${options.minConfidence.toFixed(2)}`
                : "Missing GMX receiver address",
      };

  // Aave/Uniswap Position Execution
  const shouldExecuteStrategy =
    chain.recommendationTarget === "aave-uniswap" &&
    action !== "none" &&
    confidence >= options.minConfidence &&
    (chain.strategyExecutorAddress || "").length > 0;

  const strategyCollateralToken = chain.chain === "mainnet" 
    ? "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"  // USDC Mainnet
    : "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // USDC Arbitrum
  
  const strategyBorrowToken = chain.chain === "mainnet"
    ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"  // WETH Mainnet
    : "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"; // WETH Arbitrum

  // Real-world sizing for Aave LTV constraints:
  // Collateral: 1000 USDC (realistic amount Aave can process)
  // Borrow: 0.25 WETH (~$500, LTV ~50% = well below 75-80% limits)
  // This ensures values aren't truncated to 0 in Aave's internal calculations
  const collateralAmount = BigInt(1000) * BigInt(10 ** 6); // 1000 USDC fixed
  const borrowAmount = BigInt(250) * BigInt(10 ** 15); // 0.25 WETH fixed

  const strategyExecutionResult = shouldExecuteStrategy
    ? tryExecuteStrategyIntentFn(
        runtime,
        chain.strategyExecutorAddress || "",
        action,
        strategyCollateralToken,
        strategyBorrowToken,
        collateralAmount,
        borrowAmount,
        chain.chain === "mainnet" ? "ethereum-mainnet" : "ethereum-mainnet-arbitrum-1",
      )
    : {
        txHash: "",
        status: "failed" as const,
        detail:
          chain.recommendationTarget !== "aave-uniswap"
            ? "Not an aave-uniswap target"
            : action === "none"
              ? "No position action resolved"
              : confidence < options.minConfidence
                ? `Confidence ${confidence.toFixed(2)} below threshold ${options.minConfidence.toFixed(2)}`
                : "Missing StrategyExecutor address",
      };

  const executionResult = chain.recommendationTarget === "gmx" ? gmxExecutionResult : strategyExecutionResult;

  return {
    chain: chain.chain,
    target: chain.recommendationTarget,
    coinId: chain.coingeckoCoinId,
    strategy: parsedGemini.strategy || "hold",
    confidence,
    rationale: parsedGemini.rationale || "No rationale provided",
    riskControls: Array.isArray(parsedGemini.riskControls)
      ? parsedGemini.riskControls.slice(0, 3)
      : ["Use stop-loss", "Limit position size", "Review volatility"],
    route: {
      strategyExecutorAddress: chain.strategyExecutorAddress || "",
      gmxExecutorAddress: chain.gmxExecutorAddress || "",
    },
    gmx: {
      action,
      shouldExecute: shouldExecuteGmx,
      confidenceThreshold: options.minConfidence,
      txHash: executionResult.txHash,
      status: shouldExecuteGmx ? executionResult.status : "skipped",
      detail: executionResult.detail,
    },
    ohlcSummary: summary,
  };
};
