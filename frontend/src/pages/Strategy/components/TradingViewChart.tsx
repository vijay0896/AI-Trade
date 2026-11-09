import React, { useState, useMemo, useRef } from "react";
import type { ChartCandle } from "../../../api/strategyApi";

interface TradingViewChartProps {
  candles: ChartCandle[];
  symbol: string;
  date: string;
  currentEMA9: number | null;
  currentEMA21: number | null;
  currentPrice: number | null;
  currentSignal: "BUY" | "SELL" | "HOLD";
}

export default function TradingViewChart({
  candles,
  symbol,
  date,
  currentEMA9,
  currentEMA21,
  currentPrice,
  currentSignal,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Dimensions
  const height = 480;
  const padding = { top: 30, right: 70, bottom: 40, left: 20 };

  // Calculate scales
  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { minPrice: 0, maxPrice: 100, priceRange: 100 };
    }

    let min = Infinity;
    let max = -Infinity;

    candles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.ema9 !== null) {
        if (c.ema9 < min) min = c.ema9;
        if (c.ema9 > max) max = c.ema9;
      }
      if (c.ema21 !== null) {
        if (c.ema21 < min) min = c.ema21;
        if (c.ema21 > max) max = c.ema21;
      }
    });

    // Add 2% padding
    const margin = (max - min) * 0.05 || 1;
    return {
      minPrice: min - margin,
      maxPrice: max + margin,
      priceRange: max + margin - (min - margin),
    };
  }, [candles]);

  const getY = (val: number) => {
    const plotHeight = height - padding.top - padding.bottom;
    const ratio = (val - minPrice) / priceRange;
    return height - padding.bottom - ratio * plotHeight;
  };

  const hoveredCandle = hoveredIndex !== null && candles[hoveredIndex] ? candles[hoveredIndex] : null;

  // Active values for header
  const displayCandle = hoveredCandle || candles[candles.length - 1];
  const displayPrice = hoveredCandle ? hoveredCandle.close : currentPrice;
  const displayEMA9 = hoveredCandle ? hoveredCandle.ema9 : currentEMA9;
  const displayEMA21 = hoveredCandle ? hoveredCandle.ema21 : currentEMA21;
  const displaySignal = hoveredCandle ? hoveredCandle.signal || "HOLD" : currentSignal;

  // Price Grid levels
  const priceLevels = useMemo(() => {
    const levels = [];
    const step = priceRange / 6;
    for (let i = 0; i <= 6; i++) {
      const p = minPrice + i * step;
      levels.push({ price: p, y: getY(p) });
    }
    return levels;
  }, [minPrice, priceRange, height]);

  // Generate SVG polyline points for EMA 9 and EMA 21
  const { ema9Points, ema21Points } = useMemo(() => {
    if (!candles || candles.length === 0) return { ema9Points: "", ema21Points: "" };

    const totalBars = candles.length;
    const plotWidth = 1000 - padding.left - padding.right;
    const barSpacing = plotWidth / Math.max(1, totalBars);

    const pts9: string[] = [];
    const pts21: string[] = [];

    candles.forEach((c, idx) => {
      const x = padding.left + (idx + 0.5) * barSpacing;
      if (c.ema9 !== null) {
        pts9.push(`${x.toFixed(1)},${getY(c.ema9).toFixed(1)}`);
      }
      if (c.ema21 !== null) {
        pts21.push(`${x.toFixed(1)},${getY(c.ema21).toFixed(1)}`);
      }
    });

    return {
      ema9Points: pts9.join(" "),
      ema21Points: pts21.join(" "),
    };
  }, [candles, minPrice, priceRange]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col text-slate-100 font-sans">
      {/* Top TradingView Bar & Legend */}
      <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">{symbol}</span>
            <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">
              5m
            </span>
            <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
              NSE Cash
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Price */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-slate-400">Close:</span>
            <span className="text-sm font-mono font-bold text-slate-100">
              ₹{displayPrice ? displayPrice.toFixed(2) : "--"}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* EMA 9 */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-0.5 rounded border border-emerald-950">
            <span className="inline-block w-2.5 h-0.5 rounded-full bg-[#00C853]" />
            <span className="text-xs font-medium text-emerald-400">EMA 9:</span>
            <span className="text-xs font-mono font-semibold text-[#00C853]">
              {displayEMA9 ? displayEMA9.toFixed(2) : "--"}
            </span>
          </div>

          {/* EMA 21 */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-0.5 rounded border border-rose-950">
            <span className="inline-block w-2.5 h-0.5 rounded-full bg-[#FF0000]" />
            <span className="text-xs font-medium text-rose-400">EMA 21:</span>
            <span className="text-xs font-mono font-semibold text-[#FF0000]">
              {displayEMA21 ? displayEMA21.toFixed(2) : "--"}
            </span>
          </div>
        </div>

        {/* Signal & Square-Off Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            <span>Intraday Exit:</span>
            <span className="font-mono font-semibold text-amber-400">15:15 IST</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
              displaySignal === "BUY"
                ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/50 shadow-sm shadow-emerald-500/20"
                : displaySignal === "SELL"
                ? "bg-rose-950/80 text-rose-400 border-rose-500/50 shadow-sm shadow-rose-500/20"
                : "bg-slate-800 text-slate-300 border-slate-700"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                displaySignal === "BUY"
                  ? "bg-emerald-400 animate-pulse"
                  : displaySignal === "SELL"
                  ? "bg-rose-500 animate-pulse"
                  : "bg-slate-500"
              }`}
            />
            <span>
              {displaySignal === "BUY"
                ? "BUY SIGNAL (Bullish Crossover)"
                : displaySignal === "SELL"
                ? "SELL SIGNAL (Bearish Crossunder)"
                : "SIGNAL: HOLD"}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden bg-[#0a0d14] cursor-crosshair select-none"
        style={{ height: `${height}px` }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <svg
          viewBox={`0 0 1000 ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full block"
          onMouseMove={(e) => {
            if (!containerRef.current || !candles.length) return;
            const rect = containerRef.current.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * 1000;
            const plotWidth = 1000 - padding.left - padding.right;
            const barSpacing = plotWidth / candles.length;
            const idx = Math.floor((relX - padding.left) / barSpacing);
            if (idx >= 0 && idx < candles.length) {
              setHoveredIndex(idx);
            } else {
              setHoveredIndex(null);
            }
          }}
        >
          <defs>
            {/* Grid Pattern */}
            <linearGradient id="ema9Glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00C853" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00C853" stopOpacity="0.0" />
            </linearGradient>
            <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Horizontal Price Grid Lines */}
          {priceLevels.map((lvl, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={lvl.y}
                x2={1000 - padding.right}
                y2={lvl.y}
                stroke="#1e293b"
                strokeDasharray="3 3"
                strokeWidth="0.8"
              />
              <text
                x={1000 - padding.right + 8}
                y={lvl.y + 3.5}
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                ₹{lvl.price.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Vertical Time Grid Lines */}
          {candles.map((c, idx) => {
            if (idx % 12 === 0) {
              const plotWidth = 1000 - padding.left - padding.right;
              const barSpacing = plotWidth / candles.length;
              const x = padding.left + (idx + 0.5) * barSpacing;
              return (
                <g key={`grid-x-${idx}`}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={height - padding.bottom}
                    stroke="#1e293b"
                    strokeDasharray="2 3"
                    strokeWidth="0.7"
                  />
                  <text
                    x={x}
                    y={height - padding.bottom + 18}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {c.time}
                  </text>
                </g>
              );
            }
            return null;
          })}

          {/* EMA 21 Line (Red) */}
          {ema21Points && (
            <polyline
              points={ema21Points}
              fill="none"
              stroke="#FF0000"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* EMA 9 Line (Green) */}
          {ema9Points && (
            <polyline
              points={ema9Points}
              fill="none"
              stroke="#00C853"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Candlesticks & Signal Badges */}
          {candles.map((c, idx) => {
            const plotWidth = 1000 - padding.left - padding.right;
            const barSpacing = plotWidth / candles.length;
            const x = padding.left + (idx + 0.5) * barSpacing;
            const candleWidth = Math.max(3, barSpacing * 0.72);

            const isBullish = c.close >= c.open;
            const candleColor = isBullish ? "#00C853" : "#EF4444";

            const yHigh = getY(c.high);
            const yLow = getY(c.low);
            const yOpen = getY(c.open);
            const yClose = getY(c.close);

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));

            return (
              <g key={`bar-${idx}`} className="transition-opacity">
                {/* Wick */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={candleColor}
                  strokeWidth="1.2"
                />

                {/* Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isBullish ? "#00C853" : "#EF4444"}
                  stroke={candleColor}
                  strokeWidth="0.8"
                  rx="0.5"
                />

                {/* BUY Signal Marker (Green Upward Triangle + Badge below low) */}
                {c.signal === "BUY" && (
                  <g filter="url(#shadowFilter)">
                    {/* Up Arrow Polygon */}
                    <polygon
                      points={`${x},${yLow + 6} ${x - 5},${yLow + 16} ${x + 5},${yLow + 16}`}
                      fill="#00C853"
                      stroke="#052e16"
                      strokeWidth="0.8"
                    />
                    {/* "BUY" text badge */}
                    <rect
                      x={x - 14}
                      y={yLow + 18}
                      width={28}
                      height={14}
                      rx="3"
                      fill="#00C853"
                    />
                    <text
                      x={x}
                      y={yLow + 29}
                      textAnchor="middle"
                      fill="#042f2e"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      BUY
                    </text>
                  </g>
                )}

                {/* SELL Signal Marker (Red Downward Triangle + Badge above high) */}
                {c.signal === "SELL" && (
                  <g filter="url(#shadowFilter)">
                    {/* Down Arrow Polygon */}
                    <polygon
                      points={`${x},${yHigh - 6} ${x - 5},${yHigh - 16} ${x + 5},${yHigh - 16}`}
                      fill="#FF0000"
                      stroke="#450a0a"
                      strokeWidth="0.8"
                    />
                    {/* "SELL" text badge */}
                    <rect
                      x={x - 15}
                      y={yHigh - 31}
                      width={30}
                      height={14}
                      rx="3"
                      fill="#FF0000"
                    />
                    <text
                      x={x}
                      y={yHigh - 20}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      SELL
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Hover Crosshair */}
          {hoveredIndex !== null && candles[hoveredIndex] && (
            <g>
              {(() => {
                const plotWidth = 1000 - padding.left - padding.right;
                const barSpacing = plotWidth / candles.length;
                const x = padding.left + (hoveredIndex + 0.5) * barSpacing;
                const y = getY(candles[hoveredIndex].close);

                return (
                  <>
                    {/* Vertical line */}
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={height - padding.bottom}
                      stroke="#94a3b8"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    {/* Horizontal line */}
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={1000 - padding.right}
                      y2={y}
                      stroke="#94a3b8"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    {/* Price Marker on Y Axis */}
                    <rect
                      x={1000 - padding.right + 2}
                      y={y - 8}
                      width={62}
                      height={16}
                      rx="2"
                      fill="#3b82f6"
                    />
                    <text
                      x={1000 - padding.right + 33}
                      y={y + 3.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      ₹{candles[hoveredIndex].close.toFixed(2)}
                    </text>
                  </>
                );
              })()}
            </g>
          )}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredCandle && (
          <div className="absolute top-4 left-5 bg-slate-950/95 border border-slate-700/80 rounded-lg p-3 text-xs shadow-2xl backdrop-blur-md pointer-events-none z-20 flex gap-4">
            <div>
              <div className="text-[11px] text-slate-400 font-mono">
                {date} {hoveredCandle.time}
              </div>
              <div className="flex gap-3 mt-1 font-mono">
                <div>
                  <span className="text-slate-500">O:</span> ₹{hoveredCandle.open.toFixed(2)}
                </div>
                <div>
                  <span className="text-slate-500">H:</span> ₹{hoveredCandle.high.toFixed(2)}
                </div>
                <div>
                  <span className="text-slate-500">L:</span> ₹{hoveredCandle.low.toFixed(2)}
                </div>
                <div>
                  <span className="text-slate-500">C:</span> ₹{hoveredCandle.close.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="font-mono">
              <div className="flex gap-3">
                <span className="text-[#00C853]">EMA9: ₹{hoveredCandle.ema9?.toFixed(2) || "--"}</span>
                <span className="text-[#FF0000]">EMA21: ₹{hoveredCandle.ema21?.toFixed(2) || "--"}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Vol: {hoveredCandle.volume.toLocaleString("en-IN")}
                {hoveredCandle.signal && (
                  <span
                    className={`ml-2 px-1.5 py-0.2 rounded font-bold ${
                      hoveredCandle.signal === "BUY" ? "bg-emerald-900 text-emerald-300" : "bg-rose-900 text-rose-300"
                    }`}
                  >
                    {hoveredCandle.signal}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sub-Bar */}
      <div className="px-5 py-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#00C853] inline-block" />
            <span>Fast EMA (9-period close)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#FF0000] inline-block" />
            <span>Slow EMA (21-period close)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-emerald-500 rounded-sm" />
            <span>BUY: Green Arrow Below Bar</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-rose-500 rounded-sm" />
            <span>SELL: Red Arrow Above Bar</span>
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          Showing {candles.length} bars for session {date} (09:15 to 15:25 IST)
        </div>
      </div>
    </div>
  );
}

