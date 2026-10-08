import React from 'react';
import { ConnectionStatus, ForexPair, Tick } from '../types/forex';
import {
  Activity,
  AlertCircle,
  Bell,
  BookOpen,
  Calculator,
  ChevronDown,
  Cpu,
  Layers,
  Radio,
  Settings,
  ShieldAlert,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';

interface HeaderProps {
  selectedPair: ForexPair;
  onSelectPair: (pair: ForexPair) => void;
  availablePairs: ForexPair[];
  latestTick: Tick;
  connectionStatus: ConnectionStatus;
  onChangeConnectionStatus: (status: ConnectionStatus) => void;
  onOpenAI: () => void;
  onOpenJournal: () => void;
  onOpenRiskCalc: () => void;
  onOpenMt5Modal: () => void;
  onToggleAlerts: () => void;
  unreadAlertsCount: number;
  isAiAnalyzing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selectedPair,
  onSelectPair,
  availablePairs,
  latestTick,
  connectionStatus,
  onChangeConnectionStatus,
  onOpenAI,
  onOpenJournal,
  onOpenRiskCalc,
  onOpenMt5Modal,
  onToggleAlerts,
  unreadAlertsCount,
  isAiAnalyzing,
}) => {
  const pipDecimals = selectedPair === 'USD/JPY' ? 3 : 5;
  const tickTime = new Date(latestTick.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'live':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE FEED</span>
          </span>
        );
      case 'delayed':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>DELAYED (15m)</span>
          </span>
        );
      case 'stale':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-950/80 text-orange-400 border border-orange-500/30">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span>STALE TICKS</span>
          </span>
        );
      case 'unavailable':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-500/30">
            <WifiOff className="w-3 h-3 text-rose-400" />
            <span>DISCONNECTED</span>
          </span>
        );
    }
  };

  return (
    <header className="bg-[#090d16] border-b border-slate-800 text-slate-100 select-none sticky top-0 z-40">
      <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Pair Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">ForexIQ</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-900/60 text-blue-300 rounded border border-blue-500/30">DECISION SUPPORT</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none">Non-Automated Market Analysis</p>
            </div>
          </div>

          {/* Pair Dropdown */}
          <div className="relative group">
            <select
              value={selectedPair}
              onChange={(e) => onSelectPair(e.target.value as ForexPair)}
              aria-label="Select Forex Pair"
              className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm font-bold text-white tracking-wider cursor-pointer hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availablePairs.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Live Pricing Ticker */}
          <div className="hidden sm:flex items-center space-x-4 pl-3 border-l border-slate-800 font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase leading-none">Bid</span>
              <span className="text-sm font-bold text-slate-200">{latestTick.bid.toFixed(pipDecimals)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase leading-none">Ask</span>
              <span className="text-sm font-bold text-slate-200">{latestTick.ask.toFixed(pipDecimals)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase leading-none">Spread</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-950/70 text-blue-400 border border-blue-800/40">
                {latestTick.spread.toFixed(1)} pips
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase leading-none">Tick Time</span>
              <span className="text-[11px] text-slate-400">{tickTime}</span>
            </div>

            {/* Quick Calibrate / MT5 Sync button */}
            <button
              onClick={onOpenMt5Modal}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-600/40 text-[11px] font-sans font-bold transition-all shadow-sm shadow-sky-950"
              title="Calibrate chart to MetaTrader broker quote or import MT5 candles"
            >
              <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span>Sync MT5</span>
            </button>
          </div>
        </div>

        {/* Action Controls & Utilities */}
        <div className="flex items-center space-x-2.5">
          {/* Connection State Dropdown (Allows switching to test live / delayed / stale / offline) */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 hover:opacity-90">
              {getStatusBadge()}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <div className="absolute right-0 mt-1 hidden group-hover:block bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-44 z-50">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                Simulate Feed State
              </div>
              <button
                onClick={() => onChangeConnectionStatus('live')}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 flex items-center space-x-2 text-emerald-400"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Live Feed</span>
              </button>
              <button
                onClick={() => onChangeConnectionStatus('delayed')}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 flex items-center space-x-2 text-amber-400"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Delayed Feed</span>
              </button>
              <button
                onClick={() => onChangeConnectionStatus('stale')}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 flex items-center space-x-2 text-orange-400"
              >
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <span>Stale Data</span>
              </button>
              <button
                onClick={() => onChangeConnectionStatus('unavailable')}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 flex items-center space-x-2 text-rose-400"
              >
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>Unavailable</span>
              </button>
            </div>
          </div>

          {/* AI Analysis Button */}
          <button
            onClick={onOpenAI}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
              isAiAnalyzing
                ? 'bg-purple-700 text-white animate-pulse'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-500/25'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAiAnalyzing ? 'Synthesizing...' : 'AI Analysis'}</span>
          </button>

          {/* Trade Journal & Learning Mode */}
          <button
            onClick={onOpenJournal}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            title="Paper Trading Journal & Recurring Mistake Tracker"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Journal / Paper Mode</span>
          </button>

          {/* Risk Calculator */}
          <button
            onClick={onOpenRiskCalc}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            title="Position Size & Risk Calculator"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Risk (0.5–1%)</span>
          </button>

          {/* MT5 / Live Feed Settings */}
          <button
            onClick={onOpenMt5Modal}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="Connect Real-Time MT5 / WebSocket Provider"
          >
            <Radio className="w-4 h-4 text-sky-400" />
          </button>

          {/* Alert Drawer Trigger */}
          <button
            onClick={onToggleAlerts}
            className="relative p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="Live Alert Feed"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
