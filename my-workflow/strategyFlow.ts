import {
  bytesToHex,
  consensusIdenticalAggregation,
  cre,
  getNetwork,
  HTTPClient,
  type HTTPSendRequester,
  json,
  ok,
  safeJsonStringify,
  text,
  TxStatus,
  type Runtime,
} from "@chainlink/cre-sdk";
import { hexToBase64 } from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters } from "viem";
import type {
  ChainConfig,
  Config,
  FlowMode,
  FlowResult,
  GmxIntentConfig,
  OhlcPoint,
  Recommendation,
  StrategyRunOptions,
  TradingAction,
} from "./types";

const GMX_SHORT_PARAMS = parseAbiParameters(
  "uint8 action,address collateralToken,address market,uint256 collateralAmountUsd,uint256 sizeUsd,uint256 triggerPrice,uint256 acceptablePrice",
);

const POSITION_PARAMS = parseAbiParameters(
  "uint8 operationType,uint256 collateralAmount,uint256 borrowAmount,address beneficiary,bool isLong",
);

type GmxAction = "long" | "short" | "close";

type ActionResolutionSource = "forced" | "model-action" | "model-text" | "fallback";

type GmxIntentPayload = {
  collateralToken: `0x${string}`;
  market: `0x${string}`;
  collateralAmountUsd: bigint;
  sizeUsd: bigint;
  triggerPrice: bigint;
  acceptablePrice: bigint;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const utf8ToBase64 = (input: string): string => {
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

const asNumber = (value: unknown): number => {
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

const asAddress = (value: string | undefined): `0x${string}` => {
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return ZERO_ADDRESS;
  }

  return value as `0x${string}`;
};

const asBigIntWithDefault = (value: string | undefined, fallback: bigint): bigint => {
  if (!value) {
    return fallback;
  }

  try {
    return BigInt(value);
  } catch {
    return fallback;
  }
};

const parseSlippageBps = (value: number | undefined): bigint => {
  const bps = typeof value === "number" && Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 100;
  return BigInt(Math.min(500, bps));
};

const parseMinConfidence = (value: unknown, fallback: number): number => {
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

const resolveGmxActionFromModel = (strategy: string, rationale: string): GmxAction | "none" => {
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

const normalizeTextAction = (value: string): GmxAction | "none" | undefined => {
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

const parseGmxActionFromModel = (value: unknown): GmxAction | "none" | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  return normalizeTextAction(value);
};

const resolveSwitcherAction = (
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

const mergeIntentConfig = (
  globalIntent: GmxIntentConfig | undefined,
  chainIntent: GmxIntentConfig | undefined,
): GmxIntentConfig => ({
  collateralToken: chainIntent?.collateralToken ?? globalIntent?.collateralToken,
  market: chainIntent?.market ?? globalIntent?.market,
  collateralAmountUsd: chainIntent?.collateralAmountUsd ?? globalIntent?.collateralAmountUsd,
  sizeUsd: chainIntent?.sizeUsd ?? globalIntent?.sizeUsd,
  slippageBps: chainIntent?.slippageBps ?? globalIntent?.slippageBps,
});

const withWethUsdcDefaults = (intent: GmxIntentConfig): GmxIntentConfig => ({
  collateralToken: intent.collateralToken ?? "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  market: intent.market ?? "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
  collateralAmountUsd: intent.collateralAmountUsd,
  sizeUsd: intent.sizeUsd,
  slippageBps: intent.slippageBps,
});

const buildGmxIntentPayload = (
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

const encodeGmxIntentPayload = (action: GmxAction, intent: GmxIntentPayload): string => {
  const actionCode = action === "long" ? 0 : action === "short" ? 1 : 2;

  return encodeAbiParameters(GMX_SHORT_PARAMS, [
    actionCode,
    intent.collateralToken,
    intent.market,
    intent.collateralAmountUsd,
    intent.sizeUsd,
    intent.triggerPrice,
    intent.acceptablePrice,
  ]);
};

const encodePositionPayload = (
  action: GmxAction,
  collateralAmount: bigint,
  borrowAmount: bigint,
  beneficiary: `0x${string}`,
): string => {
  const operationType = 1;
  const isLong = action === "long";

  return encodeAbiParameters(POSITION_PARAMS, [operationType, collateralAmount, borrowAmount, beneficiary, isLong]);
};

const normalizeTxHash = (rawHash: Uint8Array | undefined): string => {
  if (!rawHash || rawHash.length === 0) {
    return "";
  }

  const hexHash = bytesToHex(rawHash);
  if (/^0x0{64}$/i.test(hexHash)) {
    return "";
  }

  return hexHash;
};

const tryExecuteGmxIntent = (
  runtime: Runtime<Config>,
  receiver: string,
  action: GmxAction,
  intent: GmxIntentPayload,
): { txHash: string; status: "success" | "failed"; detail: string } => {
  if (!runtime.config.enableExecution) {
    return {
      txHash: "",
      status: "failed",
      detail: "Execution disabled in config (enableExecution=false)",
    };
  }

  const execution = runtime.config.gmxExecution;
  if (!execution?.chainSelectorName) {
    return {
      txHash: "",
      status: "failed",
      detail: "Missing gmxExecution.chainSelectorName in config",
    };
  }

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: execution.chainSelectorName,
    isTestnet: false,
  });

  if (!network) {
    return {
      txHash: "",
      status: "failed",
      detail: `Unknown network: ${execution.chainSelectorName}`,
    };
  }

  try {
    runtime.log(
      `[GMX payload] action=${action} sizeUsd=${intent.sizeUsd.toString()} triggerPrice=${intent.triggerPrice.toString()} acceptablePrice=${intent.acceptablePrice.toString()}`,
    );

    const encodedPayload = encodeGmxIntentPayload(action, intent);
    const report = runtime
      .report({
        encodedPayload: hexToBase64(encodedPayload),
        encoderName: "evm",
        signingAlgo: "ecdsa",
        hashingAlgo: "keccak256",
      })
      .result();

    const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);
    const writeResult = evmClient
      .writeReport(runtime, {
        receiver,
        report,
        gasConfig: {
          gasLimit: execution.gasLimit,
        },
      })
      .result();

    if (writeResult.txStatus === TxStatus.SUCCESS) {
      const txHash = normalizeTxHash(writeResult.txHash);
      return {
        txHash,
        status: "success",
        detail: txHash ? `${action.toUpperCase()} order submitted` : `${action.toUpperCase()} order submitted (tx hash unavailable in simulator)`,
      };
    }

    return {
      txHash: "",
      status: "failed",
      detail: `writeReport status=${writeResult.txStatus}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      txHash: "",
      status: "failed",
      detail: message,
    };
  }
};

const tryExecutePositionIntent = (
  runtime: Runtime<Config>,
  receiver: string,
  action: GmxAction,
  chain: ChainConfig,
): { txHash: string; status: "success" | "failed"; detail: string } => {
  if (!runtime.config.enableExecution) {
    return {
      txHash: "",
      status: "failed",
      detail: "Execution disabled in config (enableExecution=false)",
    };
  }

  if (action === "close") {
    return {
      txHash: "",
      status: "failed",
      detail: `Unsupported position action: ${action}`,
    };
  }

  const execution = runtime.config.gmxExecution;
  if (!execution?.chainSelectorName) {
    return {
      txHash: "",
      status: "failed",
      detail: "Missing gmxExecution.chainSelectorName in config",
    };
  }

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: execution.chainSelectorName,
    isTestnet: false,
  });

  if (!network) {
    return {
      txHash: "",
      status: "failed",
      detail: `Unknown network: ${execution.chainSelectorName}`,
    };
  }

  const collateralAmount = action === "long" ? 1_000_000_000_000_000_000n : 1_000_000_000n;
  const borrowAmount = action === "long" ? 1_000_000_000n : 250_000_000_000_000_000n;
  const workflowOwner = runtime.config._cre?.workflowOwner;
  if (!workflowOwner) {
    return {
      txHash: "",
      status: "failed",
      detail: "Missing _cre.workflowOwner in config for position beneficiary",
    };
  }
  const beneficiary = asAddress(workflowOwner);

  try {
    runtime.log(
      `[POSITION payload] action=${action} collateralAmount=${collateralAmount.toString()} borrowAmount=${borrowAmount.toString()}`,
    );

    const encodedPayload = encodePositionPayload(action, collateralAmount, borrowAmount, beneficiary);
    const report = runtime
      .report({
        encodedPayload: hexToBase64(encodedPayload),
        encoderName: "evm",
        signingAlgo: "ecdsa",
        hashingAlgo: "keccak256",
      })
      .result();

    const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);
    const writeResult = evmClient
      .writeReport(runtime, {
        receiver,
        report,
        gasConfig: {
          gasLimit: execution.gasLimit,
        },
      })
      .result();

    if (writeResult.txStatus === TxStatus.SUCCESS) {
      const txHash = normalizeTxHash(writeResult.txHash);
      return {
        txHash,
        status: "success",
        detail: txHash
          ? `POSITION ${action.toUpperCase()} submitted`
          : `POSITION ${action.toUpperCase()} submitted (tx hash unavailable in simulator)`,
      };
    }

    return {
      txHash: "",
      status: "failed",
      detail: `writeReport status=${writeResult.txStatus}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      txHash: "",
      status: "failed",
      detail: message,
    };
  }
};

const summarizeOhlc = (ohlc: OhlcPoint[]) => {
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

const stripCodeFences = (content: string): string => {
  const trimmed = content.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  const withoutStart = trimmed.replace(/^```[a-zA-Z]*\s*/, "");
  return withoutStart.replace(/\s*```$/, "").trim();
};

const fetchOhlc = (
  sendRequester: HTTPSendRequester,
  request: { url: string; apiKey: string; apiKeyHeader: string },
): string => {
  const headers: Record<string, string> = {};
  headers[request.apiKeyHeader] = request.apiKey;

  const response = sendRequester
    .sendRequest({
      url: request.url,
      method: "GET",
      headers,
    })
    .result();

  if (!ok(response)) {
    throw new Error(`CoinGecko request failed: ${response.statusCode} | ${text(response)}`);
  }

  return safeJsonStringify(json(response));
};

const askGemini = (
  sendRequester: HTTPSendRequester,
  request: { url: string; prompt: string; temperature: number; maxOutputTokens: number },
): string => {
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: request.prompt }],
      },
    ],
    generationConfig: {
      temperature: request.temperature,
      responseMimeType: "application/json",
      maxOutputTokens: request.maxOutputTokens,
    },
  };

  const response = sendRequester
    .sendRequest({
      url: request.url,
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: utf8ToBase64(safeJsonStringify(body)),
    })
    .result();

  if (!ok(response)) {
    throw new Error(`Gemini request failed: ${response.statusCode}`);
  }

  const payload = json(response) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const textOutput = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error("Gemini returned an empty response");
  }

  return textOutput;
};

