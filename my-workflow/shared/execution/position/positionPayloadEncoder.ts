import { encodeAbiParameters, parseAbiParameters } from "viem";
import type { GmxAction } from "../../../types";

const POSITION_PARAMS = parseAbiParameters(
  "uint8 operationType,uint256 collateralAmount,uint256 borrowAmount,address beneficiary,bool isLong",
);

export const encodePositionPayload = (
  action: GmxAction,
  collateralAmount: bigint,
  borrowAmount: bigint,
  beneficiary: `0x${string}`,
): string => {
  const operationType = 1;
  const isLong = action === "long";

  return encodeAbiParameters(POSITION_PARAMS, [operationType, collateralAmount, borrowAmount, beneficiary, isLong]);
};