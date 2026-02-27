const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const utf8ToBase64 = (input: string): string => {
  const bytes = new TextEncoder().encode(input);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index] ?? 0;
    const byte2 = bytes[index + 1] ?? 0;
    const byte3 = bytes[index + 2] ?? 0;

    const chunk = (byte1 << 16) | (byte2 << 8) | byte3;
    out += chars[(chunk >> 18) & 63];
    out += chars[(chunk >> 12) & 63];
    out += index + 1 < bytes.length ? chars[(chunk >> 6) & 63] : "=";
    out += index + 2 < bytes.length ? chars[chunk & 63] : "=";
  }

  return out;
};

export const asNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

export const asAddress = (value: string | undefined): `0x${string}` => {
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return ZERO_ADDRESS;
  }

  return value as `0x${string}`;
};

export const asBigIntWithDefault = (value: string | undefined, fallback: bigint): bigint => {
  if (!value) {
    return fallback;
  }

  try {
    return BigInt(value);
  } catch {
    return fallback;
  }
};

export const parseSlippageBps = (value: number | undefined): bigint => {
  const bps = typeof value === "number" && Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 100;
  return BigInt(Math.min(500, bps));
};

export const parseMinConfidence = (value: unknown, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Invalid minConfidence. Expected a finite number between 0 and 100");
  }

  if (value < 0 || value > 100) {
    throw new Error("Invalid minConfidence. Expected a value between 0 and 100");
  }

  return value;
};