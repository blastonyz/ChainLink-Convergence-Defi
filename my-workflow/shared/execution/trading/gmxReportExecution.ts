import { cre, getNetwork, TxStatus, type Runtime } from "@chainlink/cre-sdk";
import { hexToBase64 } from "@chainlink/cre-sdk";
import { encodeGmxIntentPayload } from "./tradingPayloadEncoder";
import { normalizeTxHash } from "./executionUtils";
import type { Config, GmxAction, GmxIntentPayload } from "../../../types";

export const tryExecuteGmxIntent = (
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