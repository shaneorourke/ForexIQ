import { Candle, SRZone } from '../../types/forex';

export interface DetectedPattern {
  name: string;
  bias: 'bullish' | 'bearish' | 'neutral';
  significance: 'High' | 'Medium' | 'Low';
  description: string;
}

export function detectCandlePatterns(candles: Candle[], zones: SRZone[] = []): DetectedPattern[] {
  if (candles.length < 3) return [];

  const patterns: DetectedPattern[] = [];
  const current = candles[candles.length - 1];
  const prev1 = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];

  const totalRange = current.high - current.low;
  const bodyRange = Math.abs(current.close - current.open);
  const upperWick = current.high - Math.max(current.open, current.close);
  const lowerWick = Math.min(current.open, current.close) - current.low;

  if (totalRange <= 0.00005) return patterns;

  // 1. Rejection Wicks (Pin Bar)
  const isBullishPin = lowerWick >= totalRange * 0.60 && upperWick <= totalRange * 0.20;
  const isBearishPin = upperWick >= totalRange * 0.60 && lowerWick <= totalRange * 0.20;

  if (isBullishPin) {
    patterns.push({
      name: 'Bullish Rejection Wick (Pin Bar)',
      bias: 'bullish',
      significance: 'High',
      description: 'Long lower shadow (>60% of candle range) indicates aggressive intraday buying rejecting lower prices.'
    });
  } else if (isBearishPin) {
    patterns.push({
      name: 'Bearish Rejection Wick (Shooting Star)',
      bias: 'bearish',
      significance: 'High',
      description: 'Long upper shadow (>60% of candle range) reflects sharp supply defense rejecting higher prices.'
    });
  }

  // 2. Engulfing Candles
  const prevBody = Math.abs(prev1.close - prev1.open);
  const isBullishEngulfing = current.close > current.open &&
                             prev1.close < prev1.open &&
                             current.open <= prev1.close &&
                             current.close >= prev1.open &&
                             bodyRange > prevBody;

  const isBearishEngulfing = current.close < current.open &&
                             prev1.close > prev1.open &&
                             current.open >= prev1.close &&
                             current.close <= prev1.open &&
                             bodyRange > prevBody;

  if (isBullishEngulfing) {
    patterns.push({
      name: 'Bullish Engulfing',
      bias: 'bullish',
      significance: 'High',
      description: 'Bullish candle completely engulfs previous bearish bar body, indicating momentum shift to buyers.'
    });
  } else if (isBearishEngulfing) {
    patterns.push({
      name: 'Bearish Engulfing',
      bias: 'bearish',
      significance: 'High',
      description: 'Bearish candle completely engulfs previous bullish bar body, indicating urgent institutional selling.'
    });
  }

  // 3. Inside Bar (Volatility compression)
  const isInsideBar = current.high <= prev1.high && current.low >= prev1.low;
  if (isInsideBar) {
    patterns.push({
      name: 'Inside Bar (Compression)',
      bias: 'neutral',
      significance: 'Medium',
      description: 'Current bar range is entirely contained within prior candle, signaling energy coil prior to breakout.'
    });
  }

  // 4. Doji (Indecision)
  const isDoji = bodyRange <= totalRange * 0.12 && totalRange > 0.0002;
  if (isDoji) {
    patterns.push({
      name: 'Doji (Equilibrium / Indecision)',
      bias: 'neutral',
      significance: 'Medium',
      description: 'Open and close are virtually equal; neither buyers nor sellers demonstrated control.'
    });
  }

  // 5. Strong Momentum Candle (Marubozu-like expansion)
  const isStrongMomentumBull = current.close > current.open && bodyRange >= totalRange * 0.78;
  const isStrongMomentumBear = current.close < current.open && bodyRange >= totalRange * 0.78;
  if (isStrongMomentumBull) {
    patterns.push({
      name: 'Strong Bullish Momentum Candle',
      bias: 'bullish',
      significance: 'Medium',
      description: 'Large directional body with minimal wicks; buyers maintained dominance from open to close.'
    });
  } else if (isStrongMomentumBear) {
    patterns.push({
      name: 'Strong Bearish Momentum Candle',
      bias: 'bearish',
      significance: 'Medium',
      description: 'Large directional body with minimal wicks; sellers pressed price without meaningful opposition.'
    });
  }

  // 6. Breakout / Fakeout against S/R Zones
  zones.forEach(zone => {
    if (zone.type === 'resistance') {
      // Fakeout: pierced above zone max, then closed back below zone min
      if (current.high > zone.maxPrice && current.close < zone.maxPrice && prev1.high > zone.maxPrice) {
        patterns.push({
          name: 'Failed Breakout / Fakeout (Resistance Reversal)',
          bias: 'bearish',
          significance: 'High',
          description: `Price probed above resistance ${zone.minPrice.toFixed(4)}–${zone.maxPrice.toFixed(4)} but failed to hold, trapping breakout buyers.`
        });
      }
    } else if (zone.type === 'support') {
      // Fakeout: pierced below zone min, then closed back inside or above
      if (current.low < zone.minPrice && current.close > zone.minPrice && prev1.low < zone.minPrice) {
        patterns.push({
          name: 'Failed Breakdown / Spring (Support Reversal)',
          bias: 'bullish',
          significance: 'High',
          description: `Price swept below support ${zone.minPrice.toFixed(4)}–${zone.maxPrice.toFixed(4)} to absorb stop liquidity and reclaimed the level.`
        });
      }
    }
  });

  return patterns;
}