const buildPrompt = (
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

const recommendForChain = (
  runtime: Runtime<Config>,
  httpClient: HTTPClient,
  chain: ChainConfig,
  coingeckoApiKey: string,
  geminiApiKey: string,
  options: StrategyRunOptions,
): Recommendation => {
  const ohlcUrl = `${runtime.config.coingeckoApiBaseUrl}/coins/${chain.coingeckoCoinId}/ohlc?vs_currency=${runtime.config.coingeckoVsCurrency}&days=${runtime.config.ohlcDays}`;
  const coingeckoApiKeyHeader = runtime.config.coingeckoApiKeyHeader || "x-cg-pro-api-key";

  const serializedOhlc = httpClient
    .sendRequest(runtime, fetchOhlc, consensusIdenticalAggregation<string>())({
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
    .sendRequest(runtime, askGemini, consensusIdenticalAggregation<string>())({
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
  } else {
    runtime.log(
      `[POSITION switcher] source=${actionResolution.source} modelAction=${modelAction ?? "n/a"} resolvedAction=${action}`,
    );
  }
  const shouldExecuteGmx =
    chain.recommendationTarget === "gmx" &&
    action !== "none" &&
    confidence >= options.minConfidence &&
    (chain.gmxExecutorAddress || "").length > 0;

  const shouldExecutePosition =
    chain.recommendationTarget === "aave-uniswap" &&
    action !== "none" &&
    action !== "close" &&
    confidence >= options.minConfidence &&
    (chain.strategyExecutorAddress || "").length > 0;

  const gmxIntent =
    chain.recommendationTarget === "gmx" && action !== "none"
      ? buildGmxIntentPayload(action, summary, confidence, runtime.config.gmxIntent, chain.gmxIntent)
      : undefined;

  const gmxExecutionResult = shouldExecuteGmx && gmxIntent
    ? tryExecuteGmxIntent(runtime, chain.gmxExecutorAddress || "", action, gmxIntent)
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

  const positionExecutionResult = shouldExecutePosition
    ? tryExecutePositionIntent(runtime, chain.strategyExecutorAddress || "", action, chain)
    : {
        txHash: "",
        status: "failed" as const,
        detail:
          chain.recommendationTarget !== "aave-uniswap"
            ? "Not a position target"
            : action === "close"
              ? "Close action not implemented for position flow"
              : action === "none"
                ? "No position action resolved"
                : confidence < options.minConfidence
                  ? `Confidence ${confidence.toFixed(2)} below threshold ${options.minConfidence.toFixed(2)}`
                  : "Missing StrategyExecutor address",
      };

  const shouldExecute = chain.recommendationTarget === "gmx" ? shouldExecuteGmx : shouldExecutePosition;
  const executionResult = chain.recommendationTarget === "gmx" ? gmxExecutionResult : positionExecutionResult;

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
      shouldExecute,
      confidenceThreshold: options.minConfidence,
      txHash: executionResult.txHash,
      status: shouldExecute ? executionResult.status : "skipped",
      detail: executionResult.detail,
    },
    ohlcSummary: summary,
  };
};

export const runStrategyFlow = (
  runtime: Runtime<Config>,
  reason: string,
  mode: FlowMode,
  options: StrategyRunOptions,
): FlowResult => {
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  runtime.log("CRE Workflow: CoinGecko OHLC + Gemini Strategy Recommender");
  runtime.log(`Reason: ${reason}`);
  runtime.log(`Mode: ${mode}`);

  const coingeckoApiKey = runtime.getSecret({ id: runtime.config.coingeckoApiKeySecretId }).result().value;
  const geminiApiKey = runtime.getSecret({ id: runtime.config.geminiApiKeySecretId }).result().value;

  const httpClient = new HTTPClient();
  const chainsToRun = runtime.config.chains.filter((chain) => {
    if (mode === "position") {
      return chain.recommendationTarget === "aave-uniswap";
    }

    if (mode === "trading") {
      return chain.recommendationTarget === "gmx";
    }

    return true;
  });

  if (chainsToRun.length === 0) {
    throw new Error(`No chains configured for mode: ${mode}`);
  }

  const recommendations = chainsToRun.map((chain) => {
    runtime.log(`Processing ${chain.chain} (${chain.coingeckoCoinId})`);
    const recommendation = recommendForChain(runtime, httpClient, chain, coingeckoApiKey, geminiApiKey, options);
    if (recommendation.target === "gmx") {
      runtime.log(
        `[GMX] action=${recommendation.gmx.action} shouldExecute=${String(recommendation.gmx.shouldExecute)} status=${recommendation.gmx.status} detail=${recommendation.gmx.detail}`,
      );
    }

    return recommendation;
  });

  const result: FlowResult = {
    reason,
    generatedAt: runtime.now().toISOString(),
    recommendations,
  };

  runtime.log(`Generated ${recommendations.length} recommendations`);
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  return result;
};

export const parseTradingAction = (value: unknown): TradingAction => {
  if (value === undefined) {
    return "auto";
  }

  if (value === "auto" || value === "long" || value === "short" || value === "close") {
    return value;
  }

  throw new Error("Invalid trading action. Allowed values: auto | long | short | close");
};

export { parseMinConfidence };
