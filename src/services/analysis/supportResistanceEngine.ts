import { Candle, ForexPair, SRZone, Timeframe } from '../../types/forex';
import { detectSwingPoints } from './marketStructureEngine';

interface RawLevel {
  price: number;
  timeframe: Timeframe;
  type: 'support' | 'resistance';
  reason: string;
  weight: number;
  recency: string;
}

export function detectSupportResistanceZones(
  pair: ForexPair,
  candlesMap: Map<Timeframe, Candle[]>,
  currentPrice: number
): { supportZones: SRZone[]; resistanceZones: SRZone[] } {
  const rawLevels: RawLevel[] = [];
  const pipSize = pair === 'USD/JPY' ? 0.01 : 0.0001;

  // 1. Psychological round numbers around current price
  const roundStep = pair === 'USD/JPY' ? 0.50 : 0.0050; // every 50 pips
  const nearestRoundBase = Math.floor(currentPrice / roundStep) * roundStep;
  for (let offset = -4; offset <= 4; offset++) {
    const roundPrice = Number((nearestRoundBase + offset * roundStep).toFixed(pair === 'USD/JPY' ? 3 : 5));
    rawLevels.push({
      price: roundPrice,
      timeframe: 'H4',
      type: roundPrice > currentPrice ? 'resistance' : 'support',
      reason: `Psychological round number (${roundPrice.toFixed(pair === 'USD/JPY' ? 2 : 4)})`,
      weight: 2,
      recency: 'Static institutional benchmark'
    });
  }

  // 2. Previous Day High (PDH) and Previous Day Low (PDL) from D1 candles
  const d1Candles = candlesMap.get('D1');
  if (d1Candles && d1Candles.length >= 2) {
    const prevDay = d1Candles[d1Candles.length - 2];
    rawLevels.push({
      price: prevDay.high,
      timeframe: 'D1',
      type: 'resistance',
      reason: "Previous Day's High (PDH) liquidity pool",
      weight: 4,
      recency: 'Yesterday'
    });
    rawLevels.push({
      price: prevDay.low,
      timeframe: 'D1',
      type: 'support',
      reason: "Previous Day's Low (PDL) liquidity pool",
      weight: 4,
      recency: 'Yesterday'
    });

    if (d1Candles.length >= 7) {
      const prevWeekCandles = d1Candles.slice(-7, -2);
      const prevWeekHigh = Math.max(...prevWeekCandles.map(c => c.high));
      const prevWeekLow = Math.min(...prevWeekCandles.map(c => c.low));
      rawLevels.push({
        price: prevWeekHigh,
        timeframe: 'D1',
        type: 'resistance',
        reason: "Previous Week's High (PWH) major structural swing",
        weight: 5,
        recency: 'Prior week'
      });
      rawLevels.push({
        price: prevWeekLow,
        timeframe: 'D1',
        type: 'support',
        reason: "Previous Week's Low (PWL) major structural swing",
        weight: 5,
        recency: 'Prior week'
      });
    }
  }

  // 3. Significant Swing Points on H4, H1, M15
  const checkTimeframes: Timeframe[] = ['H4', 'H1', 'M15'];
  checkTimeframes.forEach(tf => {
    const candles = candlesMap.get(tf);
    if (!candles || candles.length < 20) return;

    const { swingHighs, swingLows } = detectSwingPoints(candles, 3);
    const weight = tf === 'H4' ? 4 : tf === 'H1' ? 3 : 2;

    swingHighs.slice(-6).forEach((sh, idx) => {
      const barsAgo = candles.length - 1 - sh.index;
      rawLevels.push({
        price: sh.price,
        timeframe: tf,
        type: 'resistance',
        reason: `${tf} Swing High reaction pivot (${barsAgo} bars ago)`,
        weight,
        recency: `${barsAgo} ${tf.toLowerCase()} bars ago`
      });
    });

    swingLows.slice(-6).forEach((sl, idx) => {
      const barsAgo = candles.length - 1 - sl.index;
      rawLevels.push({
        price: sl.price,
        timeframe: tf,
        type: 'support',
        reason: `${tf} Swing Low reaction pivot (${barsAgo} bars ago)`,
        weight,
        recency: `${barsAgo} ${tf.toLowerCase()} bars ago`
      });
    });
  });

  // Cluster raw levels into price ZONES (within cluster threshold: 6-12 pips depending on pair)
  const clusterDistance = pair === 'USD/JPY' ? 0.12 : 0.0008; // ~8 pips

  const supportRaw = rawLevels.filter(l => l.price <= currentPrice).sort((a, b) => b.price - a.price);
  const resistanceRaw = rawLevels.filter(l => l.price > currentPrice).sort((a, b) => a.price - b.price);

  const clusterIntoZones = (levels: RawLevel[], zoneType: 'support' | 'resistance'): SRZone[] => {
    const zones: SRZone[] = [];
    const used = new Set<number>();

    for (let i = 0; i < levels.length; i++) {
      if (used.has(i)) continue;

      const cluster: RawLevel[] = [levels[i]];
      used.add(i);

      for (let j = i + 1; j < levels.length; j++) {
        if (used.has(j)) continue;
        const diff = Math.abs(levels[j].price - levels[i].price);
        if (diff <= clusterDistance) {
          cluster.push(levels[j]);
          used.add(j);
        }
      }

      // Zone boundaries
      const prices = cluster.map(c => c.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const midPrice = (minPrice + maxPrice) / 2;

      // Expand very narrow zones to at least 4 pips zone width for realistic institutional liquidity pockets
      const minWidth = pair === 'USD/JPY' ? 0.04 : 0.0004;
      const adjustedMin = Number(Math.min(minPrice, midPrice - minWidth / 2).toFixed(pair === 'USD/JPY' ? 3 : 5));
      const adjustedMax = Number(Math.max(maxPrice, midPrice + minWidth / 2).toFixed(pair === 'USD/JPY' ? 3 : 5));

      const totalWeight = cluster.reduce((sum, c) => sum + c.weight, 0);
      const reactionsCount = cluster.length;
      
      let confidence: 'High' | 'Medium' | 'Low' = 'Medium';
      if (totalWeight >= 7 || reactionsCount >= 3) {
        confidence = 'High';
      } else if (totalWeight <= 3 && reactionsCount <= 1) {
        confidence = 'Low';
      }

      const dominantTimeframe = cluster.some(c => c.timeframe === 'D1')
        ? 'D1'
        : cluster.some(c => c.timeframe === 'H4')
        ? 'H4'
        : cluster.some(c => c.timeframe === 'H1')
        ? 'H1'
        : 'M15';

      const reasons = Array.from(new Set(cluster.map(c => c.reason))).slice(0, 2).join(' + ');

      zones.push({
        id: `zone-${zoneType}-${midPrice.toFixed(4)}`,
        minPrice: adjustedMin,
        maxPrice: adjustedMax,
        midPrice: Number(midPrice.toFixed(pair === 'USD/JPY' ? 3 : 5)),
        type: zoneType,
        timeframe: dominantTimeframe,
        reactions: reactionsCount,
        recency: cluster[0].recency,
        confidence,
        reason: reasons
      });
    }

    return zones;
  };

  const supportZones = clusterIntoZones(supportRaw, 'support').slice(0, 5);
  const resistanceZones = clusterIntoZones(resistanceRaw, 'resistance').slice(0, 5);

  return { supportZones, resistanceZones };
}
