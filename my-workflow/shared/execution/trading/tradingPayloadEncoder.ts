import { encodeAbiParameters, parseAbiParameters } from "viem";
import type { GmxAction, GmxIntentPayload } from "../../../types";

const GMX_SHORT_PARAMS = parseAbiParameters(
  "uint8 action,address collateralToken,address market,uint256 collateralAmountUsd,uint256 sizeUsd,uint256 triggerPrice,uint256 acceptablePrice",
);

export const encodeGmxIntentPayload = (action: GmxAction, intent: GmxIntentPayload): string => {
  const actionCode = action === "long" ? 0 : 1;

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