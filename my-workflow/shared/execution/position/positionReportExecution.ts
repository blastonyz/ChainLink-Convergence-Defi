import { cre, getNetwork, TxStatus, type Runtime } from "@chainlink/cre-sdk";
import { hexToBase64 } from "@chainlink/cre-sdk";
import { asAddress } from "../../parsers/valueParsers";
import { encodePositionPayload } from "./positionPayloadEncoder";
import { normalizeTxHash } from "../trading/executionUtils";
import type { ChainConfig, Config, GmxAction } from "../../../types";

export const tryExecutePositionIntent = (
  runtime: Runtime<Config>,
  receiver: string,
  action: GmxAction,
  _chain: ChainConfig,
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