import { cre, decodeJson, handler, type HTTPPayload, type Runtime } from "@chainlink/cre-sdk";
import { parseMinConfidence, parseTradingAction, runStrategyFlow } from "./strategyFlow";
import type {
  Config,
  FlowResult,
  HttpPositionTriggerRequest,
  HttpTradingTriggerRequest,
} from "./types";

const resolveHttpReason = (payload: HTTPPayload, defaultReason: string): string => {
  let reason = defaultReason;

  if (payload.input && payload.input.length > 0) {
    const parsed = decodeJson(payload.input) as HttpPositionTriggerRequest;
    if (typeof parsed.reason === "string" && parsed.reason.trim().length > 0) {
      reason = parsed.reason.trim();
    }
  }

  return reason;
};

const onHttpPositionTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): FlowResult => {
  const reason = resolveHttpReason(payload, "http-position");
  return runStrategyFlow(runtime, reason, "position", {
    forcedTradingAction: "auto",
    minConfidence: runtime.config.defaultTradingMinConfidence ?? 60,
  });
};

const onHttpTradingTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): FlowResult => {
  let parsed: HttpTradingTriggerRequest = {};

  if (payload.input && payload.input.length > 0) {
    parsed = decodeJson(payload.input) as HttpTradingTriggerRequest;
  }

  const reason =
    typeof parsed.reason === "string" && parsed.reason.trim().length > 0
      ? parsed.reason.trim()
      : "http-trading";

  const forcedTradingAction = parseTradingAction(parsed.action);
  const minConfidence = parseMinConfidence(parsed.minConfidence, runtime.config.defaultTradingMinConfidence ?? 60);

  runtime.log(`[HTTP trading] action=${forcedTradingAction} minConfidence=${minConfidence}`);

  return runStrategyFlow(runtime, reason, "trading", {
    forcedTradingAction,
    minConfidence,
  });
};

export const initWorkflow = (config: Config) => {
  const httpPosition = new cre.capabilities.HTTPCapability();
  const httpTrading = new cre.capabilities.HTTPCapability();
  const positionKeys = config.httpAuthorizedKeysPosition ?? config.httpAuthorizedKeys;
  const tradingKeys = config.httpAuthorizedKeysTrading ?? config.httpAuthorizedKeys;

  return [
    handler(
      httpPosition.trigger({
        authorizedKeys: positionKeys.map((key) => ({
          type: "KEY_TYPE_ECDSA_EVM",
          publicKey: key.publicKey,
        })),
      }),
      onHttpPositionTrigger,
    ),
    handler(
      httpTrading.trigger({
        authorizedKeys: tradingKeys.map((key) => ({
          type: "KEY_TYPE_ECDSA_EVM",
          publicKey: key.publicKey,
        })),
      }),
      onHttpTradingTrigger,
    ),
  ];
};
