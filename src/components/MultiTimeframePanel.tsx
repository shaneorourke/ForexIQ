import React from 'react';
import { Timeframe, TimeframeAnalysis } from '../types/forex';
import { ArrowDownRight, ArrowUpRight, Minus, TrendingDown, TrendingUp, Zap } from 'lucide-react';

interface MultiTimeframePanelProps {
  timeframes: Record<string, TimeframeAnalysis>;
  activeTimeframe: Timeframe;
  onSelectTimeframe: (tf: Timeframe) => void;
}

export const MultiTimeframePanel: React.FC<MultiTimeframePanelProps> = ({
  timeframes,
  activeTimeframe,
  onSelectTimeframe,
}) => {
  const tfOrder: { tf: Timeframe; role: string; description: string }[] = [
    { tf: 'D1', role: 'Macro Trend', description: 'Institutional regime & major liquidity boundaries' },
    { tf: 'H4', role: 'Primary Bias', description: 'Directional benchmark for swing orientation (EMA 50/200)' },
    { tf: 'H1', role: 'Current Structure', description: 'Interday swing highs/lows & pullback depth' },
    { tf: 'M15', role: 'Entry / Confirmation', description: 'Execution triggers, rejection wicks & volume confirmation' },
  ];

  return (
    <div className="bg-[#090d16] border border-slate-800 rounded-xl p-3.5 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-slate-100 tracking-wide">Multi-Timeframe Architecture</h2>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">D1 → H4 → H1 → M15</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {tfOrder.map(({ tf, role, description }) => {
          const data = timeframes[tf];
          if (!data) return null;

          const isBullishEma = data.ema50 > data.ema200;
          const isSelected = activeTimeframe === tf;

          return (
            <div
              key={tf}
              onClick={() => onSelectTimeframe(tf)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900/90 border-blue-500 shadow-md shadow-blue-500/10'
                  : 'bg-[#0d121e]/80 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm text-white font-mono">{tf}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{role}</span>
                </div>
                {/* Bias Badge */}
                <span
                  className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                    isBullishEma
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {isBullishEma ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{isBullishEma ? 'BULLISH' : 'BEARISH'}</span>
                </span>
              </div>

              {/* Description */}
              <p className="text-[10px] text-slate-400 mb-2.5 leading-snug">{description}</p>

              {/* Data Rows */}
              <div className="space-y-1.5 text-xs font-mono">
                {/* EMA 50 / 200 */}
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">EMA 50 / 200</span>
                  <span className={isBullishEma ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {data.ema50.toFixed(4)} / {data.ema200.toFixed(4)}
                  </span>
                </div>

                {/* Market Structure */}
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">Structure</span>
                  <span className="text-slate-200 font-medium">
                    {data.structure === 'bullish' ? 'HH / HL (Demand)' : data.structure === 'bearish' ? 'LH / LL (Supply)' : 'Consolidation'}
                  </span>
                </div>

                {/* RSI 14 */}
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">RSI 14</span>
                  <div className="flex items-center space-x-1">
                    <span className={data.rsi14 >= 70 ? 'text-rose-400' : data.rsi14 <= 30 ? 'text-emerald-400' : 'text-slate-200'}>
                      {data.rsi14.toFixed(1)}
                    </span>
                    {data.hasRsiDivergence && (
                      <span className="text-[9px] px-1 bg-amber-900/60 text-amber-300 rounded border border-amber-600/40">
                        DIV
                      </span>
                    )}
                  </div>
                </div>

                {/* ATR 14 Volatility */}
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">ATR 14</span>
                  <span className="text-slate-200">
                    {data.atrPips} pips
                  </span>
                </div>

                {/* Tick Volume Status */}
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">Tick Vol</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      data.volumeStatus === 'Elevated'
                        ? 'bg-blue-900/60 text-blue-300 border border-blue-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {data.volumeStatus} ({(data.volumeRatio * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Active Patterns if any */}
              {data.patterns && data.patterns.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] text-slate-400 mb-1">Detected Formations:</div>
                  <div className="flex flex-wrap gap-1">
                    {data.patterns.map((p, idx) => (
                      <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-slate-800/90 text-slate-300 rounded border border-slate-700">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
