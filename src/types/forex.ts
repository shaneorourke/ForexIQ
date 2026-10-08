export type ForexPair = 'EUR/USD' | 'GBP/USD' | 'USD/JPY';

export type Timeframe = 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1';

export type ConnectionStatus = 'live' | 'delayed' | 'unavailable' | 'stale';

export interface Candle {
  time: number; // Unix timestamp in seconds or ms
  open: number;
  high: number;
  low: number;
  close: number;
  tickVolume: number;
}

export interface Tick {
  pair: ForexPair;
  bid: number;
  ask: number;
  spread: number; // In pips (e.g. 0.8)
  timestamp: number;
}

export interface HorizontalLevel {
  id: string;
  price: number;
  label: string;
  color: string;
  createdAt: number;
}

export interface SRZone {
  id: string;
  minPrice: number;
  maxPrice: number;
  midPrice: number;
  type: 'support' | 'resistance';
  timeframe: Timeframe;
  reactions: number;
  recency: string; // e.g. "2 hours ago", "Yesterday"
  confidence: 'High' | 'Medium' | 'Low';
  reason: string;
  isPsychological?: boolean;
  isDailyKeyLevel?: boolean;
}

export interface TimeframeAnalysis {
  timeframe: Timeframe;
  currentClose: number;
  ema50: number;
  ema200: number;
  emaBias: 'bullish' | 'bearish' | 'neutral';
  structure: 'bullish' | 'bearish' | 'ranging';
  structureDescription: string;
  swingHighs: number[];
  swingLows: number[];
  rsi14: number;
  rsiInterpretation: string;
  hasRsiDivergence: boolean;
  rsiDivergenceType?: 'Bullish Divergence' | 'Bearish Divergence';
  atr14: number;
  atrPips: number;
  atrVolatilityAssessment: string;
  tickVolume: number;
  avgTickVolume: number;
  volumeRatio: number; // e.g. 1.35
  volumeStatus: 'Elevated' | 'Normal' | 'Low';
  patterns: string[];
}

export type ConfluenceState = 'NO SETUP' | 'WATCH' | 'DEVELOPING' | 'CONFIRMED' | 'INVALIDATED';

export interface ConfluenceCheckItem {
  id: string;
  label: string;
  passed: boolean;
  direction: 'bullish' | 'bearish' | 'warning' | 'neutral';
  detail: string;
}

export interface ScenarioDefinition {
  direction: 'bullish' | 'bearish';
  title: string;
  ifCondition: string;
  confirmationTrigger: string;
  invalidationLevel: string;
  plausibleOutcome: string;
}

export interface IllustrativeTradeStructure {
  hasSetup: boolean;
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  entryZone: string;
  invalidationLevel: number;
  target1: number;
  target2: number;
  riskReward1: number;
  riskReward2: number;
  stopDistancePips: number;
  target1Pips: number;
  target2Pips: number;
  rationale: string;
}

export interface EconomicEvent {
  id: string;
  title: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY';
  time: string;
  timestamp: number;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  previous: string;
  forecast: string;
  actual?: string | null;
  impactNote?: string;
}

export interface AlertNotification {
  id: string;
  timestamp: number;
  pair: ForexPair;
  type: 'ZONE_ENTRY' | 'BREAKOUT' | 'RETEST' | 'REJECTION' | 'EMA_CROSS' | 'VOLUME_SPIKE' | 'HIGH_IMPACT_NEWS' | 'CONFLUENCE_CHANGE';
  title: string;
  message: string;
  severity: 'bullish' | 'bearish' | 'warning' | 'info';
  read?: boolean;
}

export interface JournalReviewChecklist {
  confirmedBeforeEntry: boolean;
  alignedWithHTF: boolean;
  avoidedResistanceLong: boolean;
  stopDistanceAdequate: boolean;
  newsAvoidance: boolean;
  avoidedChasing: boolean;
}

export interface JournalTrade {
  id: string;
  timestamp: number;
  pair: ForexPair;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  riskAmountUSD: number;
  riskPercentage: number;
  reason: string;
  supportingSignals: string[];
  status: 'OPEN' | 'WIN' | 'LOSS' | 'SCRATCH';
  exitPrice?: number;
  exitTimestamp?: number;
  pnlPips?: number;
  pnlUSD?: number;
  notes: string;
  reviewChecklist: JournalReviewChecklist;
  mistakesDetected: string[];
}

export interface AIAnalysisResult {
  marketState: 'BULLISH' | 'BEARISH' | 'RANGING' | 'NEUTRAL';
  setupStatus: ConfluenceState;
  executiveSummary: string;
  answers: {
    q1_htf_trend: string;
    q2_support_zones: string;
    q3_resistance_zones: string;
    q4_trend_or_range: string;
    q5_h1_context: string;
    q6_m15_context: string;
    q7_bullish_confluence: string;
    q8_bearish_confluence: string;
    q9_bullish_confirmation: string;
    q10_bullish_invalidation: string;
    q11_bearish_confirmation: string;
    q12_upcoming_events: string;
    q13_watch_next: string;
  };
  bullishScenario: {
    ifCondition: string;
    confirmationTrigger: string;
    invalidationLevel: string;
    probableContinuation: string;
  };
  bearishScenario: {
    ifCondition: string;
    confirmationTrigger: string;
    invalidationLevel: string;
    probableContinuation: string;
  };
  illustrativeTradeSetup?: {
    hasSetup: boolean;
    bias: 'LONG' | 'SHORT' | 'NONE';
    entryZone: string;
    invalidationLevel: string;
    target1: string;
    target2: string;
    riskRewardRatio: string;
    stopRationale: string;
  };
  educationalNote: string;
  timestamp: number;
}
