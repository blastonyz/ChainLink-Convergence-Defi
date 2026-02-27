import type { ChainConfig, TradingAction } from "../../../types";

export const getPromptDirectionInstruction = (
  chain: ChainConfig,
  forcedTradingAction: TradingAction,
): string => {
  if (chain.recommendationTarget === "gmx" && forcedTradingAction !== "auto") {
    return `Action is forced to ${forcedTradingAction}. Set action="${forcedTradingAction}" and align strategy/rationale to that action.`;
  }

  return "Choose action from market context and return it in action field.";
};

export const getPromptRouteHint = (chain: ChainConfig): string => {
  if (chain.recommendationTarget === "gmx") {
    return `Use GMXExecutor route on chain=${chain.chain}. gmxExecutorAddress=${chain.gmxExecutorAddress || "n/a"}`;
  }

  return `Use StrategyExecutor position flow on chain=${chain.chain}. strategyExecutorAddress=${chain.strategyExecutorAddress || "n/a"}`;
};