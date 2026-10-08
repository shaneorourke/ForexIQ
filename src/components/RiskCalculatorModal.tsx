import React, { useState } from 'react';
import { ForexPair } from '../types/forex';
import { Calculator, X, Shield, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pair: ForexPair;
  suggestedStopPips?: number;
}

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({
  isOpen,
  onClose,
  pair,
  suggestedStopPips = 20,
}) => {
  const [balance, setBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [stopLossPips, setStopLossPips] = useState<number>(suggestedStopPips || 20);

  if (!isOpen) return null;

  // Approximate pip value for 1 standard lot (100,000 units)
  const pipValuePerLot = pair === 'USD/JPY' ? 6.55 : 10.0;

  const dollarRisk = balance * (riskPercent / 100);
  const totalPips = Math.max(1, stopLossPips);
  const rawStandardLots = dollarRisk / (totalPips * pipValuePerLot);
  const standardLots = Number(rawStandardLots.toFixed(2));
  const miniLots = Number((rawStandardLots * 10).toFixed(1));
  const microLots = Math.round(rawStandardLots * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b0f19] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 bg-[#0e1424] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center">
              <Calculator className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide">Position Size & Risk Calculator</h2>
              <p className="text-[11px] text-slate-400 font-mono">{pair} • Institutional Risk Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Account Balance */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Account Equity / Balance ($ USD)
            </label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(Math.max(100, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Risk Percentage Quick Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold">
                Risk Per Trade (% of Account)
              </label>
              <span className="font-mono text-emerald-400 font-bold">{riskPercent}%</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0.5, 1.0, 1.5, 2.0].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setRiskPercent(pct)}
                  className={`py-1.5 rounded-lg font-mono font-bold transition-all ${
                    riskPercent === pct
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Professional benchmark: <strong>0.5%–1.0%</strong>. Never risk &gt;2% on a single idea.
            </p>
          </div>

          {/* Stop Distance in Pips */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Structural Stop Loss Distance (Pips)
            </label>
            <input
              type="number"
              value={stopLossPips}
              onChange={(e) => setStopLossPips(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Calculated based on swing low/high + 1.5x ATR buffer. Never compress stop to fit a bigger position.
            </p>
          </div>

          {/* Output Cards */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-medium">Total Maximum Dollar Risk:</span>
              <span className="text-base font-extrabold font-mono text-rose-400">
                ${dollarRisk.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Standard Lots</span>
                <span className="text-sm font-bold text-emerald-400">{standardLots}</span>
                <span className="text-[9px] text-slate-500 block">100k units</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Mini Lots</span>
                <span className="text-sm font-bold text-emerald-400">{miniLots}</span>
                <span className="text-[9px] text-slate-500 block">10k units</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Micro Lots</span>
                <span className="text-sm font-bold text-emerald-400">{microLots}</span>
                <span className="text-[9px] text-slate-500 block">1k units</span>
              </div>
            </div>
          </div>

          {/* Educational Principle Notice */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-start space-x-2 text-[11px] text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block">Capital Preservation Discipline:</strong>
              Risking 1% per trade requires 100 consecutive full losses to blow an account. Risking 5% requires only 20. Strict sizing eliminates emotional panic during inevitable drawdown streaks.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#0e1424] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Close Calculator
          </button>
        </div>
      </div>
    </div>
  );
};
