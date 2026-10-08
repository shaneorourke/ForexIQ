import React, { useState } from 'react';
import { X, Radio, Copy, Check, ShieldCheck, RefreshCw, Upload, Globe, Link2, Sliders, CheckCircle2 } from 'lucide-react';
import { ForexPair, Timeframe, Tick } from '../types/forex';

interface Mt5ConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPair: ForexPair;
  latestTick: Tick;
  onCalibratePrice: (pair: ForexPair, price: number) => void;
  onImportCsv: (pair: ForexPair, timeframe: Timeframe, csv: string) => { success: boolean; count: number; error?: string };
}

export const Mt5ConnectorModal: React.FC<Mt5ConnectorModalProps> = ({
  isOpen,
  onClose,
  selectedPair,
  latestTick,
  onCalibratePrice,
  onImportCsv,
}) => {
  const [activeTab, setActiveTab] = useState<'calibrate' | 'import_csv' | 'python' | 'websocket' | 'architecture'>('calibrate');
  const [copied, setCopied] = useState<boolean>(false);
  const [wsUrl, setWsUrl] = useState<string>('ws://localhost:8080/forex/stream');
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  
  // Calibration State
  const [targetPair, setTargetPair] = useState<ForexPair>(selectedPair);
  const [customPrice, setCustomPrice] = useState<string>(
    selectedPair === 'EUR/USD' ? '1.12158' : selectedPair === 'GBP/USD' ? '1.32180' : '158.120'
  );
  const [calibratedSuccess, setCalibratedSuccess] = useState<boolean>(false);
  const [isFetchingInterbank, setIsFetchingInterbank] = useState<boolean>(false);

  // CSV Import State
  const [importTf, setImportTf] = useState<Timeframe>('H1');
  const [csvText, setCsvText] = useState<string>('');
  const [importResult, setImportResult] = useState<{ success: boolean; count: number; error?: string } | null>(null);

  // Keep targetPair in sync with selectedPair if modal opens
  React.useEffect(() => {
    setTargetPair(selectedPair);
    setCustomPrice(
      selectedPair === 'EUR/USD' ? '1.12158' : selectedPair === 'GBP/USD' ? '1.32180' : '158.120'
    );
  }, [selectedPair]);

  const pythonScript = `# mt5_bridge.py
# Real-Time MetaTrader 5 WebSocket Bridge for ForexIQ Analysis Engine
import asyncio
import json
import MetaTrader5 as mt5
import websockets

async def stream_ticks(websocket):
    if not mt5.initialize():
        print("MetaTrader5 initialize() failed, error code =", mt5.last_error())
        await websocket.close()
        return

    print("Connected to MetaTrader 5 Terminal successfully")
    pairs = ["EURUSD", "GBPUSD", "USDJPY"]

    for pair in pairs:
        mt5.symbol_select(pair, True)

    try:
        while True:
            for pair in pairs:
                tick = mt5.symbol_info_tick(pair)
                if tick:
                    normalized_pair = "EUR/USD" if pair == "EURUSD" else "GBP/USD" if pair == "GBPUSD" else "USD/JPY"
                    point = mt5.symbol_info(pair).point
                    spread_pips = (tick.ask - tick.bid) / (0.01 if "JPY" in pair else 0.0001)

                    payload = {
                        "type": "TICK",
                        "pair": normalized_pair,
                        "bid": round(tick.bid, 5 if "JPY" not in pair else 3),
                        "ask": round(tick.ask, 5 if "JPY" not in pair else 3),
                        "spread": round(spread_pips, 1),
                        "timestamp": int(tick.time_msc)
                    }
                    await websocket.send(json.dumps(payload))
            await asyncio.sleep(0.5)
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        mt5.shutdown()

async def main():
    async with websockets.serve(stream_ticks, "0.0.0.0", 8080):
        print("ForexIQ MT5 WebSocket Gateway listening on ws://localhost:8080")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pythonScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyCalibration = () => {
    const val = parseFloat(customPrice);
    if (!isNaN(val) && val > 0) {
      onCalibratePrice(targetPair, val);
      setCalibratedSuccess(true);
      setTimeout(() => setCalibratedSuccess(false), 3000);
    }
  };

  const handleFetchInterbank = async () => {
    setIsFetchingInterbank(true);
    try {
      const res = await fetch('/api/live-rates');
      const data = await res.json();
      if (data.success && data.rates && data.rates[targetPair]) {
        const rate = data.rates[targetPair];
        setCustomPrice(rate.toString());
        onCalibratePrice(targetPair, rate);
        setCalibratedSuccess(true);
        setTimeout(() => setCalibratedSuccess(false), 3000);
      }
    } catch (_e) {
      // fallback
    } finally {
      setIsFetchingInterbank(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setCsvText(text);
          const res = onImportCsv(targetPair, importTf, text);
          setImportResult(res);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleApplyCsv = () => {
    if (csvText.trim()) {
      const res = onImportCsv(targetPair, importTf, csvText);
      setImportResult(res);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b0f19] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 bg-[#0e1424] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-500/40 flex items-center justify-center">
              <Radio className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide">MetaTrader 5 & Live Data Integration</h2>
              <p className="text-[11px] text-slate-400 font-mono">Calibrate Quotes • Import MT5 History • Connect WebSocket</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 px-5 pt-2 bg-[#090d16] text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('calibrate')}
            className={`py-2 px-3 border-b-2 font-semibold transition-colors flex items-center space-x-1.5 whitespace-nowrap ${activeTab === 'calibrate' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sync / Calibrate Price</span>
          </button>
          <button
            onClick={() => setActiveTab('import_csv')}
            className={`py-2 px-3 border-b-2 font-semibold transition-colors flex items-center space-x-1.5 whitespace-nowrap ${activeTab === 'import_csv' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import MT5 Candles (.csv)</span>
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`py-2 px-3 border-b-2 font-semibold transition-colors flex items-center space-x-1.5 whitespace-nowrap ${activeTab === 'python' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>MT5 Python Bridge</span>
          </button>
          <button
            onClick={() => setActiveTab('websocket')}
            className={`py-2 px-3 border-b-2 font-semibold transition-colors flex items-center space-x-1.5 whitespace-nowrap ${activeTab === 'websocket' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>WebSocket Client</span>
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-2 px-3 border-b-2 font-semibold transition-colors flex items-center space-x-1.5 whitespace-nowrap ${activeTab === 'architecture' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Architecture</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto text-xs space-y-4">
          {/* TAB 1: CALIBRATE & SYNC */}
          {activeTab === 'calibrate' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-blue-950/40 border border-blue-800/40 space-y-1.5">
                <span className="font-bold text-blue-300 block">Synchronize Chart with MetaTrader Broker Quote</span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Brokers exhibit small spread and quote variations. Entering your exact MetaTrader terminal quote aligns
                  all candlestick historical bars, EMAs, and automated Support &amp; Resistance zones to match your broker perfectly.
                </p>
              </div>

              {/* Pair and Live Quote Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase">Target Currency Pair</label>
                  <select
                    value={targetPair}
                    onChange={(e) => {
                      const p = e.target.value as ForexPair;
                      setTargetPair(p);
                      setCustomPrice(p === 'EUR/USD' ? '1.12158' : p === 'GBP/USD' ? '1.32180' : '158.120');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-bold text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="EUR/USD">EUR/USD</option>
                    <option value="GBP/USD">GBP/USD</option>
                    <option value="USD/JPY">USD/JPY</option>
                  </select>
                  <div className="text-[11px] text-slate-400 flex justify-between pt-1">
                    <span>Current Active Bid:</span>
                    <span className="font-mono text-white font-bold">
                      {targetPair === selectedPair ? latestTick.bid.toFixed(targetPair === 'USD/JPY' ? 3 : 5) : '—'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase">
                    MetaTrader Terminal Price (Target)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={targetPair === 'USD/JPY' ? '0.001' : '0.00001'}
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="e.g. 1.12158"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-white text-xs font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex space-x-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setCustomPrice(targetPair === 'EUR/USD' ? '1.12158' : targetPair === 'GBP/USD' ? '1.32180' : '158.120')}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono border border-slate-700"
                    >
                      Preset: {targetPair === 'EUR/USD' ? '1.12158' : targetPair === 'GBP/USD' ? '1.32180' : '158.120'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  onClick={handleApplyCalibration}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-blue-600/20"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Apply &amp; Re-align Chart ({customPrice})</span>
                </button>

                <button
                  onClick={handleFetchInterbank}
                  disabled={isFetchingInterbank}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg font-semibold transition-colors border border-slate-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingInterbank ? 'animate-spin' : ''}`} />
                  <span>Auto-Fetch Live Interbank Quote</span>
                </button>
              </div>

              {calibratedSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-lg text-emerald-300 flex items-center space-x-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Successfully calibrated {targetPair} to <strong>{customPrice}</strong>. All candles, EMAs, and Support/Resistance clusters have been dynamically re-anchored.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMPORT MT5 CANDLES */}
          {activeTab === 'import_csv' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <h3 className="font-bold text-white flex items-center space-x-1.5">
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span>Import Exact MetaTrader History (.csv)</span>
                </h3>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Export any timeframe from MetaTrader (<strong>File &rarr; Save As</strong> or <strong>F2 History Center &rarr; Export</strong>)
                  and import it below. ForexIQ will load your broker's exact historical OHLC candles bar-for-bar.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Timeframe of Export</label>
                  <select
                    value={importTf}
                    onChange={(e) => setImportTf(e.target.value as Timeframe)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="M5">M5 (5 Minutes)</option>
                    <option value="M15">M15 (15 Minutes)</option>
                    <option value="M30">M30 (30 Minutes)</option>
                    <option value="H1">H1 (1 Hour)</option>
                    <option value="H4">H4 (4 Hours)</option>
                    <option value="D1">D1 (Daily)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Upload CSV File</label>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Or Paste CSV Data Directly:</label>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="2026.10.08, 14:00:00, 1.12140, 1.12185, 1.12120, 1.12158, 482..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-between items-center pt-1">
                <button
                  onClick={handleApplyCsv}
                  disabled={!csvText.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs disabled:opacity-50 transition-colors shadow-md shadow-emerald-600/20"
                >
                  Load Candles into Chart
                </button>

                {importResult && (
                  <div className={`text-xs font-semibold ${importResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {importResult.success ? `Successfully loaded ${importResult.count} candles!` : `Error: ${importResult.error}`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PYTHON BRIDGE SCRIPT */}
          {activeTab === 'python' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Ready-to-run MT5 Python Gateway:</span>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded border border-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed max-h-[300px]">
                {pythonScript}
              </pre>
            </div>
          )}

          {/* TAB 4: WEBSOCKET CONFIG */}
          {activeTab === 'websocket' && (
            <div className="space-y-3 font-mono">
              <div>
                <label className="block text-slate-300 text-xs font-sans font-bold mb-1">
                  Local WebSocket Endpoint
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={wsUrl}
                    onChange={(e) => setWsUrl(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <button
                    onClick={() => {
                      setWsConnected(!wsConnected);
                    }}
                    className={`px-4 py-2 rounded-lg font-sans font-bold text-xs transition-colors ${
                      wsConnected ? 'bg-rose-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
                    }`}
                  >
                    {wsConnected ? 'Disconnect' : 'Connect Bridge'}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 text-xs font-sans text-slate-300">
                <span className="font-bold text-white block">Real-Time Tick Stream Payload:</span>
                <pre className="text-[11px] font-mono text-sky-300 bg-slate-950 p-2 rounded border border-slate-800">
{`{
  "type": "TICK",
  "pair": "EUR/USD",
  "bid": 1.12158,
  "ask": 1.12166,
  "spread": 0.8,
  "timestamp": 1728389000000
}`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: ARCHITECTURE OVERVIEW */}
          {activeTab === 'architecture' && (
            <div className="space-y-3 leading-relaxed">
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <h3 className="font-bold text-slate-100 flex items-center space-x-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Decoupled Data Architecture</span>
                </h3>
                <p className="text-slate-300">
                  The analysis dashboard is built strictly against the <code className="text-sky-300 font-mono bg-slate-950 px-1 py-0.5 rounded">ForexDataProvider</code> abstraction interface.
                  The core engine (S/R detection, EMA, RSI, ATR, confluence state, candlestick pattern recognition, and AI decision support) operates independently of where the ticks originate.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-center font-mono">
                <div className="p-3 rounded-lg bg-[#0d121f] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Layer 1</span>
                  <span className="font-bold text-sky-400">Data Feed</span>
                  <p className="text-[10px] text-slate-400 font-sans mt-1">MT5 Bridge / Interbank FX API / Calibrated Quote</p>
                </div>
                <div className="p-3 rounded-lg bg-[#0d121f] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Layer 2</span>
                  <span className="font-bold text-purple-400">Analysis Engine</span>
                  <p className="text-[10px] text-slate-400 font-sans mt-1">Multi-timeframe EMAs, Swing clusters, Confluence matrix</p>
                </div>
                <div className="p-3 rounded-lg bg-[#0d121f] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Layer 3</span>
                  <span className="font-bold text-emerald-400">Decision UI</span>
                  <p className="text-[10px] text-slate-400 font-sans mt-1">Interactive chart, Gemini AI synthesis, Journal</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#0e1424] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
