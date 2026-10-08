import { Candle } from '../../types/forex';

/**
 * Exponential Moving Average (EMA) calculation
 */
export function calculateEMA(period: number, values: number[]): number[] {
  if (values.length === 0) return [];
  if (values.length < period) {
    const sum = values.reduce((acc, v) => acc + v, 0);
    return new Array(values.length).fill(sum / values.length);
  }

  const k = 2 / (period + 1);
  const emaArray: number[] = new Array(values.length);

  // Initial SMA as starting point
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let currentEma = sum / period;
  emaArray[period - 1] = currentEma;

  // Fill preceding with initial SMA for graphing alignment
  for (let i = 0; i < period - 1; i++) {
    emaArray[i] = currentEma;
  }

  for (let i = period; i < values.length; i++) {
    currentEma = values[i] * k + currentEma * (1 - k);
    emaArray[i] = currentEma;
  }

  return emaArray;
}

/**
 * Relative Strength Index (RSI 14) with smoothed Wilder gains and losses
 */
export function calculateRSI(period: number = 14, closes: number[]): { rsiValues: number[]; latestRsi: number } {
  if (closes.length <= period) {
    return { rsiValues: new Array(closes.length).fill(50), latestRsi: 50 };
  }

  const rsiValues: number[] = new Array(closes.length).fill(50);
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(Math.max(0, change));
    losses.push(Math.max(0, -change));
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsiValues[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + firstRS));

  for (let i = period + 1; i < closes.length; i++) {
    const gain = gains[i - 1];
    const loss = losses[i - 1];

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsiValues[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsiValues[i] = 100 - (100 / (1 + rs));
    }
  }

  const latestRsi = Number((rsiValues[rsiValues.length - 1] || 50).toFixed(1));
  return { rsiValues, latestRsi };
}

/**
 * Average True Range (ATR 14)
 */
export function calculateATR(period: number = 14, candles: Candle[]): { atrValues: number[]; latestATR: number } {
  if (candles.length < 2) {
    return { atrValues: new Array(candles.length).fill(0.001), latestATR: 0.001 };
  }

  const trValues: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevC.close),
      Math.abs(c.low - prevC.close)
    );
    trValues.push(tr);
  }

  const atrValues: number[] = new Array(candles.length).fill(0);
  let initialSum = 0;
  const initialPeriod = Math.min(period, trValues.length);
  for (let i = 0; i < initialPeriod; i++) {
    initialSum += trValues[i];
  }
  let currentAtr = initialSum / initialPeriod;
  atrValues[initialPeriod - 1] = currentAtr;

  for (let i = 0; i < initialPeriod - 1; i++) {
    atrValues[i] = currentAtr;
  }

  for (let i = initialPeriod; i < candles.length; i++) {
    currentAtr = (currentAtr * (period - 1) + trValues[i]) / period;
    atrValues[i] = currentAtr;
  }

  const latestATR = atrValues[atrValues.length - 1] || 0.001;
  return { atrValues, latestATR };
}

/**
 * Volume Moving Average and Ratio
 */
export function calculateVolumeStats(period: number = 20, candles: Candle[]): {
  volumeMA: number[];
  currentVolume: number;
  avgVolume: number;
  ratio: number;
  status: 'Elevated' | 'Normal' | 'Low';
} {
  const volumes = candles.map(c => c.tickVolume);
  const currentVolume = volumes[volumes.length - 1] || 0;

  if (volumes.length === 0) {
    return { volumeMA: [], currentVolume: 0, avgVolume: 1, ratio: 1, status: 'Normal' };
  }

  const maValues: number[] = [];
  for (let i = 0; i < volumes.length; i++) {
    const start = Math.max(0, i - period + 1);
    const subset = volumes.slice(start, i + 1);
    const avg = subset.reduce((a, b) => a + b, 0) / subset.length;
    maValues.push(avg);
  }

  const avgVolume = Math.round(maValues[maValues.length - 1] || 1);
  const ratio = Number((currentVolume / Math.max(1, avgVolume)).toFixed(2));

  let status: 'Elevated' | 'Normal' | 'Low' = 'Normal';
  if (ratio >= 1.35) status = 'Elevated';
  else if (ratio <= 0.65) status = 'Low';

  return {
    volumeMA: maValues,
    currentVolume,
    avgVolume,
    ratio,
    status
  };
}

/**
 * Divergence detection between Price swings and RSI
 */
export function detectDivergence(
  candles: Candle[],
  rsiValues: number[]
): { hasDivergence: boolean; type?: 'Bullish Divergence' | 'Bearish Divergence'; explanation?: string } {
  if (candles.length < 30 || rsiValues.length < 30) {
    return { hasDivergence: false };
  }

  const recentCandles = candles.slice(-25);
  const recentRSI = rsiValues.slice(-25);

  // Look for swing lows in price
  let lowIdx1 = -1;
  let lowIdx2 = -1;

  for (let i = 3; i < recentCandles.length - 2; i++) {
    const isLow = recentCandles[i].low < recentCandles[i - 1].low &&
                  recentCandles[i].low < recentCandles[i - 2].low &&
                  recentCandles[i].low < recentCandles[i + 1].low &&
                  recentCandles[i].low < recentCandles[i + 2].low;
    if (isLow) {
      if (lowIdx1 === -1) lowIdx1 = i;
      else lowIdx2 = i;
    }
  }

  if (lowIdx1 !== -1 && lowIdx2 !== -1 && lowIdx2 > lowIdx1) {
    const price1 = recentCandles[lowIdx1].low;
    const price2 = recentCandles[lowIdx2].low;
    const rsi1 = recentRSI[lowIdx1];
    const rsi2 = recentRSI[lowIdx2];

    // Bullish Divergence: Price Lower Low, RSI Higher Low
    if (price2 < price1 && rsi2 > rsi1 + 2.5) {
      return {
        hasDivergence: true,
        type: 'Bullish Divergence',
        explanation: `Price forged a lower swing low (${price2.toFixed(5)} < ${price1.toFixed(5)}) while RSI registered a higher low (${rsi2.toFixed(1)} > ${rsi1.toFixed(1)}), indicating seller exhaustion.`
      };
    }
  }

  // Look for swing highs in price
  let highIdx1 = -1;
  let highIdx2 = -1;

  for (let i = 3; i < recentCandles.length - 2; i++) {
    const isHigh = recentCandles[i].high > recentCandles[i - 1].high &&
                   recentCandles[i].high > recentCandles[i - 2].high &&
                   recentCandles[i].high > recentCandles[i + 1].high &&
                   recentCandles[i].high > recentCandles[i + 2].high;
    if (isHigh) {
      if (highIdx1 === -1) highIdx1 = i;
      else highIdx2 = i;
    }
  }

  if (highIdx1 !== -1 && highIdx2 !== -1 && highIdx2 > highIdx1) {
    const price1 = recentCandles[highIdx1].high;
    const price2 = recentCandles[highIdx2].high;
    const rsi1 = recentRSI[highIdx1];
    const rsi2 = recentRSI[highIdx2];

    // Bearish Divergence: Price Higher High, RSI Lower High
    if (price2 > price1 && rsi2 < rsi1 - 2.5) {
      return {
        hasDivergence: true,
        type: 'Bearish Divergence',
        explanation: `Price printed a higher swing high (${price2.toFixed(5)} > ${price1.toFixed(5)}) but RSI failed to confirm with a lower peak (${rsi2.toFixed(1)} < ${rsi1.toFixed(1)}), signaling weakening upside thrust.`
      };
    }
  }

  return { hasDivergence: false };
}
