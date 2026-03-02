# UI Charts

Componentes de gráficos para la UI.

## `LightweightCandles`

Ubicación: `components/ui/charts/lightweight-candles.tsx`

Props:
- `data`: velas en formato `CandlestickData<UTCTimestamp>[]`
- `height?`: alto del chart (default `320`)
- `className?`: clases de contenedor

Ejemplo rápido:

```tsx
import { LightweightCandles } from "@/components/ui/charts";
import { UTCTimestamp } from "lightweight-charts";

const candles = [
  { time: 1719878400 as UTCTimestamp, open: 100, high: 110, low: 95, close: 108 },
  { time: 1719964800 as UTCTimestamp, open: 108, high: 115, low: 104, close: 112 },
];

<LightweightCandles data={candles} className="w-full" height={360} />
```

Nota: es un componente `client` porque usa DOM/ResizeObserver.
