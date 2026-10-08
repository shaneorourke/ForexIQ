import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Candle, ForexPair, HorizontalLevel, SRZone, Timeframe, EconomicEvent } from '../types/forex';
import { calculateEMA, calculateVolumeStats } from '../services/analysis/technicalIndicators';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Crosshair as CrosshairIcon
} from 'lucide-react';

interface TradingChartProps {
  candles: Candle[];
  pair: ForexPair;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  supportZones: SRZone[];
  resistanceZones: SRZone[];
  horizontalLevels: HorizontalLevel[];
  onAddLevel: (price: number) => void;
  onDeleteLevel: (id: string) => void;
  upcomingEvents: EconomicEvent[];
  currentBid: number;
  currentAsk: number;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  pair,
  timeframe,
  onTimeframeChange,
  supportZones,
  resistanceZones,
  horizontalLevels,
  onAddLevel,
  onDeleteLevel,
  upcomingEvents,
  currentBid,
  currentAsk,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Chart view state
  const [visibleCount, setVisibleCount] = useState<number>(70); // number of candles shown
  const [scrollOffset, setScrollOffset] = useState<number>(0); // 0 means latest candle is on right
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartOffset, setDragStartOffset] = useState<number>(0);

  // Crosshair state
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);

  // Overlay toggles
  const [showEMA50, setShowEMA50] = useState<boolean>(true);
  const [showEMA200, setShowEMA200] = useState<boolean>(true);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [drawingMode, setDrawingMode] = useState<boolean>(false);
  const [manualPriceInput, setManualPriceInput] = useState<string>('');

  // Calculate EMAs and Volume MA for entire series
  const closes = useMemo(() => candles.map(c => c.close), [candles]);
  const ema50Values = useMemo(() => calculateEMA(50, closes), [closes]);
  const ema200Values = useMemo(() => calculateEMA(200, closes), [closes]);
  const volumeStats = useMemo(() => calculateVolumeStats(20, candles), [candles]);

  const pipDecimals = pair === 'USD/JPY' ? 3 : 5;

  // Zoom handlers
  const handleZoom = useCallback((direction: 'in' | 'out', factor: number = 1.25) => {
    setVisibleCount(prev => {
      if (direction === 'in') {
        return Math.max(20, Math.floor(prev / factor));
      } else {
        return Math.min(Math.min(220, candles.length || 150), Math.floor(prev * factor));
      }
    });
  }, [candles.length]);

  const handleResetZoom = useCallback(() => {
    setVisibleCount(70);
    setScrollOffset(0);
  }, []);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoom('in', 1.15);
    } else {
      handleZoom('out', 1.15);
    }
  };

  // Mouse drag pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingMode && hoveredPrice) {
      onAddLevel(Number(hoveredPrice.toFixed(pipDecimals)));
      setDrawingMode(false);
      return;
    }
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartOffset(scrollOffset);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCrosshairPos({ x, y });

    // Handle Pan
    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      const candleWidth = (canvas.width - 65) / visibleCount;
      const candlesMoved = Math.round(deltaX / candleWidth);
      const newOffset = Math.max(0, Math.min(candles.length - visibleCount, dragStartOffset + candlesMoved));
      setScrollOffset(newOffset);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setCrosshairPos(null);
    setHoveredCandle(null);
    setHoveredPrice(null);
  };

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const priceAxisWidth = 68;
    const timeAxisHeight = 24;
    const volumeHeight = showVolume ? 75 : 0;
    const chartHeight = height - timeAxisHeight - volumeHeight;
    const chartWidth = width - priceAxisWidth;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Grid styling
    ctx.strokeStyle = '#151d2d';
    ctx.lineWidth = 1;

    // Determine slice of visible candles
    const totalCandles = candles.length;
    const startIndex = Math.max(0, totalCandles - visibleCount - scrollOffset);
    const endIndex = Math.min(totalCandles, startIndex + visibleCount);
    const visibleCandles = candles.slice(startIndex, endIndex);

    if (visibleCandles.length === 0) return;

    // Determine min/max price in view
    let minPrice = Math.min(...visibleCandles.map(c => c.low));
    let maxPrice = Math.max(...visibleCandles.map(c => c.high));

    // Pad price range by 10%
    const priceRange = maxPrice - minPrice || 0.001;
    minPrice -= priceRange * 0.08;
    maxPrice += priceRange * 0.08;
    const paddedRange = maxPrice - minPrice;

    // Price to Y conversion
    const getY = (price: number) => {
      return chartHeight - ((price - minPrice) / paddedRange) * chartHeight;
    };

    // Y to Price conversion
    const getPriceFromY = (y: number) => {
      return minPrice + ((chartHeight - y) / chartHeight) * paddedRange;
    };

    // Update hovered price for crosshair
    if (crosshairPos && crosshairPos.y <= chartHeight) {
      setHoveredPrice(getPriceFromY(crosshairPos.y));
    }

    // Horizontal Price Grid Lines
    const gridSteps = 7;
    for (let i = 0; i <= gridSteps; i++) {
      const p = minPrice + (paddedRange / gridSteps) * i;
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price labels on right axis
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.fillText(p.toFixed(pipDecimals), chartWidth + 6, y + 3.5);
    }

    const candleWidth = chartWidth / visibleCandles.length;
    const barWidth = Math.max(2, candleWidth * 0.72);

    // Vertical Time Grid Lines & labels
    const timeStep = Math.max(4, Math.floor(visibleCandles.length / 7));
    for (let i = 0; i < visibleCandles.length; i += timeStep) {
      const x = i * candleWidth + candleWidth / 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height - timeAxisHeight);
      ctx.stroke();

      const cTime = new Date(visibleCandles[i].time);
      const timeStr = timeframe === 'D1'
        ? `${cTime.getMonth() + 1}/${cTime.getDate()}`
        : `${String(cTime.getHours()).padStart(2, '0')}:${String(cTime.getMinutes()).padStart(2, '0')}`;
      
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, x, height - 7);
    }

    // Draw Support & Resistance Zones
    if (showZones) {
      // Support Zones (Emerald glow)
      supportZones.forEach((zone) => {
        const yTop = getY(zone.maxPrice);
        const yBottom = getY(zone.minPrice);
        const zoneHeight = Math.max(4, yBottom - yTop);

        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.fillRect(0, yTop, chartWidth, zoneHeight);

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, yTop);
        ctx.lineTo(chartWidth, yTop);
        ctx.moveTo(0, yBottom);
        ctx.lineTo(chartWidth, yBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Zone label badge on chart left
        ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText(`SUP (${zone.timeframe}) ${zone.confidence.toUpperCase()}`, 6, yTop + 11);
      });

      // Resistance Zones (Crimson glow)
      resistanceZones.forEach((zone) => {
        const yTop = getY(zone.maxPrice);
        const yBottom = getY(zone.minPrice);
        const zoneHeight = Math.max(4, yBottom - yTop);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
        ctx.fillRect(0, yTop, chartWidth, zoneHeight);

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, yTop);
        ctx.lineTo(chartWidth, yTop);
        ctx.moveTo(0, yBottom);
        ctx.lineTo(chartWidth, yBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Zone label badge on chart left
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText(`RES (${zone.timeframe}) ${zone.confidence.toUpperCase()}`, 6, yTop + 11);
      });
    }

    // Draw User Manually Drawn Horizontal Levels
    horizontalLevels.forEach((lvl) => {
      const y = getY(lvl.price);
      if (y >= 0 && y <= chartHeight) {
        ctx.strokeStyle = lvl.color || '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label on chart
        ctx.fillStyle = lvl.color || '#38bdf8';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'right';
        ctx.fillText(`${lvl.label}: ${lvl.price.toFixed(pipDecimals)}`, chartWidth - 8, y - 4);
      }
    });

    // Draw EMA 50 & 200 curves
    const drawEMACurve = (emaArray: number[], color: string, widthPx: number = 1.5) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = widthPx;
      ctx.beginPath();
      let started = false;

      for (let i = 0; i < visibleCandles.length; i++) {
        const globalIdx = startIndex + i;
        const val = emaArray[globalIdx];
        if (val !== undefined && val > 0) {
          const x = i * candleWidth + candleWidth / 2;
          const y = getY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    };

    if (showEMA50) drawEMACurve(ema50Values, '#f59e0b', 1.8);
    if (showEMA200) drawEMACurve(ema200Values, '#a855f7', 2.0);

    // Draw Candlesticks
    for (let i = 0; i < visibleCandles.length; i++) {
      const c = visibleCandles[i];
      const x = i * candleWidth + candleWidth / 2;
      const isBullish = c.close >= c.open;

      const yOpen = getY(c.open);
      const yClose = getY(c.close);
      const yHigh = getY(c.high);
      const yLow = getY(c.low);

      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));

      const candleColor = isBullish ? '#10b981' : '#ef4444';
      ctx.strokeStyle = candleColor;
      ctx.fillStyle = candleColor;

      // Wick
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Real Body
      ctx.fillRect(x - barWidth / 2, bodyTop, barWidth, bodyHeight);
    }

    // Volume Panel at bottom
    if (showVolume) {
      const volPanelTop = chartHeight;
      // Volume border separator
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, volPanelTop);
      ctx.lineTo(width, volPanelTop);
      ctx.stroke();

      const maxVolInView = Math.max(...visibleCandles.map(c => c.tickVolume), 50);

      // Volume label
      ctx.fillStyle = '#64748b';
      ctx.font = '9px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.fillText('TICK VOLUME (MA 20)', 6, volPanelTop + 14);

      for (let i = 0; i < visibleCandles.length; i++) {
        const c = visibleCandles[i];
        const x = i * candleWidth + candleWidth / 2;
        const isBullish = c.close >= c.open;
        const vHeight = (c.tickVolume / maxVolInView) * (volumeHeight - 20);
        const yTop = height - timeAxisHeight - vHeight;

        ctx.fillStyle = isBullish ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)';
        ctx.fillRect(x - barWidth / 2, yTop, barWidth, vHeight);
      }

      // Volume MA line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let volMaStarted = false;
      for (let i = 0; i < visibleCandles.length; i++) {
        const globalIdx = startIndex + i;
        const maVal = volumeStats.volumeMA[globalIdx];
        if (maVal !== undefined) {
          const x = i * candleWidth + candleWidth / 2;
          const vHeight = (maVal / maxVolInView) * (volumeHeight - 20);
          const y = height - timeAxisHeight - vHeight;
          if (!volMaStarted) {
            ctx.moveTo(x, y);
            volMaStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    }

    // Current Price Line (Bid / Ask)
    const bidY = getY(currentBid);
    if (bidY >= 0 && bidY <= chartHeight) {
      // Horizontal dashed line
      ctx.strokeStyle = '#38bdf8';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, bidY);
      ctx.lineTo(chartWidth, bidY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current Price badge in Price Axis
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(chartWidth + 1, bidY - 8, priceAxisWidth - 2, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.fillText(currentBid.toFixed(pipDecimals), chartWidth + 5, bidY + 3.5);
    }

    // Crosshair rendering
    if (crosshairPos) {
      const { x, y } = crosshairPos;
      if (x <= chartWidth && y <= chartHeight) {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 4]);

        // Horizontal crosshair line
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();

        // Vertical crosshair line
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height - timeAxisHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Crosshair Price Badge
        const hoveredP = getPriceFromY(y);
        ctx.fillStyle = '#334155';
        ctx.fillRect(chartWidth + 1, y - 8, priceAxisWidth - 2, 16);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText(hoveredP.toFixed(pipDecimals), chartWidth + 5, y + 3.5);

        // Identify hovered candle
        const candleIdx = Math.floor(x / candleWidth);
        if (candleIdx >= 0 && candleIdx < visibleCandles.length) {
          const hovered = visibleCandles[candleIdx];
          setHoveredCandle(hovered);

          // Crosshair Time Badge
          const cTime = new Date(hovered.time);
          const timeText = `${cTime.toLocaleDateString([], { month: 'numeric', day: 'numeric' })} ${String(cTime.getHours()).padStart(2, '0')}:${String(cTime.getMinutes()).padStart(2, '0')}`;
          
          ctx.fillStyle = '#334155';
          ctx.fillRect(x - 42, height - timeAxisHeight + 2, 84, 18);
          ctx.fillStyle = '#f8fafc';
          ctx.font = '10px JetBrains Mono';
          ctx.textAlign = 'center';
          ctx.fillText(timeText, x, height - 7);
        }
      }
    }
  }, [
    candles,
    visibleCount,
    scrollOffset,
    showEMA50,
    showEMA200,
    showZones,
    showVolume,
    crosshairPos,
    supportZones,
    resistanceZones,
    horizontalLevels,
    currentBid,
    currentAsk,
    pipDecimals,
    timeframe,
    ema50Values,
    ema200Values,
    volumeStats,
  ]);

  const activeCandle = hoveredCandle || candles[candles.length - 1];

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#090d16] border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
      {/* Top Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#0d131f] border-b border-slate-800/80 gap-2">
        {/* Timeframe Buttons */}
        <div className="flex items-center space-x-1">
          {(['M5', 'M15', 'M30', 'H1', 'H4', 'D1'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                timeframe === tf
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Indicator Overlays & Drawing Toggles */}
        <div className="flex items-center space-x-2 text-xs">
          {/* EMA 50 Toggle */}
          <button
            onClick={() => setShowEMA50(!showEMA50)}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded transition-colors ${
              showEMA50 ? 'bg-amber-950/40 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>EMA 50</span>
          </button>

          {/* EMA 200 Toggle */}
          <button
            onClick={() => setShowEMA200(!showEMA200)}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded transition-colors ${
              showEMA200 ? 'bg-purple-950/40 text-purple-300 border border-purple-500/30' : 'text-slate-500 hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
            <span>EMA 200</span>
          </button>

          {/* Zones Toggle */}
          <button
            onClick={() => setShowZones(!showZones)}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded transition-colors ${
              showZones ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' : 'text-slate-500 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>S/R Zones</span>
          </button>

          {/* Volume Panel Toggle */}
          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-2 py-1 rounded transition-colors ${
              showVolume ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:bg-slate-800'
            }`}
          >
            Vol
          </button>

          {/* Horizontal Level Drawing Tool */}
          <button
            onClick={() => setDrawingMode(!drawingMode)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-all font-medium ${
              drawingMode
                ? 'bg-amber-600 text-white ring-2 ring-amber-400 animate-pulse'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Click to place horizontal price level on chart"
          >
            <CrosshairIcon className="w-3.5 h-3.5" />
            <span>{drawingMode ? 'Click Chart to Drop Level' : '+ Draw Level'}</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center space-x-1 pl-2 border-l border-slate-700">
            <button
              onClick={() => handleZoom('in')}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom('out')}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
              title="Recenter / Auto-Fit"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* OHLC & Volume HUD Bar */}
      {activeCandle && (
        <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#0b0f19] border-b border-slate-800/60 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-3">
            <span className="text-slate-200 font-bold tracking-wide">{pair} • {timeframe}</span>
            <span>O: <strong className="text-slate-200">{activeCandle.open.toFixed(pipDecimals)}</strong></span>
            <span>H: <strong className="text-emerald-400">{activeCandle.high.toFixed(pipDecimals)}</strong></span>
            <span>L: <strong className="text-rose-400">{activeCandle.low.toFixed(pipDecimals)}</strong></span>
            <span>C: <strong className={activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'}>{activeCandle.close.toFixed(pipDecimals)}</strong></span>
            <span>Tick Vol: <strong className="text-slate-200">{activeCandle.tickVolume.toLocaleString()}</strong></span>
          </div>

          {/* Quick Manual Level Adder */}
          <div className="flex items-center space-x-1.5">
            <input
              type="number"
              step={pair === 'USD/JPY' ? '0.01' : '0.0001'}
              placeholder={`Price (e.g. ${currentBid.toFixed(pipDecimals)})`}
              value={manualPriceInput}
              onChange={(e) => setManualPriceInput(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 w-28 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => {
                const p = parseFloat(manualPriceInput);
                if (!isNaN(p)) {
                  onAddLevel(p);
                  setManualPriceInput('');
                }
              }}
              className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas Viewport */}
      <div className="relative flex-1 w-full min-h-[360px] overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="absolute inset-0 w-full h-full block"
        />

        {/* Drawing Mode Hint Overlay */}
        {drawingMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500/90 text-black px-4 py-1 rounded-full text-xs font-bold shadow-lg pointer-events-none animate-bounce">
            Click anywhere on the chart to pin a horizontal price level
          </div>
        )}

        {/* Economic News Marker Pin on chart corner */}
        {upcomingEvents.length > 0 && (
          <div className="absolute bottom-10 left-3 flex items-center space-x-1.5 bg-amber-950/80 border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-lg text-xs backdrop-blur-sm shadow-md">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Event: <strong>{upcomingEvents[0].title}</strong> ({upcomingEvents[0].time})</span>
          </div>
        )}
      </div>

      {/* User Levels Drawer Bar if any levels exist */}
      {horizontalLevels.length > 0 && (
        <div className="px-3 py-1.5 bg-[#0b0f19] border-t border-slate-800 flex items-center space-x-2 overflow-x-auto text-xs">
          <span className="text-slate-500 text-[11px] font-semibold uppercase">Custom Levels:</span>
          {horizontalLevels.map(lvl => (
            <div
              key={lvl.id}
              className="flex items-center space-x-1.5 bg-slate-800/80 border border-slate-700/60 rounded px-2 py-0.5 text-slate-200"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lvl.color }} />
              <span className="font-mono">{lvl.price.toFixed(pipDecimals)}</span>
              <button
                onClick={() => onDeleteLevel(lvl.id)}
                className="text-slate-400 hover:text-rose-400 transition-colors"
                title="Remove level"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
