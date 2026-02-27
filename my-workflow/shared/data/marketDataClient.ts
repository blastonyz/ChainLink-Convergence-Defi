import { json, ok, safeJsonStringify, text, type HTTPSendRequester } from "@chainlink/cre-sdk";
import { utf8ToBase64 } from "../parsers/valueParsers";
import type { OhlcPoint, OhlcSummary } from "../../types";

const toNumber = (value: unknown): number => {
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

export const summarizeOhlc = (ohlc: OhlcPoint[]): OhlcSummary => {
  const firstOpen = toNumber(ohlc[0]?.[1]);
  const lastClose = toNumber(ohlc[ohlc.length - 1]?.[4]);
  const highs = ohlc.map((point) => toNumber(point[2]));
  const lows = ohlc.map((point) => toNumber(point[3]));
  const periodHigh = highs.length ? Math.max(...highs) : 0;
  const periodLow = lows.length ? Math.min(...lows) : 0;
  const pctChange = firstOpen > 0 ? ((lastClose - firstOpen) / firstOpen) * 100 : 0;

  return {
    candles: ohlc.length,
    firstOpen,
    lastClose,
    pctChange,
    periodHigh,
    periodLow,
  };
};

export const fetchOhlc = (
  sendRequester: HTTPSendRequester,
  request: { url: string; apiKey: string; apiKeyHeader: string },
): string => {
  const headers: Record<string, string> = {};
  headers[request.apiKeyHeader] = request.apiKey;

  const response = sendRequester
    .sendRequest({
      url: request.url,
      method: "GET",
      headers,
    })
    .result();

  if (!ok(response)) {
    throw new Error(`CoinGecko request failed: ${response.statusCode} | ${text(response)}`);
  }

  return safeJsonStringify(json(response));
};

export const askGemini = (
  sendRequester: HTTPSendRequester,
  request: { url: string; prompt: string; temperature: number; maxOutputTokens: number },
): string => {
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: request.prompt }],
      },
    ],
    generationConfig: {
      temperature: request.temperature,
      responseMimeType: "application/json",
      maxOutputTokens: request.maxOutputTokens,
    },
  };

  const response = sendRequester
    .sendRequest({
      url: request.url,
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: utf8ToBase64(safeJsonStringify(body)),
    })
    .result();

  if (!ok(response)) {
    throw new Error(`Gemini request failed: ${response.statusCode} | ${text(response)}`);
  }

  const payload = json(response) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const textOutput = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error("Gemini returned an empty response");
  }

  return textOutput;
};
