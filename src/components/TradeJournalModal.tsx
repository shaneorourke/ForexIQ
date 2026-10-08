import React, { useState, useEffect } from 'react';
import { ForexPair, JournalTrade, JournalReviewChecklist } from '../types/forex';
import {
  BookOpen,
  X,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  TrendingUp,
  TrendingDown,
  Trash2,
  HelpCircle
} from 'lucide-react';

interface TradeJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPair: ForexPair;
  currentPrice: number;
}

const STORAGE_KEY = 'forexiq_trade_journal_v1';

export const TradeJournalModal: React.FC<TradeJournalModalProps> = ({
  isOpen,
  onClose,
  currentPair,
  currentPrice,
}) => {
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'new' | 'analytics'>('list');

  // Form State
  const [pair, setPair] = useState<ForexPair>(currentPair);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState<number>(currentPrice);
  const [stopLoss, setStopLoss] = useState<number>(Number((currentPrice - 0.0025).toFixed(5)));
  const [takeProfit, setTakeProfit] = useState<number>(Number((currentPrice + 0.0050).toFixed(5)));
  const [reason, setReason] = useState<string>('');
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Self-Review Checklist
  const [checklist, setChecklist] = useState<JournalReviewChecklist>({
    confirmedBeforeEntry: true,
    alignedWithHTF: true,
    avoidedResistanceLong: true,
    stopDistanceAdequate: true,
    newsAvoidance: true,
    avoidedChasing: true,
  });

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTrades(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading journal trades', e);
      }
    } else {
      // Seed with initial educational sample trade for instant learning
      const sampleTrades: JournalTrade[] = [
        {
          id: 'trade-seed-1',
          timestamp: Date.now() - 4 * 3600 * 1000,
          pair: 'EUR/USD',
          direction: 'LONG',
          entryPrice: 1.08250,
          stopLoss: 1.08050,
          takeProfit: 1.08750,
          lotSize: 0.5,
          riskAmountUSD: 100,
          riskPercentage: 1.0,
          reason: 'H4 bullish structure with 50 EMA > 200 EMA. Price pulled back into D1 support zone (1.0820–1.0828) and formed an M15 bullish pin-bar with elevated tick volume.',
          supportingSignals: ['H4 50 EMA > 200 EMA', 'Support Zone Rejection Wick', 'Tick Volume MA 20 Expansion', 'RSI Bullish Recovery'],
          status: 'WIN',
          exitPrice: 1.08750,
          pnlPips: 50,
          pnlUSD: 250,
          notes: 'Target 1 hit smoothly. High patience waiting for M15 rejection confirmation paid off.',
          reviewChecklist: {
            confirmedBeforeEntry: true,
            alignedWithHTF: true,
            avoidedResistanceLong: true,
            stopDistanceAdequate: true,
            newsAvoidance: true,
            avoidedChasing: true,
          },
          mistakesDetected: []
        },
        {
          id: 'trade-seed-2',
          timestamp: Date.now() - 28 * 3600 * 1000,
          pair: 'EUR/USD',
          direction: 'LONG',
          entryPrice: 1.08900,
          stopLoss: 1.08800,
          takeProfit: 1.09300,
          lotSize: 1.0,
          riskAmountUSD: 100,
          riskPercentage: 1.0,
          reason: 'Chased a large green candle without waiting for a pullback or confirmation wick.',
          supportingSignals: ['Breakout impulse'],
          status: 'LOSS',
          exitPrice: 1.08800,
          pnlPips: -10,
          pnlUSD: -100,
          notes: 'Stopped out immediately. Stop was set at only 10 pips (too tight, < 1.0x ATR) and entered straight into H4 resistance.',
          reviewChecklist: {
            confirmedBeforeEntry: false,
            alignedWithHTF: true,
            avoidedResistanceLong: false,
            stopDistanceAdequate: false,
            newsAvoidance: true,
            avoidedChasing: false,
          },
          mistakesDetected: ['Entered directly into resistance', 'Stops too tight (< 1x ATR)', 'Chasing large candles']
        }
      ];
      setTrades(sampleTrades);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleTrades));
    }
  }, []);

  const saveTrades = (updated: JournalTrade[]) => {
    setTrades(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleCreateTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const pipMultiplier = pair === 'USD/JPY' ? 100 : 10000;
    const stopPips = Math.round(Math.abs(entryPrice - stopLoss) * pipMultiplier);

    // Automatic mistake detection
    const mistakes: string[] = [];
    if (!checklist.confirmedBeforeEntry) mistakes.push('Entered before confirmation');
    if (!checklist.alignedWithHTF) mistakes.push('Trading against higher timeframe trend');
    if (!checklist.avoidedResistanceLong) mistakes.push('Entered directly into major resistance');
    if (!checklist.stopDistanceAdequate || stopPips < 12) mistakes.push('Stops too tight (< 1x ATR)');
    if (!checklist.newsAvoidance) mistakes.push('Trading immediately before high-impact news');
    if (!checklist.avoidedChasing) mistakes.push('Chasing extended candles without pullback');

    const newTrade: JournalTrade = {
      id: `trade-${Date.now()}`,
      timestamp: Date.now(),
      pair,
      direction,
      entryPrice,
      stopLoss,
      takeProfit,
      lotSize: 0.5,
      riskAmountUSD: 100,
      riskPercentage: 1.0,
      reason,
      supportingSignals: selectedSignals,
      status: 'OPEN',
      notes,
      reviewChecklist: checklist,
      mistakesDetected: mistakes,
    };

    saveTrades([newTrade, ...trades]);
    setViewMode('list');
    setReason('');
    setNotes('');
  };

  const handleUpdateStatus = (id: string, status: 'WIN' | 'LOSS' | 'SCRATCH') => {
    const pipMultiplier = pair === 'USD/JPY' ? 100 : 10000;
    const updated = trades.map(t => {
      if (t.id === id) {
        const pips = status === 'WIN'
          ? Math.round(Math.abs(t.takeProfit - t.entryPrice) * pipMultiplier)
          : status === 'LOSS'
          ? -Math.round(Math.abs(t.entryPrice - t.stopLoss) * pipMultiplier)
          : 0;
        return {
          ...t,
          status,
          exitPrice: status === 'WIN' ? t.takeProfit : t.stopLoss,
          exitTimestamp: Date.now(),
          pnlPips: pips,
          pnlUSD: pips * 10 * t.lotSize,
        };
      }
      return t;
    });
    saveTrades(updated);
  };

  const handleDeleteTrade = (id: string) => {
    saveTrades(trades.filter(t => t.id !== id));
  };

  // Mistakes aggregation for Analytics
  const recurringMistakesMap: Record<string, number> = {};
  trades.forEach(t => {
    t.mistakesDetected?.forEach(m => {
      recurringMistakesMap[m] = (recurringMistakesMap[m] || 0) + 1;
    });
  });

  const availableSignals = [
    'H4 50 EMA > 200 EMA (Bullish HTF)',
    'H4 50 EMA < 200 EMA (Bearish HTF)',
    'H1 Market Structure (HH / HL)',
    'H1 Market Structure (LH / LL)',
    'Support Zone Rejection Wick (Pin Bar)',
    'Resistance Zone Rejection Wick',
    'Tick Volume > 20-period MA',
    'RSI Bullish Recovery / Divergence',
    'RSI Bearish Turnover / Divergence',
    'Retest of Broken Level Holding',
  ];

  const toggleSignal = (sig: string) => {
    setSelectedSignals(prev =>
      prev.includes(sig) ? prev.filter(s => s !== sig) : [...prev, sig]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b0f19] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 bg-[#0e1424] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-500/40 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide">Paper Trading Journal & Thesis Reviewer</h2>
              <p className="text-[11px] text-slate-400 font-mono">Decision-Support Practice • Recurring Mistake Eliminator</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded font-semibold ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Journal ({trades.length})
              </button>
              <button
                onClick={() => setViewMode('new')}
                className={`px-3 py-1 rounded font-semibold ${viewMode === 'new' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                + Log Setup
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`px-3 py-1 rounded font-semibold ${viewMode === 'analytics' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Mistake Radar
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto text-xs space-y-4">
          {/* VIEW: TRADE LIST */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {trades.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <p>No paper trades recorded yet.</p>
                  <button
                    onClick={() => setViewMode('new')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold"
                  >
                    Log Your First Setup
                  </button>
                </div>
              ) : (
                trades.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${t.direction === 'LONG' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950 text-rose-400 border border-rose-500/30'}`}>
                          {t.direction} {t.pair}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(t.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono ${
                          t.status === 'WIN' ? 'bg-emerald-900 text-emerald-300' : t.status === 'LOSS' ? 'bg-rose-900 text-rose-300' : 'bg-blue-900 text-blue-300'
                        }`}>
                          {t.status} {t.pnlPips ? `(${t.pnlPips > 0 ? '+' : ''}${t.pnlPips} pips)` : ''}
                        </span>

                        {t.status === 'OPEN' && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'WIN')}
                              className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px]"
                            >
                              Target Hit
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'LOSS')}
                              className="px-2 py-0.5 bg-rose-700 hover:bg-rose-600 text-white rounded text-[10px]"
                            >
                              Stopped Out
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => handleDeleteTrade(t.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Price Levels Grid */}
                    <div className="grid grid-cols-3 gap-2 font-mono text-center">
                      <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">Entry</span>
                        <span className="font-bold text-slate-200">{t.entryPrice.toFixed(4)}</span>
                      </div>
                      <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">Invalidation (Stop)</span>
                        <span className="font-bold text-rose-400">{t.stopLoss.toFixed(4)}</span>
                      </div>
                      <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">Target</span>
                        <span className="font-bold text-emerald-400">{t.takeProfit.toFixed(4)}</span>
                      </div>
                    </div>

                    {/* Reason */}
                    <p className="text-slate-300 leading-snug">
                      <strong className="text-slate-400 block text-[10px] uppercase">Thesis Reason:</strong>
                      {t.reason}
                    </p>

                    {/* Supporting Signals */}
                    {t.supportingSignals && t.supportingSignals.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {t.supportingSignals.map((sig, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                            ✓ {sig}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Mistakes Detected Flag */}
                    {t.mistakesDetected && t.mistakesDetected.length > 0 && (
                      <div className="p-2 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span><strong>Identified Errors:</strong> {t.mistakesDetected.join(', ')}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* VIEW: LOG NEW TRADE */}
          {viewMode === 'new' && (
            <form onSubmit={handleCreateTrade} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div>
                  <label className="block text-slate-300 text-[11px] font-bold mb-1">Pair</label>
                  <select
                    value={pair}
                    onChange={(e) => setPair(e.target.value as ForexPair)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="EUR/USD">EUR/USD</option>
                    <option value="GBP/USD">GBP/USD</option>
                    <option value="USD/JPY">USD/JPY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 text-[11px] font-bold mb-1">Direction</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setDirection('LONG')}
                      className={`p-2 rounded-lg font-bold ${direction === 'LONG' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('SHORT')}
                      className={`p-2 rounded-lg font-bold ${direction === 'SHORT' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-[11px] font-bold mb-1">Entry Price</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-[11px] font-bold mb-1">Stop Loss (Invalidation)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-bold mb-1">Target 1 (Take Profit)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-emerald-400 font-mono"
                />
              </div>

              {/* Supporting Technical Signals Checklist */}
              <div>
                <label className="block text-slate-300 text-[11px] font-bold mb-1">
                  Supporting Technical Confluence Factors
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {availableSignals.map((sig) => (
                    <button
                      key={sig}
                      type="button"
                      onClick={() => toggleSignal(sig)}
                      className={`p-2 rounded-lg text-left transition-colors flex items-center space-x-2 ${
                        selectedSignals.includes(sig)
                          ? 'bg-blue-900/60 text-blue-200 border border-blue-500/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${selectedSignals.includes(sig) ? 'bg-blue-500 text-white' : 'border border-slate-600'}`}>
                        {selectedSignals.includes(sig) ? '✓' : ''}
                      </span>
                      <span>{sig}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Why are you taking this trade? */}
              <div>
                <label className="block text-slate-300 text-[11px] font-bold mb-1">
                  Primary Thesis & Invalidation Rationale (Why this setup?)
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain the multi-timeframe reasoning, rejection proof, and why the stop is placed here..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 placeholder-slate-500"
                  required
                />
              </div>

              {/* Pre-Flight Discipline Self-Check */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide block">
                  Pre-Flight Execution Review (Prevent Common Biases)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 text-[11px]">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.confirmedBeforeEntry}
                      onChange={(e) => setChecklist({ ...checklist, confirmedBeforeEntry: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600"
                    />
                    <span>Waited for confirmation candle (not front-running)?</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.alignedWithHTF}
                      onChange={(e) => setChecklist({ ...checklist, alignedWithHTF: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600"
                    />
                    <span>Aligned with H4/H1 trend bias?</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.avoidedResistanceLong}
                      onChange={(e) => setChecklist({ ...checklist, avoidedResistanceLong: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600"
                    />
                    <span>Avoided buying directly into overhead resistance?</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.stopDistanceAdequate}
                      onChange={(e) => setChecklist({ ...checklist, stopDistanceAdequate: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600"
                    />
                    <span>Stop loss &gt; 1.2x ATR buffer?</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.newsAvoidance}
                      onChange={(e) => setChecklist({ ...checklist, newsAvoidance: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600"
                    />
                    <span>No tier-1 economic release in &lt; 30 minutes?</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.avoidedChasing}
                      onChange={(e) => setChecklist({ ...checklist, avoidedChasing: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600"
                    />
                    <span>Not chasing extended green/red candles?</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md"
                >
                  Save Paper Setup
                </button>
              </div>
            </form>
          )}

          {/* VIEW: RECURRING MISTAKE RADAR */}
          {viewMode === 'analytics' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm text-slate-100">Recurring Mistake Diagnostic Radar</h3>
                </div>
                <p className="text-slate-400 leading-relaxed text-xs">
                  Forex profitability is primarily about error elimination rather than trade frequency. The system tracks violations of core risk and structural principles.
                </p>

                <div className="space-y-2 pt-2">
                  {[
                    'Entered before confirmation',
                    'Trading against higher timeframe trend',
                    'Entered directly into major resistance',
                    'Stops too tight (< 1x ATR)',
                    'Trading immediately before high-impact news',
                    'Chasing extended candles without pullback',
                  ].map((mistake) => {
                    const count = recurringMistakesMap[mistake] || 0;
                    return (
                      <div key={mistake} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${count > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                          <span className="font-semibold text-slate-200">{mistake}</span>
                        </div>
                        <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${count > 0 ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'}`}>
                          {count} {count === 1 ? 'instance' : 'instances'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
