import React, { useState } from 'react';
import { Candle, SMCSignal } from '@/lib/smc-engine';
import { formatPrice } from '@/lib/utils';
import { Layers, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';

export interface SMCChartPanelProps {
  candles: Candle[];
  signals: SMCSignal[];
  optionChain: any;
  currentPrice: number;
  interval: string;
  onIntervalChange: (interval: string) => void;
}

export function SMCChartPanel({
  candles,
  signals,
  optionChain,
  currentPrice,
  interval,
  onIntervalChange
}: SMCChartPanelProps) {
  const [hoveredCandle, setHoveredCandle] = useState<{ candle: Candle; x: number; y: number } | null>(null);

  // Take only the last 50 candles for the dense display
  const activeCandles = candles.slice(-50);
  const n = activeCandles.length;

  if (n === 0) {
    return (
      <div className="w-full h-[400px] bg-[#0d1117] border border-[#21262d] flex items-center justify-center text-xs text-[#8892a4] font-mono animate-pulse">
        COMPILING CHART PATTERNS...
      </div>
    );
  }

  // Find price bounds
  let prices = activeCandles.flatMap(c => [c.high, c.low]);
  
  // Include walls in price bounds to ensure they are visible
  const callWallPrices = optionChain?.callWalls?.map((w: any) => w.strike) ?? [];
  const putWallPrices = optionChain?.putWalls?.map((w: any) => w.strike) ?? [];
  const maxPainPrice = optionChain?.maxPain ? [optionChain.maxPain] : [];
  
  prices = [...prices, ...callWallPrices, ...putWallPrices, ...maxPainPrice, currentPrice];

  const highestPrice = Math.max(...prices);
  const lowestPrice = Math.min(...prices);

  // Add 10% padding above/below limits
  const priceRange = highestPrice - lowestPrice;
  const paddingPercent = 0.05;
  const maxVal = highestPrice + priceRange * paddingPercent;
  const minVal = lowestPrice - priceRange * paddingPercent;

  // Chart dimensions
  const width = 850;
  const height = 320;
  const paddingRight = 65; // room for price scale
  const paddingTop = 20;
  const paddingBottom = 25;
  const chartWidth = width - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Helper to scale price to Y coordinate
  const getScaleY = (price: number) => {
    return chartHeight - ((price - minVal) / (maxVal - minVal)) * chartHeight + paddingTop;
  };

  // Helper to scale index to X coordinate
  const candleWidth = chartWidth / n;
  const getScaleX = (index: number) => {
    return index * candleWidth + candleWidth / 2;
  };

  // Get specific walls
  const primaryCallWall = optionChain?.callWalls?.[0]?.strike ?? null;
  const primaryPutWall = optionChain?.putWalls?.[0]?.strike ?? null;
  const maxPain = optionChain?.maxPain ?? null;

  // 1. Filter signals to render on chart
  // OB zones and FVG zones are represented by horizontal blocks
  const chartOBs = signals.filter(s => s.type === 'BULLISH_OB' || s.type === 'BEARISH_OB');
  const chartFVGs = signals.filter(s => s.type === 'BULLISH_FVG' || s.type === 'BEARISH_FVG');

  return (
    <div className="w-full bg-[#0d1117] border border-[#21262d] p-3 rounded flex flex-col font-mono select-none">
      {/* Chart Header Controls */}
      <div className="flex items-center justify-between mb-3 border-b border-[#21262d] pb-2">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#f0a500]" />
          <span className="text-xs font-bold text-[#e6e6e6]">NIFTY 50 REAL-TIME SVG CHART</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-[#21262d] text-[#8892a4] rounded uppercase tracking-wider font-semibold">
            SMC OVERLAYS
          </span>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center space-x-1 bg-[#050508] p-0.5 border border-[#21262d] rounded">
          {['3', '5', '15'].map(tf => (
            <button
              key={tf}
              onClick={() => onIntervalChange(tf)}
              className={`text-[10px] px-2 py-0.5 rounded transition-all duration-300 font-bold ${
                interval === tf 
                  ? 'bg-[#f0a500] text-[#050508]' 
                  : 'text-[#8892a4] hover:text-[#e6e6e6]'
              }`}
            >
              {tf}M
            </button>
          ))}
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="relative w-full overflow-x-auto">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto min-w-[700px] select-none"
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((ratio, index) => {
            const y = chartHeight * ratio + paddingTop;
            const price = maxVal - (maxVal - minVal) * ratio;
            return (
              <g key={index}>
                <line
                  x1="0"
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="#161b22"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={chartWidth + 5}
                  y={y + 4}
                  fill="#8892a4"
                  fontSize="9"
                  textAnchor="start"
                >
                  {Math.round(price)}
                </text>
              </g>
            );
          })}

          {/* 2. Render unfilled FVG zones */}
          {chartFVGs.map((fvg, index) => {
            const topY = getScaleY(fvg.zone[1]);
            const bottomY = getScaleY(fvg.zone[0]);
            const rectHeight = Math.abs(bottomY - topY);
            const isBullish = fvg.type === 'BULLISH_FVG';
            return (
              <rect
                key={`fvg-${index}`}
                x="0"
                y={topY}
                width={chartWidth}
                height={rectHeight}
                fill={isBullish ? '#38bdf8' : '#e11d48'}
                fillOpacity="0.06"
                stroke={isBullish ? '#38bdf8' : '#e11d48'}
                strokeOpacity="0.15"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            );
          })}

          {/* 3. Render unmitigated OB zones */}
          {chartOBs.map((ob, index) => {
            const topY = getScaleY(ob.zone[1]);
            const bottomY = getScaleY(ob.zone[0]);
            const rectHeight = Math.abs(bottomY - topY);
            const isBullish = ob.type === 'BULLISH_OB';
            return (
              <rect
                key={`ob-${index}`}
                x="0"
                y={topY}
                width={chartWidth}
                height={rectHeight}
                fill={isBullish ? '#00e5a0' : '#ff3a3a'}
                fillOpacity="0.05"
                stroke={isBullish ? '#00e5a0' : '#ff3a3a'}
                strokeOpacity="0.25"
                strokeWidth="1"
                strokeDasharray="1,2"
              />
            );
          })}

          {/* 4. Support & Resistance walls (Call / Put walls) */}
          {primaryCallWall && (
            <g>
              <line
                x1="0"
                y1={getScaleY(primaryCallWall)}
                x2={chartWidth}
                y2={getScaleY(primaryCallWall)}
                stroke="#ff3a3a"
                strokeWidth="1.2"
                strokeDasharray="5,5"
              />
              <rect
                x={chartWidth - 55}
                y={getScaleY(primaryCallWall) - 6}
                width="50"
                height="12"
                fill="#ff3a3a"
                rx="2"
              />
              <text
                x={chartWidth - 30}
                y={getScaleY(primaryCallWall) + 3}
                fill="#050508"
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
              >
                CALL WALL
              </text>
            </g>
          )}

          {primaryPutWall && (
            <g>
              <line
                x1="0"
                y1={getScaleY(primaryPutWall)}
                x2={chartWidth}
                y2={getScaleY(primaryPutWall)}
                stroke="#00e5a0"
                strokeWidth="1.2"
                strokeDasharray="5,5"
              />
              <rect
                x={chartWidth - 50}
                y={getScaleY(primaryPutWall) - 6}
                width="45"
                height="12"
                fill="#00e5a0"
                rx="2"
              />
              <text
                x={chartWidth - 275 / 10}
                y={getScaleY(primaryPutWall) + 3}
                fill="#050508"
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
              >
                PUT WALL
              </text>
            </g>
          )}

          {/* 5. Max Pain Gravity Line */}
          {maxPain && (
            <g>
              <line
                x1="0"
                y1={getScaleY(maxPain)}
                x2={chartWidth}
                y2={getScaleY(maxPain)}
                stroke="#f0a500"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              <text
                x="10"
                y={getScaleY(maxPain) - 4}
                fill="#f0a500"
                fontSize="8"
                fontWeight="semibold"
              >
                MAX PAIN GRAVITY ({maxPain})
              </text>
            </g>
          )}

          {/* 6. Current underlying price horizontal line */}
          <line
            x1="0"
            y1={getScaleY(currentPrice)}
            x2={chartWidth}
            y2={getScaleY(currentPrice)}
            stroke="#ffffff"
            strokeWidth="1"
            strokeDasharray="1,1"
          />

          {/* 7. Draw Candlesticks */}
          {activeCandles.map((candle, index) => {
            const x = getScaleX(index);
            const highY = getScaleY(candle.high);
            const lowY = getScaleY(candle.low);
            const openY = getScaleY(candle.open);
            const closeY = getScaleY(candle.close);
            
            const isBullish = candle.close >= candle.open;
            const color = isBullish ? '#00e5a0' : '#ff3a3a';
            const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
            const bodyY = Math.min(openY, closeY);

            // Calculate width dynamically
            const bodyWidth = Math.max(4, candleWidth * 0.7);

            return (
              <g 
                key={`candle-${index}`}
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  const svgEl = e.currentTarget.ownerSVGElement;
                  if (svgEl) {
                    const rect = svgEl.getBoundingClientRect();
                    setHoveredCandle({
                      candle,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top
                    });
                  }
                }}
                onMouseLeave={() => setHoveredCandle(null)}
              >
                {/* Wick */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="1.2"
                />
                {/* Candle Body */}
                <rect
                  x={x - bodyWidth / 2}
                  y={bodyY}
                  width={bodyWidth}
                  height={bodyHeight}
                  fill={color}
                  stroke={color}
                  strokeWidth="0.5"
                />
              </g>
            );
          })}
        </svg>

        {/* Dynamic Tooltip overlay */}
        {hoveredCandle && (
          <div 
            className="absolute z-50 p-2 bg-[#050508] border border-[#21262d] text-[10px] text-[#e6e6e6] rounded shadow-xl leading-relaxed pointer-events-none font-mono"
            style={{ 
              left: `${hoveredCandle.x + 15}px`, 
              top: `${Math.min(hoveredCandle.y - 10, height - 90)}px` 
            }}
          >
            <div className="text-[8px] text-[#8892a4] border-b border-[#21262d] pb-0.5 mb-1 uppercase">
              {new Date(hoveredCandle.candle.timestamp).toLocaleTimeString('en-US', { hour12: false })}
            </div>
            <div>O: <span className="font-semibold text-white">{hoveredCandle.candle.open.toFixed(1)}</span></div>
            <div>H: <span className="font-semibold text-[#00e5a0]">{hoveredCandle.candle.high.toFixed(1)}</span></div>
            <div>L: <span className="font-semibold text-[#ff3a3a]">{hoveredCandle.candle.low.toFixed(1)}</span></div>
            <div>C: <span className="font-semibold text-white">{hoveredCandle.candle.close.toFixed(1)}</span></div>
            <div>V: <span className="font-semibold text-[#f0a500]">{hoveredCandle.candle.volume.toLocaleString()}</span></div>
          </div>
        )}
      </div>

      {/* Detected Signal Chips Ticker Below Chart */}
      <div className="mt-3 border-t border-[#21262d] pt-3">
        <div className="text-[10px] text-[#8892a4] uppercase font-bold tracking-wider mb-2 flex items-center space-x-1.5">
          <Zap className="w-3.5 h-3.5 text-[#00e5a0]" />
          <span>SMC ENGINE DETECTOR (REAL-TIME ALERTS)</span>
        </div>
        <div className="flex flex-wrap gap-2 max-h-[85px] overflow-y-auto">
          {signals.slice(0, 8).map((sig, idx) => {
            const isBullish = sig.type.includes('BULLISH') || sig.type === 'BOS' || sig.type === 'SSL_SWEEP';
            const colorClass = isBullish 
              ? 'text-[#00e5a0] bg-[#00e5a0]/5 border-[#00e5a0]/15' 
              : 'text-[#ff3a3a] bg-[#ff3a3a]/5 border-[#ff3a3a]/15';
            
            return (
              <div 
                key={idx}
                className={`text-[9px] px-2 py-1 rounded border flex items-center space-x-1.5 font-bold ${colorClass}`}
              >
                {isBullish ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{sig.type}</span>
                <span className="text-[#8892a4]">|</span>
                <span className="text-[#e6e6e6] font-normal">{sig.description}</span>
              </div>
            );
          })}
          {signals.length === 0 && (
            <div className="text-[9px] text-[#8892a4] border border-[#21262d] p-1.5 rounded w-full text-center">
              NO STRUCTURE BREAKOUTS YET IN SCANNING RADIUS
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
