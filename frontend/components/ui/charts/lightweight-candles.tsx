"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  CandlestickData,
  ColorType,
  createSeriesMarkers,
  createChart,
  IChartApi,
  UTCTimestamp,
} from "lightweight-charts";

type Candle = CandlestickData<UTCTimestamp>;
type Marker = {
  time: UTCTimestamp;
  position: "aboveBar" | "belowBar" | "inBar";
  color: string;
  shape: "arrowUp" | "arrowDown" | "circle" | "square";
  text?: string;
};

type PriceLine = {
  price: number;
  color: string;
  lineWidth?: 1 | 2 | 3 | 4;
  lineStyle?: 0 | 1 | 2 | 3 | 4;
  axisLabelVisible?: boolean;
  title?: string;
};

type LightweightCandlesProps = {
  data: Candle[];
  markers?: Marker[];
  priceLines?: PriceLine[];
  height?: number;
  className?: string;
};

export function LightweightCandles({
  data,
  markers = [],
  priceLines = [],
  height = 320,
  className,
}: LightweightCandlesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const priceLineRefs = useRef<Array<ReturnType<ReturnType<IChartApi["addSeries"]>["createPriceLine"]>>>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0b1220" },
        textColor: "#8494a7",
      },
      grid: {
        vertLines: { color: "rgba(132, 148, 167, 0.08)" },
        horzLines: { color: "rgba(132, 148, 167, 0.08)" },
      },
      rightPriceScale: {
        borderColor: "rgba(132, 148, 167, 0.25)",
      },
      timeScale: {
        borderColor: "rgba(132, 148, 167, 0.25)",
      },
      crosshair: {
        vertLine: { color: "rgba(0, 229, 255, 0.35)" },
        horzLine: { color: "rgba(0, 229, 255, 0.35)" },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#00E5FF",
      downColor: "#7C4DFF",
      borderVisible: false,
      wickUpColor: "#00E5FF",
      wickDownColor: "#7C4DFF",
    });

    series.setData(data);
    createSeriesMarkers(series, markers);
    priceLineRefs.current = priceLines.map((line) =>
      series.createPriceLine({
        price: line.price,
        color: line.color,
        lineWidth: line.lineWidth ?? 2,
        lineStyle: line.lineStyle ?? 2,
        axisLabelVisible: line.axisLabelVisible ?? true,
        title: line.title,
      }),
    );
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      for (const priceLine of priceLineRefs.current) {
        series.removePriceLine(priceLine);
      }
      priceLineRefs.current = [];
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(data);
    createSeriesMarkers(seriesRef.current, markers);
    for (const priceLine of priceLineRefs.current) {
      seriesRef.current.removePriceLine(priceLine);
    }
    priceLineRefs.current = priceLines.map((line) =>
      seriesRef.current!.createPriceLine({
        price: line.price,
        color: line.color,
        lineWidth: line.lineWidth ?? 2,
        lineStyle: line.lineStyle ?? 2,
        axisLabelVisible: line.axisLabelVisible ?? true,
        title: line.title,
      }),
    );
    chartRef.current?.timeScale().fitContent();
  }, [data, markers, priceLines]);

  return <div ref={containerRef} className={className} />;
}
