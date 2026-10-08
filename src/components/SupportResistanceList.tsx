import React from 'react';
import { ForexPair, SRZone } from '../types/forex';
import { Layers, ArrowUp, ArrowDown, Shield, Award } from 'lucide-react';

interface SupportResistanceListProps {
  pair: ForexPair;
  currentPrice: number;
  supportZones: SRZone[];
  resistanceZones: SRZone[];
}

export const SupportResistanceList: React.FC<SupportResistanceListProps> = ({
  pair,
  currentPrice,
  supportZones,
  resistanceZones,
}) => {
  const pipMultiplier = pair === 'USD/JPY' ? 100 : 10000;
  const pipDecimals = pair === 'USD/JPY' ? 3 : 5;

  const renderZoneCard = (zone: SRZone) => {
    const pipsAway = Math.abs(currentPrice - zone.midPrice) * pipMultiplier;
    const isSupport = zone.type === 'support';

    return (
      <div
        key={zone.id}
        className={`p-2.5 rounded-lg border text-xs transition-colors ${
          isSupport
            ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
            : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-1.5 font-mono font-bold">
            <span className={isSupport ? 'text-emerald-400' : 'text-rose-400'}>
              {zone.minPrice.toFixed(pipDecimals)} – {zone.maxPrice.toFixed(pipDecimals)}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded">
              {zone.timeframe}
            </span>
          </div>

          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
              zone.confidence === 'High'
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600/40'
                : zone.confidence === 'Medium'
                ? 'bg-blue-900/60 text-blue-300 border border-blue-600/40'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {zone.confidence}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
          <span>Reactions: <strong className="text-slate-200">{zone.reactions} touches</strong></span>
          <span>Distance: <strong className="text-slate-200">{pipsAway.toFixed(1)} pips</strong></span>
          <span>Recency: <strong className="text-slate-300">{zone.recency}</strong></span>
        </div>

        <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
          {zone.reason}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-[#090d16] border border-slate-800 rounded-xl p-3.5 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">Clustered S/R Liquidity Zones</h2>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">Dynamic Clusters</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Resistance Zones */}
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider">
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Overhead Resistance (Supply)</span>
          </div>
          {resistanceZones.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">No active resistance nearby.</p>
          ) : (
            resistanceZones.map(renderZoneCard)
          )}
        </div>

        {/* Support Zones */}
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Support Clusters (Demand)</span>
          </div>
          {supportZones.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">No active support nearby.</p>
          ) : (
            supportZones.map(renderZoneCard)
          )}
        </div>
      </div>
    </div>
  );
};
