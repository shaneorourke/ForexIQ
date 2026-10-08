/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AIAnalysisResult,
  AlertNotification,
  Candle,
  ConnectionStatus,
  EconomicEvent,
  ForexPair,
  HorizontalLevel,
  SRZone,
  Tick,
  Timeframe,
  TimeframeAnalysis,
} from './types/forex';
import { marketFeed } from './services/marketData/interactiveMarketFeed';
import { calculateEMA, calculateRSI, calculateATR, calculateVolumeStats, detectDivergence } from './services/analysis/technicalIndicators';
import { evaluateMarketStructure } from './services/analysis/marketStructureEngine';
import { detectSupportResistanceZones } from './services/analysis/supportResistanceEngine';
import { detectCandlePatterns } from './services/analysis/candlestickPatternEngine';
import { evaluateConfluence, ConfluenceReport } from './services/analysis/confluenceEngine';
import { alertEngine } from './services/analysis/alertEngine';

// Components
import { Header } from './components/Header';
import { TradingChart } from './components/TradingChart';
import { MultiTimeframePanel } from './components/MultiTimeframePanel';
import { ConfluencePanel } from './components/ConfluencePanel';
import { AIAnalysisPanel } from './components/AIAnalysisPanel';
import { SupportResistanceList } from './components/SupportResistanceList';
import { EconomicCalendarPanel } from './components/EconomicCalendarPanel';
import { RiskCalculatorModal } from './components/RiskCalculatorModal';
import { TradeJournalModal } from './components/TradeJournalModal';
import { Mt5ConnectorModal } from './components/Mt5ConnectorModal';
import { AlertDrawer } from './components/AlertDrawer';

