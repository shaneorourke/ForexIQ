import React from 'react';
import { AlertNotification } from '../types/forex';
import { Bell, X, Check, Trash2, ArrowUpRight, ArrowDownRight, AlertTriangle, Info } from 'lucide-react';

interface AlertDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertNotification[];
  onClearAlerts: () => void;
}

export const AlertDrawer: React.FC<AlertDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onClearAlerts,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#0b0f19] border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 animate-slide-left">
      {/* Header */}
      <div className="p-4 bg-[#0e1424] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <h2 className="font-bold text-sm tracking-wide">Real-Time Market Alerts</h2>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-950 text-amber-300 rounded border border-amber-600/40">
            {alerts.length}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {alerts.length > 0 && (
            <button
              onClick={onClearAlerts}
              className="text-slate-400 hover:text-rose-400 p-1"
              title="Clear all alerts"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Alert Feed */}
      <div className="p-4 flex-1 overflow-y-auto space-y-2.5 text-xs">
        {alerts.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-1">
            <Bell className="w-6 h-6 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-400">No active alerts</p>
            <p className="text-[11px] text-slate-500">Alerts fire dynamically when price interacts with S/R zones or forms high-volume rejections.</p>
          </div>
        ) : (
          alerts.map((al) => {
            const time = new Date(al.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            return (
              <div
                key={al.id}
                className={`p-3 rounded-xl border space-y-1 transition-all ${
                  al.severity === 'bullish'
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : al.severity === 'bearish'
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : al.severity === 'warning'
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold flex items-center space-x-1">
                    {al.severity === 'bullish' ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    ) : al.severity === 'bearish' ? (
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span className="text-slate-200">{al.title}</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">{time}</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-snug">
                  {al.message}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-[#0e1424] border-t border-slate-800 text-[10px] text-slate-400 text-center">
        Alerts are advisory notifications only. ForexIQ never places trades automatically.
      </div>
    </div>
  );
};
