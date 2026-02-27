import { bytesToHex } from "@chainlink/cre-sdk";

export const normalizeTxHash = (rawHash: Uint8Array | undefined): string => {
  if (!rawHash || rawHash.length === 0) {
    return "";
  }

  const hexHash = bytesToHex(rawHash);
  if (/^0x0{64}$/i.test(hexHash)) {
    return "";
  }

  return hexHash;
};