export type TradingAction = "auto" | "long" | "short" | "close";

export type FlowMode = "all" | "position" | "trading";

export type OhlcPoint = [number, number, number, number, number];

export type GmxIntentConfig = {
  collateralToken?: string;
  market?: string;
  collateralAmountUsd?: string;
  sizeUsd?: string;
  slippageBps?: number;
};

export type ChainConfig = {
  chain: "mainnet" | "arbitrum";
  coingeckoCoinId: string;
  recommendationTarget: "gmx" | "aave-uniswap";
  strategyExecutorAddress?: string;
  gmxExecutorAddress?: string;
  gmxIntent?: GmxIntentConfig;
};

export type Config = {
  geminiModel: string;
  geminiApiBaseUrl: string;
  geminiTemperature?: number;
  geminiMaxOutputTokens?: number;
  coingeckoApiBaseUrl: string;
  coingeckoApiKeyHeader?: string;
  coingeckoVsCurrency: string;
  ohlcDays: number;
  coingeckoApiKeySecretId: string;
  geminiApiKeySecretId: string;
  chains: ChainConfig[];
  enableExecution?: boolean;
  defaultTradingMinConfidence?: number;
  gmxExecution?: {
    chainSelectorName: string;
    gasLimit: string;
  };
  gmxIntent?: GmxIntentConfig;
  httpAuthorizedKeys: Array<{ publicKey: string }>;
  httpAuthorizedKeysPosition?: Array<{ publicKey: string }>;
  httpAuthorizedKeysTrading?: Array<{ publicKey: string }>;
};

export type HttpPositionTriggerRequest = {
  reason?: string;
};

export type HttpTradingTriggerRequest = {
  reason?: string;
  action?: TradingAction;
  minConfidence?: number;
};

export type Recommendation = {
  chain: "mainnet" | "arbitrum";
  target: "gmx" | "aave-uniswap";
  coinId: string;
  strategy: string;
  confidence: number;
  rationale: string;
  riskControls: string[];
  route: {
    strategyExecutorAddress: string;
    gmxExecutorAddress: string;
  };
  gmx: {
    action: "none" | "long" | "short" | "close";
    shouldExecute: boolean;
    confidenceThreshold: number;
    txHash: string;
    status: "skipped" | "success" | "failed";
    detail: string;
  };
  ohlcSummary: {
    candles: number;
    firstOpen: number;
    lastClose: number;
    pctChange: number;
    periodHigh: number;
    periodLow: number;
  };
};

export type StrategyRunOptions = {
  forcedTradingAction: TradingAction;
  minConfidence: number;
};

export type FlowResult = {
  reason: string;
  generatedAt: string;
  recommendations: Recommendation[];
};
