import { safeJsonStringify } from "@chainlink/cre-sdk";
import { getPromptDirectionInstruction, getPromptRouteHint } from "../execution/trading/tradingExecutionConfig";
import type { ChainConfig, OhlcPoint, OhlcSummary, TradingAction } from "../../types";

export const buildPrompt = (
  chain: ChainConfig,
  summary: OhlcSummary,
  ohlc: OhlcPoint[],
  forcedTradingAction: TradingAction,
  generatedAt: string,
): string => {
  const recent = ohlc.slice(-5);
  const directionInstruction = getPromptDirectionInstruction(chain, forcedTradingAction);
  const routeHint = getPromptRouteHint(chain);

  return [
    "You are a DeFi strategy analyst for an automated Chainlink CRE workflow.",
    "Respond strictly in JSON with keys: action, strategy, confidence, rationale, riskControls.",
    "action must be one of: long, short, none.",
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
