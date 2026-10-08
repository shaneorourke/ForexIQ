import React from 'react';
import { ConfluenceReport } from '../services/analysis/confluenceEngine';
import { ConfluenceState } from '../types/forex';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldCheck,
  Target,
  XCircle,
  Zap
} from 'lucide-react';

interface ConfluencePanelProps {
  report: ConfluenceReport;
  currentPrice: number;
}

export const ConfluencePanel: React.FC<ConfluencePanelProps> = ({ report, currentPrice }) => {
  const { state, stateExplanation, bullishChecks, bearishChecks, bullishScenario, bearishScenario, illustrativeSetup, upcomingNewsWarning } = report;

  const getStateStyle = (st: ConfluenceState) => {
    switch (st) {
      case 'CONFIRMED':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/30';
      case 'DEVELOPING':
        return 'bg-blue-950/80 text-blue-400 border-blue-500/40 ring-1 ring-blue-500/30';
      case 'WATCH':
        return 'bg-amber-950/80 text-amber-400 border-amber-500/40 ring-1 ring-amber-500/30';
      case 'INVALIDATED':
        return 'bg-rose-950/80 text-rose-400 border-rose-500/40 ring-1 ring-rose-500/30';
      case 'NO SETUP':
      default:
        return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="bg-[#090d16] border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header & Qualitative Setup State Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Confluence Engine & Evidence Matrix</h2>
          </div>
          <p className="text-xs text-slate-400">Qualitative multi-variable evaluation • No predictive probabilities</p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium">SETUP STATE:</span>
          <span className={`px-3 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider border ${getStateStyle(state)}`}>
            {state}
          </span>
        </div>
      </div>

      {/* State Explanation Banner */}
      <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start space-x-2.5">
        <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-100 font-semibold block mb-0.5">Status Rationale:</strong>
          {stateExplanation}
        </div>
      </div>

      {/* Imminent News Alert Warning Banner if present */}
      {upcomingNewsWarning && (
        <div className="p-3 rounded-lg bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs flex items-start space-x-2.5 shadow-lg shadow-amber-950/30 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-300 uppercase tracking-wide">
              ⚠ High-Impact Economic Event Approaching: {upcomingNewsWarning.title}
            </div>
            <p className="mt-0.5 text-amber-200/90 leading-snug">
              Scheduled {upcomingNewsWarning.currency} release. Spreads typically widen significantly and technical levels may experience liquidity sweeps. Technical setups are downgraded to <strong>WATCH</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Confluence Checklists Grid: Bullish vs Bearish */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bullish Confluence Checklist */}
        <div className="bg-[#0c121e] border border-slate-800/90 rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <ArrowUpRight className="w-4 h-4" />
              <span>Bullish Confluence Evidence</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-950/60 text-emerald-300 rounded border border-emerald-500/30">
              {bullishChecks.filter(c => c.passed).length} / {bullishChecks.length} Factors
            </span>
          </div>

          <div className="space-y-2">
            {bullishChecks.map((item) => (
              <div key={item.id} className="flex items-start space-x-2 text-xs">
                {item.direction === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : item.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className={`font-semibold ${item.passed ? 'text-slate-100' : 'text-slate-400'}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    {item.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bearish Confluence Checklist */}
        <div className="bg-[#0c121e] border border-slate-800/90 rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <ArrowDownRight className="w-4 h-4" />
              <span>Bearish Confluence Evidence</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-rose-950/60 text-rose-300 rounded border border-rose-500/30">
              {bearishChecks.filter(c => c.passed).length} / {bearishChecks.length} Factors
            </span>
          </div>

          <div className="space-y-2">
            {bearishChecks.map((item) => (
              <div key={item.id} className="flex items-start space-x-2 text-xs">
                {item.direction === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : item.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className={`font-semibold ${item.passed ? 'text-slate-100' : 'text-slate-400'}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    {item.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scenarios: Both Possibilities Always Evaluated */}
      <div className="space-y-2.5 pt-1">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Independent Scenario Mapping</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Bullish Scenario */}
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-1.5 text-xs">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <ArrowUpRight className="w-4 h-4" />
              <span>{bullishScenario.title}</span>
            </div>
            <p className="text-slate-300"><strong className="text-emerald-300">Condition:</strong> {bullishScenario.ifCondition}</p>
            <p className="text-slate-300"><strong className="text-emerald-300">Confirmation Trigger:</strong> {bullishScenario.confirmationTrigger}</p>
            <p className="text-slate-300"><strong className="text-rose-400">Invalidation Level:</strong> {bullishScenario.invalidationLevel}</p>
            <p className="text-slate-400 text-[11px]"><strong className="text-slate-300">Outcome:</strong> {bullishScenario.plausibleOutcome}</p>
          </div>

          {/* Bearish Scenario */}
          <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 space-y-1.5 text-xs">
            <div className="flex items-center space-x-1.5 text-rose-400 font-bold">
              <ArrowDownRight className="w-4 h-4" />
              <span>{bearishScenario.title}</span>
            </div>
            <p className="text-slate-300"><strong className="text-rose-300">Condition:</strong> {bearishScenario.ifCondition}</p>
            <p className="text-slate-300"><strong className="text-rose-300">Confirmation Trigger:</strong> {bearishScenario.confirmationTrigger}</p>
            <p className="text-slate-300"><strong className="text-emerald-400">Invalidation Level:</strong> {bearishScenario.invalidationLevel}</p>
            <p className="text-slate-400 text-[11px]"><strong className="text-slate-300">Outcome:</strong> {bearishScenario.plausibleOutcome}</p>
          </div>
        </div>
      </div>

      {/* Illustrative Trade Structure & R:R Calculator */}
      <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Illustrative Trade Structure (Educational Only)
            </h3>
          </div>
          <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/30 font-semibold">
            NOT AN ORDER • STUDY AID
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-[#0b0f18] border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Direction</span>
            <span className={`font-bold ${illustrativeSetup.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {illustrativeSetup.direction}
            </span>
          </div>

          <div className="p-2 rounded bg-[#0b0f18] border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Invalidation Level</span>
            <span className="font-bold text-rose-400">
              {illustrativeSetup.invalidationLevel.toFixed(4)} ({illustrativeSetup.stopDistancePips} pips)
            </span>
          </div>

          <div className="p-2 rounded bg-[#0b0f18] border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Target 1 (R:R)</span>
            <span className="font-bold text-emerald-400">
              {illustrativeSetup.target1.toFixed(4)} (1:{illustrativeSetup.riskReward1})
            </span>
          </div>

          <div className="p-2 rounded bg-[#0b0f18] border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Target 2 (R:R)</span>
            <span className="font-bold text-emerald-300">
              {illustrativeSetup.target2.toFixed(4)} (1:{illustrativeSetup.riskReward2})
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed italic">
          <strong className="text-slate-300 not-italic">Technical Rationale:</strong> {illustrativeSetup.rationale}
        </p>
      </div>
    </div>
  );
};
