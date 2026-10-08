import React, { useState, useEffect } from 'react';
import { EconomicEvent, ForexPair } from '../types/forex';
import { Calendar, AlertTriangle, Clock, RefreshCw, Zap } from 'lucide-react';

interface EconomicCalendarPanelProps {
  events: EconomicEvent[];
  selectedPair: ForexPair;
  onRefresh?: () => void;
}

export const EconomicCalendarPanel: React.FC<EconomicCalendarPanelProps> = ({
  events,
  selectedPair,
  onRefresh,
}) => {
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Update countdown clock every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const relevantCurrencies = selectedPair.split('/');

  // Filter events relevant to pair or high-impact globally
  const relevantEvents = events.filter(
    e => relevantCurrencies.includes(e.currency) || e.importance === 'HIGH'
  );

  const formatCountdown = (timestamp: number) => {
    const diffMs = timestamp - currentTime;
    if (diffMs <= 0) return 'Released';
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 60) return `${diffMins}m away`;
    const diffHours = Math.floor(diffMins / 60);
    const remMins = diffMins % 60;
    return `${diffHours}h ${remMins}m away`;
  };

  const imminentEvent = events.find(
    e => e.importance === 'HIGH' && e.timestamp > currentTime && e.timestamp - currentTime <= 45 * 60 * 1000
  );

  return (
    <div className="bg-[#090d16] border border-slate-800 rounded-xl p-3.5 shadow-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">Macroeconomic Calendar</h2>
        </div>
        <span className="text-[11px] font-mono text-slate-400">Pair Currencies ({relevantCurrencies.join(', ')})</span>
      </div>

      {/* Imminent High-Impact Warning Banner */}
      {imminentEvent && (
        <div className="p-3 rounded-lg bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/60 border border-amber-500/50 text-amber-300 text-xs flex items-start space-x-2.5 shadow-lg shadow-amber-950/40 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-extrabold text-amber-200 uppercase tracking-wide flex items-center space-x-1.5">
              <span>⚠ HIGH-IMPACT EVENT:</span>
              <span className="text-white">{imminentEvent.title}</span>
              <span className="text-amber-400 font-mono">({formatCountdown(imminentEvent.timestamp)})</span>
            </div>
            <p className="mt-0.5 text-slate-300 leading-snug">
              Tier-1 volatility event approaching. Do not attempt to predict the news number. Professional risk management mandates widening stops or waiting for the initial post-release spike to settle before seeking clean structure.
            </p>
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-mono">
              <th className="py-1.5 px-2">Time / Count</th>
              <th className="py-1.5 px-2">Ccy</th>
              <th className="py-1.5 px-2">Impact</th>
              <th className="py-1.5 px-2">Event</th>
              <th className="py-1.5 px-2 text-right">Previous</th>
              <th className="py-1.5 px-2 text-right">Forecast</th>
              <th className="py-1.5 px-2 text-right">Actual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 font-mono">
            {relevantEvents.map((evt) => {
              const isUrgent = evt.importance === 'HIGH' && evt.timestamp > currentTime && evt.timestamp - currentTime <= 60 * 60 * 1000;

              return (
                <tr
                  key={evt.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isUrgent ? 'bg-amber-950/20' : ''
                  }`}
                >
                  <td className="py-2 px-2 text-slate-300 whitespace-nowrap">
                    <span className="font-semibold">{evt.time}</span>
                    <span className="block text-[10px] text-amber-400/90">{formatCountdown(evt.timestamp)}</span>
                  </td>
                  <td className="py-2 px-2">
                    <span className="font-bold px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded text-[10px]">
                      {evt.currency}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        evt.importance === 'HIGH'
                          ? 'bg-rose-950 text-rose-300 border border-rose-600/40'
                          : 'bg-amber-950 text-amber-300 border border-amber-600/40'
                      }`}
                    >
                      {evt.importance}
                    </span>
                  </td>
                  <td className="py-2 px-2 font-sans font-medium text-slate-200">
                    <div>{evt.title}</div>
                    {evt.impactNote && (
                      <span className="text-[10px] text-slate-400 block font-normal">{evt.impactNote}</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-400">{evt.previous}</td>
                  <td className="py-2 px-2 text-right text-slate-300 font-semibold">{evt.forecast}</td>
                  <td className="py-2 px-2 text-right">
                    {evt.actual ? (
                      <span className="font-bold text-emerald-400">{evt.actual}</span>
                    ) : (
                      <span className="text-slate-500 italic">Pending</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
