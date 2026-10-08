import React, { useState } from 'react';
import { AIAnalysisResult, ForexPair } from '../types/forex';
import {
  BrainCircuit,
  Sparkles,
  HelpCircle,
  Send,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Compass,
  TrendingUp,
  Layers,
  Clock
} from 'lucide-react';

interface AIAnalysisPanelProps {
  pair: ForexPair;
  aiData: AIAnalysisResult | null;
  isLoading: boolean;
  onRefresh: (customQuestion?: string) => void;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  pair,
  aiData,
  isLoading,
  onRefresh,
}) => {
  const [userQuery, setUserQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'synthesis' | 'all13' | 'scenarios'>('synthesis');

  const handleSendQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || isLoading) return;
    onRefresh(userQuery.trim());
    setUserQuery('');
  };

  const questionLabels = [
    { key: 'q1_htf_trend', num: 1, title: 'Higher-Timeframe Trend (D1, H4)', icon: TrendingUp },
    { key: 'q2_support_zones', num: 2, title: 'Important Support Zones', icon: Layers },
    { key: 'q3_resistance_zones', num: 3, title: 'Important Resistance Zones', icon: Layers },
    { key: 'q4_trend_or_range', num: 4, title: 'Trending vs Ranging Status', icon: Compass },
    { key: 'q5_h1_context', num: 5, title: 'H1 Intraday Structure Context', icon: Clock },
    { key: 'q6_m15_context', num: 6, title: 'M15 Execution Timeframe State', icon: Clock },
    { key: 'q7_bullish_confluence', num: 7, title: 'Bullish Confluence Evidence', icon: CheckCircle },
    { key: 'q8_bearish_confluence', num: 8, title: 'Bearish Confluence Evidence', icon: AlertTriangle },
    { key: 'q9_bullish_confirmation', num: 9, title: 'Bullish Confirmation Requirement', icon: CheckCircle },
    { key: 'q10_bullish_invalidation', num: 10, title: 'Bullish Invalidation Boundary', icon: AlertTriangle },
    { key: 'q11_bearish_confirmation', num: 11, title: 'Bearish Confirmation Requirement', icon: CheckCircle },
    { key: 'q12_upcoming_events', num: 12, title: 'Upcoming High-Impact News Events', icon: Clock },
    { key: 'q13_watch_next', num: 13, title: 'What the User Should Watch Next', icon: Lightbulb },
  ];

  return (
    <div className="bg-[#090d16] border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-purple-900/60 border border-purple-500/40 flex items-center justify-center">
            <BrainCircuit className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center space-x-1.5">
              <span>AI Market Interpretation & Decision Support</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-purple-950 text-purple-300 rounded border border-purple-800/60">
                Gemini 3.8 Flash
              </span>
            </h2>
            <p className="text-xs text-slate-400">Grounded in computed technical metrics • No hallucinated data</p>
          </div>
        </div>

        <button
          onClick={() => onRefresh()}
          disabled={isLoading}
          className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Analyzing...' : 'Re-Analyze'}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('synthesis')}
          className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
            activeTab === 'synthesis' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Executive Synthesis
        </button>
        <button
          onClick={() => setActiveTab('all13')}
          className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
            activeTab === 'all13' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          The 13 Core Questions
        </button>
        <button
          onClick={() => setActiveTab('scenarios')}
          className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
            activeTab === 'scenarios' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Bull vs Bear Scenarios
        </button>
      </div>

      {/* Content based on Active Tab */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Synthesizing top-down forex structure and volume order flow...</p>
        </div>
      ) : aiData ? (
        <div className="space-y-3.5">
          {/* TAB 1: EXECUTIVE SYNTHESIS */}
          {activeTab === 'synthesis' && (
            <div className="space-y-3">
              {/* Executive Summary Card */}
              <div className="p-3.5 rounded-lg bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                      Current Institutional Thesis
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    State: <strong className="text-purple-400">{aiData.marketState}</strong>
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {aiData.executiveSummary}
                </p>
              </div>

              {/* Key Quick Takeaways Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-lg bg-[#0c121e] border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Bullish Confirmation Needed</span>
                  </div>
                  <p className="text-slate-300 leading-snug">{aiData.answers.q9_bullish_confirmation}</p>
                </div>

                <div className="p-3 rounded-lg bg-[#0c121e] border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-rose-400 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Invalidation Boundary</span>
                  </div>
                  <p className="text-slate-300 leading-snug">{aiData.answers.q10_bullish_invalidation}</p>
                </div>
              </div>

              {/* Immediate Watch Guidance */}
              <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30 text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-blue-300 font-bold">
                  <Lightbulb className="w-4 h-4 text-blue-400" />
                  <span>Immediate Tactical Observation</span>
                </div>
                <p className="text-slate-200 leading-relaxed">{aiData.answers.q13_watch_next}</p>
              </div>

              {/* Educational Golden Rule */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 italic flex items-start space-x-2">
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200 not-italic block mb-0.5">Trader Mindset Note:</strong>
                  {aiData.educationalNote}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: THE 13 CORE QUESTIONS */}
          {activeTab === 'all13' && (
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {questionLabels.map(({ key, num, title, icon: Icon }) => {
                const answerText = (aiData.answers as any)[key] || 'No specific data provided.';
                return (
                  <div key={key} className="p-2.5 rounded-lg bg-[#0d131f] border border-slate-800/90 text-xs">
                    <div className="flex items-center space-x-2 text-slate-200 font-semibold mb-1">
                      <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-300 text-[10px] font-mono flex items-center justify-center border border-purple-800/50">
                        {num}
                      </span>
                      <Icon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{title}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-7 text-[11px] font-sans">
                      {answerText}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: BULL VS BEAR SCENARIOS */}
          {activeTab === 'scenarios' && (
            <div className="space-y-3 text-xs">
              {/* Bullish Scenario Card */}
              <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/40 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Bullish Scenario (If / Then)</span>
                </div>
                <div className="space-y-1.5 text-slate-200">
                  <p><strong className="text-emerald-300">Trigger Condition:</strong> {aiData.bullishScenario.ifCondition}</p>
                  <p><strong className="text-emerald-300">Confirmation:</strong> {aiData.bullishScenario.confirmationTrigger}</p>
                  <p><strong className="text-rose-400">Invalidation:</strong> {aiData.bullishScenario.invalidationLevel}</p>
                  <p className="text-slate-400 text-[11px]"><strong className="text-slate-300">Target Area:</strong> {aiData.bullishScenario.probableContinuation}</p>
                </div>
              </div>

              {/* Bearish Scenario Card */}
              <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/40 space-y-2">
                <div className="flex items-center space-x-2 text-rose-400 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Bearish Scenario (If / Then)</span>
                </div>
                <div className="space-y-1.5 text-slate-200">
                  <p><strong className="text-rose-300">Trigger Condition:</strong> {aiData.bearishScenario.ifCondition}</p>
                  <p><strong className="text-rose-300">Confirmation:</strong> {aiData.bearishScenario.confirmationTrigger}</p>
                  <p><strong className="text-emerald-400">Invalidation:</strong> {aiData.bearishScenario.invalidationLevel}</p>
                  <p className="text-slate-400 text-[11px]"><strong className="text-slate-300">Target Area:</strong> {aiData.bearishScenario.probableContinuation}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-slate-400">
          Click "AI Analysis" to synthesize current market structure.
        </div>
      )}

      {/* Interactive Question Input */}
      <form onSubmit={handleSendQuestion} className="flex items-center space-x-2 pt-2 border-t border-slate-800">
        <input
          type="text"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder={`Ask AI trading mentor about ${pair} structure, invalidation, or volume...`}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={!userQuery.trim() || isLoading}
          className="p-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg transition-colors"
          title="Send query"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
