import { Candle, Timeframe } from '../../types/forex';

export interface SwingPoint {
  index: number;
  time: number;
  price: number;
  type: 'high' | 'low';
}

export function detectSwingPoints(candles: Candle[], windowSize: number = 3): { swingHighs: SwingPoint[]; swingLows: SwingPoint[] } {
  const swingHighs: SwingPoint[] = [];
  const swingLows: SwingPoint[] = [];

  for (let i = windowSize; i < candles.length - windowSize; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;

    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= windowSize; j++) {
      if (candles[i - j].high >= currentHigh || candles[i + j].high > currentHigh) {
        isHigh = false;
      }
      if (candles[i - j].low <= currentLow || candles[i + j].low < currentLow) {
        isLow = false;
      }
    }

    if (isHigh) {
      swingHighs.push({ index: i, time: candles[i].time, price: currentHigh, type: 'high' });
    }
    if (isLow) {
      swingLows.push({ index: i, time: candles[i].time, price: currentLow, type: 'low' });
    }
  }

  return { swingHighs, swingLows };
}

export function evaluateMarketStructure(
  candles: Candle[],
  timeframe: Timeframe,
  ema50: number,
  ema200: number
): {
  structure: 'bullish' | 'bearish' | 'ranging';
  description: string;
  swingHighValues: number[];
  swingLowValues: number[];
  structureCode: string; // e.g. "HH / HL"
} {
  const { swingHighs, swingLows } = detectSwingPoints(candles, 3);
  const recentHighs = swingHighs.slice(-3);
  const recentLows = swingLows.slice(-3);

  const swingHighValues = swingHighs.slice(-5).map(s => s.price);
  const swingLowValues = swingLows.slice(-5).map(s => s.price);

  if (recentHighs.length < 2 || recentLows.length < 2) {
    const defaultBias = ema50 > ema200 ? 'bullish' : 'bearish';
    return {
      structure: defaultBias,
      description: `${timeframe}: Clean structure developing; aligning with EMA trend (${defaultBias}).`,
      swingHighValues,
      swingLowValues,
      structureCode: defaultBias === 'bullish' ? 'HH / HL' : 'LH / LL'
    };
  }

  const h1 = recentHighs[recentHighs.length - 2].price;
  const h2 = recentHighs[recentHighs.length - 1].price;
  const l1 = recentLows[recentLows.length - 2].price;
  const l2 = recentLows[recentLows.length - 1].price;

  const higherHigh = h2 > h1;
  const higherLow = l2 > l1;
  const lowerHigh = h2 < h1;
  const lowerLow = l2 < l1;

  if (higherHigh && higherLow) {
    return {
      structure: 'bullish',
      description: `${timeframe}: Classic Bullish Structure (Higher Highs & Higher Lows). Responsive demand defending swing lows.`,
      swingHighValues,
      swingLowValues,
      structureCode: 'HH / HL'
    };
  } else if (lowerHigh && lowerLow) {
    return {
      structure: 'bearish',
      description: `${timeframe}: Classic Bearish Structure (Lower Highs & Lower Lows). Sellers consistently capping pullbacks.`,
      swingHighValues,
      swingLowValues,
      structureCode: 'LH / LL'
    };
  } else if (higherHigh && lowerLow) {
    return {
      structure: 'ranging',
      description: `${timeframe}: Expanding volatility range; price breaking both extremes without clean directional follow-through.`,
      swingHighValues,
      swingLowValues,
      structureCode: 'Expanding Range'
    };
  } else {
    return {
      structure: 'ranging',
      description: `${timeframe}: Symmetrical compression/consolidation. Awaiting breakout of recent swing boundaries.`,
      swingHighValues,
      swingLowValues,
      structureCode: 'Consolidation'
    };
  }
}
