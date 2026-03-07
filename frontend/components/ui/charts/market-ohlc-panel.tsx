"use client";

import { useEffect, useMemo, useState } from "react";
import { UTCTimestamp } from "lightweight-charts";
import { useAccount } from "wagmi";
import { LightweightCandles } from "@/components/ui/charts/lightweight-candles";

type OhlcPoint = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type OhlcResponse = {
  source: "coingecko";
  type: "ohlc";
  id: string;
  vsCurrency: string;
  days: string;
  data: OhlcPoint[];
  requestedAt: string;
};

type Operation = {
  _id?: string;
  side: "long" | "short";
  owner?: string;
  timestamp: number;
  price: number;
  stopPrice?: number;
  targetPrice?: number;
  sizeUsd?: number;
  txHash?: string;
  note?: string;
  createdAt?: string;
};

type OperationsResponse = {
  source: "mongodb";
  count: number;
  data: Operation[];
  requestedAt: string;
};

type CreOperationEvent = {
  side: "long" | "short" | "none";
  marketPrice: number;
  confidence: number;
  chain: "mainnet" | "arbitrum";
  coinId: string;
  txHash: string;
  status: "skipped" | "success" | "failed";
  generatedAt: string;
};

function toDatetimeLocalValue(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

export function MarketOhlcPanel() {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<OhlcPoint[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [creRunning, setCreRunning] = useState(false);
  const [creLogs, setCreLogs] = useState<string[]>([]);
  const [creTriggerChoice, setCreTriggerChoice] = useState("2");
  const [crePayloadJson, setCrePayloadJson] = useState("{}");
  const [form, setForm] = useState({
    side: "long" as "long" | "short",
    datetime: "",
    price: "",
    stopPrice: "",
    targetPrice: "",
    sizeUsd: "",
    txHash: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOhlc() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          "/api/prices/coingecko?type=ohlc&id=ethereum&vs_currency=usd&days=30",
          { cache: "force-cache" },
        );

        if (!response.ok) {
          const body = await response.text();
          throw new Error(body || "Could not load OHLC data");
        }

        const json = (await response.json()) as OhlcResponse;

        if (!cancelled) {
          setData(json.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unexpected OHLC error");
          setData([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    async function loadOperations() {
      try {
        const response = await fetch("/api/operations?limit=200", { cache: "no-store" });
        if (!response.ok) return;
        const json = (await response.json()) as OperationsResponse;
        if (!cancelled) {
          setOperations(json.data ?? []);
        }
      } catch {
      }
    }

    loadOhlc();
    loadOperations();

    return () => {
      cancelled = true;
    };
  }, []);

  const candles = useMemo(
    () =>
      data.map((item) => ({
        time: Math.floor(item.timestamp / 1000) as UTCTimestamp,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      })),
    [data],
  );

  const currentClose = candles.length > 0 ? candles[candles.length - 1].close : null;

  const operationsWithPnl = useMemo(
    () =>
      operations.map((operation) => {
        const pnlPct =
          currentClose == null
            ? null
            : operation.side === "long"
              ? ((currentClose - operation.price) / operation.price) * 100
              : ((operation.price - currentClose) / operation.price) * 100;

        const pnlUsd =
          pnlPct == null || !operation.sizeUsd ? null : (operation.sizeUsd * pnlPct) / 100;

        const riskPct =
          operation.stopPrice == null
            ? null
            : operation.side === "long"
              ? ((operation.price - operation.stopPrice) / operation.price) * 100
              : ((operation.stopPrice - operation.price) / operation.price) * 100;

        const rewardPct =
          operation.targetPrice == null
            ? null
            : operation.side === "long"
              ? ((operation.targetPrice - operation.price) / operation.price) * 100
              : ((operation.price - operation.targetPrice) / operation.price) * 100;

        const riskRewardRatio =
          riskPct && rewardPct && riskPct > 0 ? rewardPct / riskPct : null;

        return {
          ...operation,
          pnlPct,
          pnlUsd,
          riskPct,
          rewardPct,
          riskRewardRatio,
        };
      }),
    [operations, currentClose],
  );

  const markers = useMemo(
    () =>
      operationsWithPnl.map((operation) => ({
        time: Math.floor(operation.timestamp / 1000) as UTCTimestamp,
        position: operation.side === "long" ? ("belowBar" as const) : ("aboveBar" as const),
        shape: operation.side === "long" ? ("arrowUp" as const) : ("arrowDown" as const),
        color: operation.side === "long" ? "#00E5FF" : "#7C4DFF",
        text: operation.side === "long" ? "LONG" : "SHORT",
      })),
    [operationsWithPnl],
  );

  const priceLines = useMemo(
    () =>
      operationsWithPnl.flatMap((operation) => {
        const entryLine = {
          price: operation.price,
          color: operation.side === "long" ? "#00E5FF" : "#7C4DFF",
          title: operation.side === "long" ? "Entry LONG" : "Entry SHORT",
        };

        const stopLine =
          operation.stopPrice != null
            ? [{ price: operation.stopPrice, color: "#ef4444", title: "Stop" }]
            : [];

        const targetLine =
          operation.targetPrice != null
            ? [{ price: operation.targetPrice, color: "#22c55e", title: "Target" }]
            : [];

        return [entryLine, ...stopLine, ...targetLine];
      }),
    [operationsWithPnl],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const timestamp = new Date(form.datetime).getTime();
    const price = Number(form.price);
    const stopPrice = form.stopPrice ? Number(form.stopPrice) : undefined;
    const targetPrice = form.targetPrice ? Number(form.targetPrice) : undefined;
    const sizeUsd = form.sizeUsd ? Number(form.sizeUsd) : undefined;

    if (!timestamp || Number.isNaN(timestamp)) {
      setSubmitError("Please select a valid date and time.");
      return;
    }

    if (!price || Number.isNaN(price) || price <= 0) {
      setSubmitError("Please enter a valid entry price.");
      return;
    }

    if (stopPrice !== undefined && (Number.isNaN(stopPrice) || stopPrice <= 0)) {
      setSubmitError("Please enter a valid stop price.");
      return;
    }

    if (targetPrice !== undefined && (Number.isNaN(targetPrice) || targetPrice <= 0)) {
      setSubmitError("Please enter a valid target price.");
      return;
    }

    if (sizeUsd !== undefined && (Number.isNaN(sizeUsd) || sizeUsd <= 0)) {
      setSubmitError("Ingresa un size USD válido.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          side: form.side,
          owner: address || undefined,
          timestamp,
          price,
          stopPrice,
          targetPrice,
          sizeUsd,
          txHash: form.txHash || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Could not save operation");
      }

      const latest = await fetch("/api/operations?limit=200", { cache: "no-store" });
      if (latest.ok) {
        const json = (await latest.json()) as OperationsResponse;
        setOperations(json.data ?? []);
      }

      setForm((prev) => ({
        ...prev,
        price: "",
        stopPrice: "",
        targetPrice: "",
        sizeUsd: "",
        txHash: "",
        note: "",
      }));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error while saving operation");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteOperation(id?: string) {
    if (!id) return;

    const response = await fetch(`/api/operations?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setSubmitError(body?.error ?? "Could not delete operation");
      return;
    }

    setOperations((prev) => prev.filter((operation) => operation._id !== id));
  }

  function runCreBroadcast() {
    if (creRunning) {
      return;
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(crePayloadJson);
    } catch {
      setSubmitError("Invalid CRE payload JSON.");
      return;
    }

    setCreRunning(true);
    setSubmitError(null);
    setCreLogs([]);

    const normalizedTriggerChoice =
      creTriggerChoice.trim() === "1" || creTriggerChoice.trim() === "2"
        ? creTriggerChoice.trim()
        : "2";

    const params = new URLSearchParams({
      broadcast: "1",
      verbose: "0",
      triggerChoice: normalizedTriggerChoice,
      httpPayload: JSON.stringify(parsedPayload),
    });

    const eventSource = new EventSource(`/api/cre/stream?${params.toString()}`);

    const pushLog = (line: string) => {
      setCreLogs((prev) => [...prev.slice(-499), line]);
    };

    eventSource.addEventListener("start", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as { command?: string; cwd?: string };
      pushLog(`Started: ${payload.command ?? "cre workflow simulate"}`);
      if (payload.cwd) {
        pushLog(`CWD: ${payload.cwd}`);
      }
    });

    eventSource.addEventListener("log", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as { line?: string };
      if (payload.line) {
        pushLog(payload.line);
      }
    });

    eventSource.addEventListener("operation", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as CreOperationEvent;
      const side = payload.side === "short" ? "short" : payload.side === "long" ? "long" : null;

      setForm((prev) => ({
        ...prev,
        side: side ?? prev.side,
        datetime: toDatetimeLocalValue(payload.generatedAt),
        price: Number.isFinite(payload.marketPrice) ? payload.marketPrice.toString() : prev.price,
        txHash: payload.txHash || "",
        note: `CRE ${payload.status} · ${payload.chain}/${payload.coinId} · conf ${payload.confidence.toFixed(1)}%`,
      }));

      pushLog(
        `OPERATION_LOG: side=${payload.side} marketPrice=${payload.marketPrice} confidence=${payload.confidence.toFixed(2)}${side ? "" : " (side none, form side unchanged)"}`,
      );
    });

    eventSource.addEventListener("error", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as { message?: string };
      if (payload.message) {
        setSubmitError(payload.message);
        pushLog(`Error: ${payload.message}`);
      }
    });

    eventSource.addEventListener("done", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as {
        success?: boolean;
        exitCode?: number;
      };
      pushLog(`Finished: exitCode=${payload.exitCode ?? -1}`);
      if (!payload.success) {
        setSubmitError(`CRE command failed with exit code ${payload.exitCode ?? -1}.`);
      }
      setCreRunning(false);
      eventSource.close();
    });

    eventSource.onerror = () => {
      setCreRunning(false);
      eventSource.close();
    };
  }

  return (
    <section className="relative bg-darker-bg py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground md:text-3xl">
              ETH/USD OHLC (7d)
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Source: CoinGecko API route
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Stored operations: {operations.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              CRE input config is editable below (trigger + payload JSON)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="text-xs text-muted-foreground">Loading...</span>
            ) : null}
            <button
              type="button"
              onClick={runCreBroadcast}
              disabled={creRunning}
              className="rounded-lg border border-border/60 bg-darker-bg px-3 py-2 text-xs font-semibold text-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {creRunning ? "Running CRE..." : "Run CRE Broadcast"}
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-border/50 bg-dark-bg p-3 md:grid-cols-2 md:gap-4">
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">CRE Trigger</label>
            <select
              value={creTriggerChoice}
              onChange={(event) => setCreTriggerChoice(event.target.value)}
              className="w-full rounded-lg border border-border/60 bg-darker-bg px-3 py-2 text-sm text-foreground"
              disabled={creRunning}
            >
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">HTTP Payload JSON</label>
            <textarea
              value={crePayloadJson}
              onChange={(event) => setCrePayloadJson(event.target.value)}
              className="min-h-20 w-full rounded-lg border border-border/60 bg-darker-bg px-3 py-2 text-xs text-foreground"
              disabled={creRunning}
            />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mb-6 grid gap-3 rounded-2xl border border-border/50 bg-dark-bg p-4 md:grid-cols-2"
        >
          {!mounted ? (
            <div className="md:col-span-6 text-sm text-muted-foreground">Initializing operations panel...</div>
          ) : (
            <>
          <select
            value={form.side}
            onChange={(event) => setForm((prev) => ({ ...prev, side: event.target.value as "long" | "short" }))}
            className="rounded-lg border border-border/60 bg-darker-bg px-3 py-2 text-sm text-foreground"
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>

          <input
            type="datetime-local"
            value={form.datetime}
            onChange={(event) => setForm((prev) => ({ ...prev, datetime: event.target.value }))}
            className="rounded-lg border border-border/60 bg-darker-bg px-3 py-2 text-sm text-foreground"
            required
          />

          <input
            type="number"
            step="0.0001"
            placeholder="Price"
            value={form.price}
            onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            className="rounded-lg border border-border/60 bg-darker-bg px-3 py-2 text-sm text-foreground"
            required
          />

          <input
            type="number"
            step="0.0001"
            placeholder="Stop"
            value={form.stopPrice}
            onChange={(event) => setForm((prev) => ({ ...prev, stopPrice: event.target.value }))}
            className="rounded-lg border border-border/60 bg-darker-bg px-3 py-2 text-sm text-foreground"
          />

          <input
            type="number"
            step="0.0001"
            placeholder="Target"
            value={form.targetPrice}
            onChange={(event) => setForm((prev) => ({ ...prev, targetPrice: event.target.value }))}
            className="rounded-lg border border-border/60 bg-darker-bg px-3 py-2 text-sm text-foreground"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Size USD"
            value={form.sizeUsd}
            onChange={(event) => setForm((prev) => ({ ...prev, sizeUsd: event.target.value }))}
            className="rounded-lg border border-border/60 bg-darker-bg px-3 py-2 text-sm text-foreground"
          />

          <input
            type="text"
            placeholder="Tx hash (optional)"
            value={form.txHash}
            onChange={(event) => setForm((prev) => ({ ...prev, txHash: event.target.value }))}
            className="rounded-lg border border-border/60 bg-darker-bg px-3 py-2 text-sm text-foreground"
          />

          <input
            type="text"
            value={address ?? "Wallet not connected"}
            readOnly
            className="rounded-lg border border-border/60 bg-darker-bg px-3 py-2 text-sm text-muted-foreground"
          />

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-gradient-to-r from-cyan to-purple px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60 md:col-span-2 md:justify-self-center"
          >
            {submitting ? "Saving..." : "Save operation"}
          </button>

          

          {submitError ? (
            <p className="text-xs text-destructive-foreground md:col-span-6">{submitError}</p>
          ) : null}
            </>
          )}
        </form>

        {creLogs.length > 0 ? (
          <div className="mb-6 rounded-2xl border border-border/50 bg-dark-bg p-3">
            <p className="mb-2 text-xs font-semibold text-foreground">CRE Stream</p>
            <div className="max-h-80 overflow-auto rounded-lg border border-border/40 bg-darker-bg p-2">
              {creLogs.map((line, index) => (
                <p key={`${line}-${index}`} className="text-[11px] text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-border/50 bg-dark-bg p-3 md:p-4">
          {error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
              {error}
            </div>
          ) : candles.length === 0 && !loading ? (
            <div className="rounded-xl border border-border/50 bg-card px-4 py-3 text-sm text-muted-foreground">
              No OHLC data available.
            </div>
          ) : (
            <div className="relative">
              <LightweightCandles
                data={candles}
                markers={markers}
                priceLines={priceLines}
                height={360}
                className="w-full"
              />

              <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] flex-row gap-2 overflow-x-auto pr-2">
                {operationsWithPnl.slice(-2).reverse().map((operation, index) => {
                  const pnlPct = operation.pnlPct ?? 0;
                  const pnlUsd = operation.pnlUsd ?? 0;
                  const rewardLabel =
                    operation.rewardPct != null
                      ? `${operation.rewardPct.toFixed(2)}%`
                      : operation.pnlPct != null
                        ? `${operation.pnlPct >= 0 ? "+" : ""}${operation.pnlPct.toFixed(2)}%`
                        : "-";

                  return (
                    <div
                      key={`position-box-${operation.timestamp}-${index}`}
                      className="min-w-[240px] overflow-hidden rounded-md border border-border/60 bg-darker-bg/85 text-[10px] backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between border-b border-border/40 px-2 py-1 text-[10px] text-foreground">
                        <span className={operation.side === "long" ? "text-cyan" : "text-purple"}>
                          {operation.side === "long" ? "Long Position Tool" : "Short Position Tool"}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(operation.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="px-2 py-1 border-b border-border/40 text-foreground/90">
                        Entry {operation.price.toFixed(2)}
                        {operation.stopPrice != null ? ` · Stop ${operation.stopPrice.toFixed(2)}` : ""}
                        {operation.targetPrice != null ? ` · Target ${operation.targetPrice.toFixed(2)}` : ""}
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="bg-rose-500/35 px-2 py-1 text-rose-100">
                          Risk {operation.riskPct != null ? `${operation.riskPct.toFixed(2)}%` : "-"}
                        </div>
                        <div className="bg-emerald-500/35 px-2 py-1 text-emerald-100 text-right">
                          Reward {rewardLabel}
                        </div>
                      </div>

                      <div className="border-t border-border/40 px-2 py-1 text-[10px] text-muted-foreground">
                        {operation.riskRewardRatio != null
                          ? `R:R ${operation.riskRewardRatio.toFixed(2)} · `
                          : ""}
                        Live PnL: {pnlUsd >= 0 ? "+" : ""}${pnlUsd.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <h4 className="mb-3 text-sm font-semibold text-foreground">Latest Operations</h4>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {operationsWithPnl.slice(-6).reverse().map((operation, index) => {
            const isLong = operation.side === "long";
            return (
              <div
                key={`${operation.timestamp}-${operation.side}-${index}`}
                className={`rounded-xl border px-4 py-3 ${
                  isLong
                    ? "border-cyan/40 bg-cyan/10"
                    : "border-purple/40 bg-purple/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isLong ? "text-cyan-200" : "text-fuchsia-200"}`}>
                    {isLong ? "LONG" : "SHORT"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(operation.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground">Entry: ${operation.price.toFixed(2)}</p>
                {operation.stopPrice != null ? (
                  <p className="text-xs text-muted-foreground">Stop: ${operation.stopPrice.toFixed(2)}</p>
                ) : null}
                {operation.targetPrice != null ? (
                  <p className="text-xs text-muted-foreground">Target: ${operation.targetPrice.toFixed(2)}</p>
                ) : null}
                {operation.sizeUsd ? (
                  <p className="text-xs text-muted-foreground">Size: ${operation.sizeUsd.toFixed(2)}</p>
                ) : null}
                {operation.pnlPct != null ? (
                  <p
                    className={`mt-1 text-xs font-semibold ${
                      operation.pnlPct >= 0 ? "text-emerald-200" : "text-rose-200"
                    }`}
                  >
                    PnL: {operation.pnlPct >= 0 ? "+" : ""}{operation.pnlPct.toFixed(2)}%
                    {operation.pnlUsd != null
                      ? ` (${operation.pnlUsd >= 0 ? "+" : ""}$${operation.pnlUsd.toFixed(2)})`
                      : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">PnL: waiting for current price...</p>
                )}
                {operation.txHash ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">Tx: {operation.txHash}</p>
                ) : null}
                {operation.owner ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">Owner: {operation.owner}</p>
                ) : null}
                {operation._id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteOperation(operation._id)}
                    className="mt-2 rounded-md border border-border/60 bg-darker-bg px-2 py-1 text-xs text-foreground transition-colors hover:bg-card"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
}
