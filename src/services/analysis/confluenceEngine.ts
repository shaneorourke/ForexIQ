import {
  ConfluenceCheckItem,
  ConfluenceState,
  EconomicEvent,
  ForexPair,
  IllustrativeTradeStructure,
  ScenarioDefinition,
  SRZone,
  TimeframeAnalysis,
} from '../../types/forex';

export interface ConfluenceReport {
  state: ConfluenceState;
  stateExplanation: string;
  bullishChecks: ConfluenceCheckItem[];
  bearishChecks: ConfluenceCheckItem[];
  bullishConfluenceScore: number; // For internal thresholding only, never displayed as a win %
  bearishConfluenceScore: number;
  bullishScenario: ScenarioDefinition;
  bearishScenario: ScenarioDefinition;
  illustrativeSetup: IllustrativeTradeStructure;
  upcomingNewsWarning: EconomicEvent | null;
}

export function evaluateConfluence(
  pair: ForexPair,
  currentPrice: number,
  timeframes: Record<string, TimeframeAnalysis>,
  supportZones: SRZone[],
  resistanceZones: SRZone[],
  activePatterns: Array<{ name: string; bias: string; significance: string }>,
  events: EconomicEvent[]
): ConfluenceReport {
  const h4 = timeframes['H4'];
  const h1 = timeframes['H1'];
  const m15 = timeframes['M15'];
  const d1 = timeframes['D1'];

  const pipSize = pair === 'USD/JPY' ? 0.01 : 0.0001;

  // Check upcoming high-impact events within 45 minutes
  const now = Date.now();
  const upcomingNewsWarning = events.find(
    e => e.importance === 'HIGH' && e.timestamp > now && e.timestamp - now <= 45 * 60 * 1000
  ) || null;

  // Proximity to support and resistance (e.g. within 15 pips)
  const nearestSupport = supportZones[0];
  const nearestResistance = resistanceZones[0];

  const pipsToSupport = nearestSupport ? (currentPrice - nearestSupport.midPrice) / pipSize : 999;
  const pipsToResistance = nearestResistance ? (nearestResistance.midPrice - currentPrice) / pipSize : 999;

  const isAtSupport = pipsToSupport >= -5 && pipsToSupport <= 18;
  const isAtResistance = pipsToResistance >= -5 && pipsToResistance <= 18;

  // Bullish Checklist Items
  const bullishChecks: ConfluenceCheckItem[] = [
    {
      id: 'h4-ema',
      label: 'H4 Trend: 50 EMA above 200 EMA',
      passed: h4 ? h4.ema50 > h4.ema200 : false,
      direction: 'bullish',
      detail: h4 ? `H4 EMA 50 (${h4.ema50.toFixed(4)}) is ${h4.ema50 > h4.ema200 ? 'above' : 'below'} EMA 200 (${h4.ema200.toFixed(4)}) establishing HTF directional bias.` : 'Analyzing H4...'
    },
    {
      id: 'h1-ema',
      label: 'H1 Trend: 50 EMA above 200 EMA',
      passed: h1 ? h1.ema50 > h1.ema200 : false,
      direction: 'bullish',
      detail: h1 ? `H1 EMA 50 is ${h1.ema50 > h1.ema200 ? 'leading above' : 'lagging below'} EMA 200.` : 'Analyzing H1...'
    },
    {
      id: 'h1-structure',
      label: 'H1 Bullish Market Structure (HH / HL)',
      passed: h1 ? h1.structure === 'bullish' : false,
      direction: 'bullish',
      detail: h1?.structureDescription || 'Assessing swing highs/lows.'
    },
    {
      id: 'near-support',
      label: 'Price in/approaching established Support Zone',
      passed: isAtSupport,
      direction: 'bullish',
      detail: nearestSupport
        ? `Within ${pipsToSupport.toFixed(1)} pips of ${nearestSupport.minPrice.toFixed(4)}–${nearestSupport.maxPrice.toFixed(4)} (${nearestSupport.confidence} confidence).`
        : 'No immediate support identified.'
    },
    {
      id: 'm15-rejection',
      label: 'M15 Bullish Price Action / Rejection Confirmation',
      passed: activePatterns.some(p => p.bias === 'bullish'),
      direction: 'bullish',
      detail: activePatterns.find(p => p.bias === 'bullish')?.name || 'Waiting for lower timeframe rejection wick or engulfing.'
    },
    {
      id: 'tick-volume-elevated',
      label: 'Tick Volume elevated above 20-period MA',
      passed: m15 ? m15.volumeRatio >= 1.15 : false,
      direction: 'bullish',
      detail: m15 ? `Current M15 tick volume is ${(m15.volumeRatio * 100).toFixed(0)}% of recent average.` : 'Evaluating volume...'
    },
    {
      id: 'rsi-healthy',
      label: 'RSI Context: Healthy / Recovering from oversold or Bullish Divergence',
      passed: m15 ? (m15.rsi14 >= 38 && m15.rsi14 <= 65) || m15.hasRsiDivergence : false,
      direction: 'bullish',
      detail: m15 ? `RSI 14 at ${m15.rsi14} ${m15.hasRsiDivergence ? 'with detected Bullish Divergence' : '(constructive momentum band)'}.` : 'Assessing RSI...'
    }
  ];

  // Bearish Checklist Items
  const bearishChecks: ConfluenceCheckItem[] = [
    {
      id: 'h4-ema-bear',
      label: 'H4 Trend: 50 EMA below 200 EMA',
      passed: h4 ? h4.ema50 < h4.ema200 : false,
      direction: 'bearish',
      detail: h4 ? `H4 EMA 50 is ${h4.ema50 < h4.ema200 ? 'below' : 'above'} EMA 200 establishing bearish macro pressure.` : 'Analyzing H4...'
    },
    {
      id: 'h1-ema-bear',
      label: 'H1 Trend: 50 EMA below 200 EMA',
      passed: h1 ? h1.ema50 < h1.ema200 : false,
      direction: 'bearish',
      detail: h1 ? `H1 EMA 50 is ${h1.ema50 < h1.ema200 ? 'below' : 'above'} EMA 200.` : 'Analyzing H1...'
    },
    {
      id: 'h1-structure-bear',
      label: 'H1 Bearish Market Structure (LH / LL)',
      passed: h1 ? h1.structure === 'bearish' : false,
      direction: 'bearish',
      detail: h1?.structureDescription || 'Assessing swing highs/lows.'
    },
    {
      id: 'near-resistance',
      label: 'Price in/approaching established Resistance Zone',
      passed: isAtResistance,
      direction: 'bearish',
      detail: nearestResistance
        ? `Within ${pipsToResistance.toFixed(1)} pips of ${nearestResistance.minPrice.toFixed(4)}–${nearestResistance.maxPrice.toFixed(4)} (${nearestResistance.confidence} confidence).`
        : 'No immediate resistance identified.'
    },
    {
      id: 'm15-rejection-bear',
      label: 'M15 Bearish Price Action / Shooting Star / Rejection',
      passed: activePatterns.some(p => p.bias === 'bearish'),
      direction: 'bearish',
      detail: activePatterns.find(p => p.bias === 'bearish')?.name || 'Waiting for lower timeframe rejection wick or engulfing.'
    },
    {
      id: 'tick-volume-bear',
      label: 'Tick Volume expansion on sell-off',
      passed: m15 ? m15.volumeRatio >= 1.15 && (activePatterns.some(p => p.bias === 'bearish') || (m15.currentClose < (m15.swingHighs[0] || currentPrice))) : false,
      direction: 'bearish',
      detail: m15 ? `Current M15 tick volume: ${(m15.volumeRatio * 100).toFixed(0)}% of 20-period MA.` : 'Evaluating volume...'
    },
    {
      id: 'rsi-bearish',
      label: 'RSI Context: Overbought or rolling over with Bearish Divergence',
      passed: m15 ? (m15.rsi14 >= 58 || m15.hasRsiDivergence) : false,
      direction: 'bearish',
      detail: m15 ? `RSI 14 at ${m15.rsi14} ${m15.hasRsiDivergence ? 'with detected Bearish Divergence' : '(stretched upside)'}.` : 'Assessing RSI...'
    }
  ];

  // News warning check
  if (upcomingNewsWarning) {
    const minsAway = Math.max(1, Math.round((upcomingNewsWarning.timestamp - now) / 60000));
    bullishChecks.push({
      id: 'news-warning-bull',
      label: `⚠ HIGH-IMPACT EVENT: ${upcomingNewsWarning.title} (${minsAway}m away)`,
      passed: false,
      direction: 'warning',
      detail: `Imminent tier-1 macro event creates slippage & whip-saw risk. Technical setups are downgraded.`
    });
    bearishChecks.push({
      id: 'news-warning-bear',
      label: `⚠ HIGH-IMPACT EVENT: ${upcomingNewsWarning.title} (${minsAway}m away)`,
      passed: false,
      direction: 'warning',
      detail: `Imminent tier-1 macro event creates slippage & whip-saw risk. Technical setups are downgraded.`
    });
  }

  // Count passes (qualitative scoring, NEVER displayed as win-percentage)
  const bullPassCount = bullishChecks.filter(c => c.passed).length;
  const bearPassCount = bearishChecks.filter(c => c.passed).length;

  let state: ConfluenceState = 'NO SETUP';
  let stateExplanation = 'No coherent confluence exists between higher timeframes and intraday price action.';

  if (upcomingNewsWarning) {
    state = 'WATCH';
    stateExplanation = `High-impact economic release (${upcomingNewsWarning.title}) in <45m. Setup downgraded to WATCH / AWAIT NEWS PASSAGE.`;
  } else if (bullPassCount >= 5) {
    if (activePatterns.some(p => p.bias === 'bullish') && isAtSupport) {
      state = 'CONFIRMED';
      stateExplanation = 'Strong multi-timeframe bullish confluence confirmed by price rejection at established support.';
    } else {
      state = 'DEVELOPING';
      stateExplanation = 'HTF bullish trend and market structure present; awaiting M15 confirmation trigger at key level.';
    }
  } else if (bearPassCount >= 5) {
    if (activePatterns.some(p => p.bias === 'bearish') && isAtResistance) {
      state = 'CONFIRMED';
      stateExplanation = 'Strong multi-timeframe bearish confluence confirmed by price rejection at overhead resistance.';
    } else {
      state = 'DEVELOPING';
      stateExplanation = 'HTF bearish trend and market structure present; awaiting M15 confirmation trigger at resistance.';
    }
  } else if (bullPassCount >= 3 || bearPassCount >= 3) {
    state = 'WATCH';
    stateExplanation = 'Partial confluence detected, but intermediate structure is conflicting. Patience required.';
  }

  // Check invalidation
  if (nearestSupport && currentPrice < nearestSupport.minPrice && (h4?.ema50 || 0) > (h4?.ema200 || 0)) {
    if (state === 'CONFIRMED' || state === 'DEVELOPING') {
      state = 'INVALIDATED';
      stateExplanation = `Support zone ${nearestSupport.minPrice.toFixed(4)}–${nearestSupport.maxPrice.toFixed(4)} broken; original thesis invalidated.`;
    }
  }

  // Scenarios
  const supportStr = nearestSupport ? `${nearestSupport.minPrice.toFixed(4)}–${nearestSupport.maxPrice.toFixed(4)}` : 'prior swing low';
  const resistanceStr = nearestResistance ? `${nearestResistance.minPrice.toFixed(4)}–${nearestResistance.maxPrice.toFixed(4)}` : 'prior swing high';

  const bullishScenario: ScenarioDefinition = {
    direction: 'bullish',
    title: 'BULLISH SCENARIO: Support Defense & Trend Resumption',
    ifCondition: `If price tests the ${supportStr} support zone and forms an M15 higher low with rejection wicks...`,
    confirmationTrigger: `A decisive close above the local minor swing high with tick volume above its 20-period average.`,
    invalidationLevel: `A sustained hourly candle close below ${nearestSupport ? nearestSupport.minPrice.toFixed(4) : 'key support'}, demonstrating seller absorption.`,
    plausibleOutcome: `Bullish continuation toward target liquidity pool at ${resistanceStr}.`
  };

  const bearishScenario: ScenarioDefinition = {
    direction: 'bearish',
    title: 'BEARISH SCENARIO: Structural Breakdown & Retest Failure',
    ifCondition: `If sellers break decisively through ${supportStr} and the subsequent pullback fails to reclaim the broken zone...`,
    confirmationTrigger: `A failed retest of the broken level acting as newly flipped resistance with a bearish engulfing bar.`,
    invalidationLevel: `A swift aggressive reclaim back inside the original support zone (bear-trap / fakeout recovery).`,
    plausibleOutcome: `Accelerated decline toward the next major structural swing low.`
  };

  // Illustrative trade structure
  const atrPips = m15?.atrPips || (pair === 'USD/JPY' ? 18 : 12);
  const stopPips = Math.max(12, Math.round(atrPips * 1.5));
  const stopDist = stopPips * pipSize;

  let illustrativeSetup: IllustrativeTradeStructure;

  if (bullPassCount >= bearPassCount) {
    const entryPrice = currentPrice;
    const invLevel = Number((nearestSupport ? Math.min(currentPrice - stopDist, nearestSupport.minPrice - 3 * pipSize) : currentPrice - stopDist).toFixed(pair === 'USD/JPY' ? 3 : 5));
    const target1 = Number((nearestResistance ? nearestResistance.minPrice : currentPrice + stopDist * 1.8).toFixed(pair === 'USD/JPY' ? 3 : 5));
    const target2 = Number((nearestResistance ? nearestResistance.maxPrice + 10 * pipSize : currentPrice + stopDist * 3.0).toFixed(pair === 'USD/JPY' ? 3 : 5));

    const actualStopPips = Math.round(Math.abs(entryPrice - invLevel) / pipSize);
    const t1Pips = Math.round(Math.abs(target1 - entryPrice) / pipSize);
    const t2Pips = Math.round(Math.abs(target2 - entryPrice) / pipSize);

    illustrativeSetup = {
      hasSetup: state === 'CONFIRMED' || state === 'DEVELOPING',
      direction: 'LONG',
      entryZone: `On confirmed rejection inside ${supportStr}`,
      invalidationLevel: invLevel,
      target1,
      target2,
      riskReward1: Number((t1Pips / Math.max(1, actualStopPips)).toFixed(2)),
      riskReward2: Number((t2Pips / Math.max(1, actualStopPips)).toFixed(2)),
      stopDistancePips: actualStopPips,
      target1Pips: t1Pips,
      target2Pips: t2Pips,
      rationale: `Invalidation placed below the structural swing low and support zone buffer (1.5x ATR = ${stopPips} pips) to prevent premature wick stop-outs. Targets placed at structural overhead liquidity zones.`
    };
  } else {
    const entryPrice = currentPrice;
    const invLevel = Number((nearestResistance ? Math.max(currentPrice + stopDist, nearestResistance.maxPrice + 3 * pipSize) : currentPrice + stopDist).toFixed(pair === 'USD/JPY' ? 3 : 5));
    const target1 = Number((nearestSupport ? nearestSupport.maxPrice : currentPrice - stopDist * 1.8).toFixed(pair === 'USD/JPY' ? 3 : 5));
    const target2 = Number((nearestSupport ? nearestSupport.minPrice - 10 * pipSize : currentPrice - stopDist * 3.0).toFixed(pair === 'USD/JPY' ? 3 : 5));

    const actualStopPips = Math.round(Math.abs(invLevel - entryPrice) / pipSize);
    const t1Pips = Math.round(Math.abs(entryPrice - target1) / pipSize);
    const t2Pips = Math.round(Math.abs(entryPrice - target2) / pipSize);

    illustrativeSetup = {
      hasSetup: state === 'CONFIRMED' || state === 'DEVELOPING',
      direction: 'SHORT',
      entryZone: `On confirmed rejection inside ${resistanceStr}`,
      invalidationLevel: invLevel,
      target1,
      target2,
      riskReward1: Number((t1Pips / Math.max(1, actualStopPips)).toFixed(2)),
      riskReward2: Number((t2Pips / Math.max(1, actualStopPips)).toFixed(2)),
      stopDistancePips: actualStopPips,
      target1Pips: t1Pips,
      target2Pips: t2Pips,
      rationale: `Invalidation placed above overhead supply structure + 1.5x ATR buffer. Target 1 placed directly at preceding demand pool.`
    };
  }

  return {
    state,
    stateExplanation,
    bullishChecks,
    bearishChecks,
    bullishConfluenceScore: bullPassCount,
    bearishConfluenceScore: bearPassCount,
    bullishScenario,
    bearishScenario,
    illustrativeSetup,
    upcomingNewsWarning
  };
}