export default function App() {
  // Primary Dashboard State
  const [selectedPair, setSelectedPair] = useState<ForexPair>('EUR/USD');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('M15');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('live');

  // Market Data State
  const [latestTick, setLatestTick] = useState<Tick>(marketFeed.getLatestTick('EUR/USD'));
  const [candlesMap, setCandlesMap] = useState<Map<Timeframe, Candle[]>>(new Map());

  // Manually drawn horizontal levels
  const [horizontalLevels, setHorizontalLevels] = useState<HorizontalLevel[]>([]);

  // Economic Events
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([]);

  // Alerts
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);

  // Modals
  const [isRiskModalOpen, setIsRiskModalOpen] = useState<boolean>(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState<boolean>(false);
  const [isMt5ModalOpen, setIsMt5ModalOpen] = useState<boolean>(false);

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Fetch economic calendar from server
  useEffect(() => {
    fetch('/api/economic-calendar')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.events) {
          setEconomicEvents(data.events);
        }
      })
      .catch(err => console.error('Failed to load economic calendar', err));
  }, []);

  // Connect to market feed and load initial candles
  useEffect(() => {
    marketFeed.connect();
    setConnectionStatus(marketFeed.getStatus());

    // Subscribe to status changes
    const unsubStatus = marketFeed.subscribeStatus((st) => setConnectionStatus(st));

    // Load initial candles for all timeframes
    const loadCandles = async () => {
      const timeframes: Timeframe[] = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
      const newMap = new Map<Timeframe, Candle[]>();
      for (const tf of timeframes) {
        const c = await marketFeed.getCandles(selectedPair, tf);
        newMap.set(tf, c);
      }
      setCandlesMap(newMap);
      setLatestTick(marketFeed.getLatestTick(selectedPair));
    };

    loadCandles();

    // Subscribe to real-time ticks
    const unsubTicks = marketFeed.subscribeTicks((tick) => {
      if (tick.pair === selectedPair) {
        setLatestTick(tick);
      }
    });

    // Subscribe to candle updates
    const unsubCandles = marketFeed.subscribeCandleUpdates((pair, tf, candle) => {
      if (pair === selectedPair) {
        setCandlesMap((prev) => {
          const next = new Map(prev);
          const list = next.get(tf) ? [...(next.get(tf) || [])] : [];
          if (list.length > 0 && list[list.length - 1].time === candle.time) {
            list[list.length - 1] = candle;
          } else {
            list.push(candle);
          }
          next.set(tf, list);
          return next;
        });
      }
    });

    return () => {
      unsubStatus();
      unsubTicks();
      unsubCandles();
    };
  }, [selectedPair]);

  const handleCalibratePrice = useCallback((pair: ForexPair, price: number) => {
    marketFeed.calibratePrice(pair, price, true);
    setLatestTick(marketFeed.getLatestTick(pair));
    // Reload candles for active pair
    const timeframes: Timeframe[] = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
    Promise.all(timeframes.map(tf => marketFeed.getCandles(pair, tf))).then(results => {
      const newMap = new Map<Timeframe, Candle[]>();
      timeframes.forEach((tf, idx) => newMap.set(tf, results[idx]));
      setCandlesMap(newMap);
    });
  }, []);

  const handleImportCsv = useCallback((pair: ForexPair, timeframe: Timeframe, csv: string) => {
    const res = marketFeed.importMt5Candles(pair, timeframe, csv);
    if (res.success) {
      setLatestTick(marketFeed.getLatestTick(pair));
      const timeframes: Timeframe[] = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
      Promise.all(timeframes.map(tf => marketFeed.getCandles(pair, tf))).then(results => {
        const newMap = new Map<Timeframe, Candle[]>();
        timeframes.forEach((tf, idx) => newMap.set(tf, results[idx]));
        setCandlesMap(newMap);
      });
    }
    return res;
  }, []);

  // Current active chart candles
  const currentCandles = useMemo(() => {
    return candlesMap.get(selectedTimeframe) || [];
  }, [candlesMap, selectedTimeframe]);

  // Multi-Timeframe Technical Calculations
  const timeframesAnalysis = useMemo(() => {
    const result: Record<string, TimeframeAnalysis> = {};
    const tfs: Timeframe[] = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

    tfs.forEach((tf) => {
      const candles = candlesMap.get(tf) || [];
      if (candles.length === 0) return;

      const closes = candles.map(c => c.close);
      const ema50Arr = calculateEMA(50, closes);
      const ema200Arr = calculateEMA(200, closes);
      const ema50 = ema50Arr[ema50Arr.length - 1] || closes[closes.length - 1];
      const ema200 = ema200Arr[ema200Arr.length - 1] || closes[closes.length - 1];

      const { structure, description: structureDescription, swingHighValues, swingLowValues } = evaluateMarketStructure(candles, tf, ema50, ema200);
      const { rsiValues, latestRsi } = calculateRSI(14, closes);
      const { hasDivergence, type: divType } = detectDivergence(candles, rsiValues);
      const { latestATR } = calculateATR(14, candles);
      const volumeStats = calculateVolumeStats(20, candles);

      const pipMultiplier = selectedPair === 'USD/JPY' ? 100 : 10000;
      const atrPips = Math.round(latestATR * pipMultiplier);

      const patterns = detectCandlePatterns(candles);

      result[tf] = {
        timeframe: tf,
        currentClose: closes[closes.length - 1],
        ema50,
        ema200,
        emaBias: ema50 > ema200 ? 'bullish' : 'bearish',
        structure,
        structureDescription,
        swingHighs: swingHighValues,
        swingLows: swingLowValues,
        rsi14: latestRsi,
        rsiInterpretation: latestRsi >= 70 ? 'Stretched upside' : latestRsi <= 30 ? 'Stretched downside' : 'Healthy momentum channel',
        hasRsiDivergence: hasDivergence,
        rsiDivergenceType: divType,
        atr14: latestATR,
        atrPips,
        atrVolatilityAssessment: atrPips > 25 ? 'High Volatility' : 'Normal Volatility',
        tickVolume: volumeStats.currentVolume,
        avgTickVolume: volumeStats.avgVolume,
        volumeRatio: volumeStats.ratio,
        volumeStatus: volumeStats.status,
        patterns: patterns.map(p => p.name)
      };
    });

    return result;
  }, [candlesMap, selectedPair]);

  // Support & Resistance Zones Calculation
  const { supportZones, resistanceZones } = useMemo(() => {
    return detectSupportResistanceZones(selectedPair, candlesMap, latestTick.bid);
  }, [selectedPair, candlesMap, latestTick.bid]);

  // Active Patterns on current chart
  const activePatterns = useMemo(() => {
    return detectCandlePatterns(currentCandles, [...supportZones, ...resistanceZones]);
  }, [currentCandles, supportZones, resistanceZones]);

  // Confluence Evaluation
  const confluenceReport: ConfluenceReport = useMemo(() => {
    return evaluateConfluence(
      selectedPair,
      latestTick.bid,
      timeframesAnalysis,
      supportZones,
      resistanceZones,
      activePatterns,
      economicEvents
    );
  }, [selectedPair, latestTick.bid, timeframesAnalysis, supportZones, resistanceZones, activePatterns, economicEvents]);

  // Evaluate alerts periodically
  useEffect(() => {
    if (latestTick.bid > 0) {
      const newAlerts = alertEngine.evaluateAlerts(
        selectedPair,
        latestTick.bid,
        supportZones,
        resistanceZones,
        activePatterns,
        timeframesAnalysis['M15'],
        confluenceReport.state,
        economicEvents
      );

      if (newAlerts.length > 0) {
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, 30));
      }
    }
  }, [latestTick, supportZones, resistanceZones, activePatterns, timeframesAnalysis, confluenceReport.state, economicEvents, selectedPair]);

  // Trigger Gemini AI Analysis via Express server
  const triggerAiAnalysis = useCallback(async (customQuestion?: string) => {
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair: selectedPair,
          timeframe: selectedTimeframe,
          currentPrice: latestTick.bid,
          bid: latestTick.bid,
          ask: latestTick.ask,
          spread: latestTick.spread,
          timeframesAnalysis,
          supportZones,
          resistanceZones,
          confluenceState: confluenceReport.state,
          confluenceChecks: [...confluenceReport.bullishChecks, ...confluenceReport.bearishChecks],
          detectedPatterns: activePatterns,
          upcomingHighImpactEvent: confluenceReport.upcomingNewsWarning,
          userQuestion: customQuestion
        }),
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        setAiAnalysis({
          ...resData.data,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error('Failed to run AI analysis:', err);
    } finally {
      setIsAiLoading(false);
    }
  }, [selectedPair, selectedTimeframe, latestTick, timeframesAnalysis, supportZones, resistanceZones, confluenceReport, activePatterns]);

  // Run initial AI analysis after data loads
  useEffect(() => {
    if (currentCandles.length > 50 && !aiAnalysis) {
      triggerAiAnalysis();
    }
  }, [currentCandles.length, aiAnalysis, triggerAiAnalysis]);

  // Level Handlers
  const handleAddLevel = (price: number) => {
    const newLvl: HorizontalLevel = {
      id: `level-${Date.now()}`,
      price,
      label: 'Manual Level',
      color: '#38bdf8',
      createdAt: Date.now()
    };
    setHorizontalLevels((prev) => [...prev, newLvl]);
  };

  const handleDeleteLevel = (id: string) => {
    setHorizontalLevels((prev) => prev.filter(l => l.id !== id));
  };

  // Allow switching simulated connection status
  const handleChangeConnectionStatus = (status: ConnectionStatus) => {
    marketFeed.setStatus(status);
    setConnectionStatus(status);
  };

  return (
    <div className="min-h-screen bg-[#070a10] text-[#e2e8f0] flex flex-col font-sans">
      {/* Top Global Header */}
      <Header
        selectedPair={selectedPair}
        onSelectPair={setSelectedPair}
        availablePairs={['EUR/USD', 'GBP/USD', 'USD/JPY']}
        latestTick={latestTick}
        connectionStatus={connectionStatus}
        onChangeConnectionStatus={handleChangeConnectionStatus}
        onOpenAI={() => triggerAiAnalysis()}
        onOpenJournal={() => setIsJournalModalOpen(true)}
        onOpenRiskCalc={() => setIsRiskModalOpen(true)}
        onOpenMt5Modal={() => setIsMt5ModalOpen(true)}
        onToggleAlerts={() => setIsAlertsOpen(!isAlertsOpen)}
        unreadAlertsCount={alerts.length}
        isAiAnalyzing={isAiLoading}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-3 sm:p-4 space-y-4">
        {/* Row 1: Interactive Candlestick Chart (Hero) + Quick S/R Clusters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Chart (8 Columns on desktop) */}
          <div className="lg:col-span-8 min-h-[500px] h-[580px]">
            <TradingChart
              candles={currentCandles}
              pair={selectedPair}
              timeframe={selectedTimeframe}
              onTimeframeChange={setSelectedTimeframe}
              supportZones={supportZones}
              resistanceZones={resistanceZones}
              horizontalLevels={horizontalLevels}
              onAddLevel={handleAddLevel}
              onDeleteLevel={handleDeleteLevel}
              upcomingEvents={economicEvents}
              currentBid={latestTick.bid}
              currentAsk={latestTick.ask}
            />
          </div>

          {/* Right Panel: AI Analysis & Confluence Summary (4 Columns) */}
          <div className="lg:col-span-4 flex flex-col h-[580px] overflow-hidden">
            <AIAnalysisPanel
              pair={selectedPair}
              aiData={aiAnalysis}
              isLoading={isAiLoading}
              onRefresh={(q) => triggerAiAnalysis(q)}
            />
          </div>
        </div>

        {/* Row 2: Confluence Engine & Evidence Matrix */}
        <div>
          <ConfluencePanel
            report={confluenceReport}
            currentPrice={latestTick.bid}
          />
        </div>

        {/* Row 3: Multi-Timeframe Matrix (D1 -> H4 -> H1 -> M15) */}
        <div>
          <MultiTimeframePanel
            timeframes={timeframesAnalysis}
            activeTimeframe={selectedTimeframe}
            onSelectTimeframe={setSelectedTimeframe}
          />
        </div>

        {/* Row 4: Support & Resistance Detail & Macroeconomic News Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6">
            <SupportResistanceList
              pair={selectedPair}
              currentPrice={latestTick.bid}
              supportZones={supportZones}
              resistanceZones={resistanceZones}
            />
          </div>
          <div className="lg:col-span-6">
            <EconomicCalendarPanel
              events={economicEvents}
              selectedPair={selectedPair}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#080b12] py-3 px-4 text-center text-xs text-slate-500 font-mono">
        ForexIQ Institutional Decision Support • Strictly Educational Analysis • Never trade with capital you cannot afford to lose.
      </footer>

      {/* Slide-out Alert Drawer */}
      <AlertDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onClearAlerts={() => setAlerts([])}
      />

      {/* Risk Management Calculator Modal */}
      <RiskCalculatorModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        pair={selectedPair}
        suggestedStopPips={confluenceReport.illustrativeSetup?.stopDistancePips || 20}
      />

      {/* Paper Trading & Trade Journal Modal */}
      <TradeJournalModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        currentPair={selectedPair}
        currentPrice={latestTick.bid}
      />

      {/* MT5 / Live Stream Integration Guide Modal */}
      <Mt5ConnectorModal
        isOpen={isMt5ModalOpen}
        onClose={() => setIsMt5ModalOpen(false)}
        selectedPair={selectedPair}
        latestTick={latestTick}
        onCalibratePrice={handleCalibratePrice}
        onImportCsv={handleImportCsv}
      />
    </div>
  );
}
