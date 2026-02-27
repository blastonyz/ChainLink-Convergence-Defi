import {
  consensusIdenticalAggregation,
  HTTPClient,
  type Runtime,
} from "@chainlink/cre-sdk";
import type {
  ChainConfig,
  Config,
  FlowMode,
  FlowResult,
  OhlcPoint,
  Recommendation,
  StrategyRunOptions,
  TradingAction,
} from "./types";
import { asNumber, parseMinConfidence } from "./shared/parsers/valueParsers";
import {
  buildGmxIntentPayload,
  parseGmxActionFromModel,
  resolveSwitcherAction,
  stripCodeFences,
} from "./strategyHelpers";
import { buildPrompt } from "./shared/prompt/promptBuilder";
import { askGemini, fetchOhlc, summarizeOhlc } from "./shared/data/marketDataClient";
import { tryExecuteGmxIntent } from "./shared/execution/trading/gmxReportExecution";
import { tryExecutePositionIntent } from "./shared/execution/position/positionReportExecution";

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

  let parsedGemini: {
    action?: string;
    strategy?: string;
    confidence?: number;
    rationale?: string;
    riskControls?: string[];
  };
  let geminiError: string | undefined;

  try {
    const rawGemini = httpClient
      .sendRequest(runtime, askGemini, consensusIdenticalAggregation<string>())({
        url: geminiUrl,
        prompt,
        temperature: geminiTemperature,
        maxOutputTokens: geminiMaxOutputTokens,
      })
      .result();

    parsedGemini = JSON.parse(stripCodeFences(rawGemini)) as {
      action?: string;
      strategy?: string;
      confidence?: number;
      rationale?: string;
      riskControls?: string[];
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    runtime.log(`[Gemini fallback] ${message}`);
    geminiError = message;
    parsedGemini = {
      action: "none",
      strategy: "Gemini unavailable",
      confidence: 0,
      rationale: `Gemini request failed (${message}). Execution skipped.`,
      riskControls: ["Retry later", "Respect rate limits", "No forced execution without model signal"],
    };
  }

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
    !geminiError &&
    chain.recommendationTarget === "gmx" &&
    action !== "none" &&
    confidence >= options.minConfidence &&
    (chain.gmxExecutorAddress || "").length > 0;

  const shouldExecutePosition =
    !geminiError &&
    chain.recommendationTarget === "aave-uniswap" &&
    action !== "none" &&
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
          geminiError
            ? `Gemini unavailable: ${geminiError}`
            : chain.recommendationTarget !== "gmx"
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
          geminiError
            ? `Gemini unavailable: ${geminiError}`
            : chain.recommendationTarget !== "aave-uniswap"
            ? "Not a position target"
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

  if (value === "auto" || value === "long" || value === "short") {
    return value;
  }

  throw new Error("Invalid trading action. Allowed values: auto | long | short");
};

export { parseMinConfidence };
