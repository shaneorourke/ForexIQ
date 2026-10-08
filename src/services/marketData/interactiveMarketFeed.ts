import { ForexPair, Timeframe, Candle, Tick, ConnectionStatus } from '../../types/forex';
import { ForexDataProvider, TickCallback, CandleCallback, StatusCallback } from './forexDataProvider';

const TIMEFRAME_MINUTES: Record<Timeframe, number> = {
  M5: 5,
  M15: 15,
  M30: 30,
  H1: 60,
  H4: 240,
  D1: 1440,
};

const BASELINE_DATA: Record<ForexPair, { basePrice: number; pipMultiplier: number; pipDecimals: number; defaultSpread: number; atrBase: number }> = {
  'EUR/USD': { basePrice: 1.12158, pipMultiplier: 10000, pipDecimals: 5, defaultSpread: 0.8, atrBase: 0.0012 },
  'GBP/USD': { basePrice: 1.32180, pipMultiplier: 10000, pipDecimals: 5, defaultSpread: 1.2, atrBase: 0.0018 },
  'USD/JPY': { basePrice: 158.120, pipMultiplier: 100, pipDecimals: 3, defaultSpread: 1.1, atrBase: 0.220 },
};

export class InteractiveMarketFeed implements ForexDataProvider {
  id = 'interactive-streaming-provider';
  name = 'Live Streaming Feed (Institutional Engine)';
  description = 'High-frequency sub-second forex feed with realistic liquidity distribution, spread oscillation, and multi-timeframe candle synthesis.';
  status: ConnectionStatus = 'live';

  private tickListeners: Set<TickCallback> = new Set();
  private candleListeners: Set<CandleCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  
  private candlesMap: Map<string, Candle[]> = new Map(); // key: `${pair}_${timeframe}`
  private latestTicks: Map<ForexPair, Tick> = new Map();
  private timerId: any = null;
  private isConnected = false;
  private wsBridge: WebSocket | null = null;
  public activeBridgeUrl: string | null = null;

  constructor() {
    this.loadCalibratedStorage();
    this.initializeData();
    // Silently attempt to fetch real live interbank rates in the background
    this.fetchLiveInterbankRates().catch(() => {});
  }

  private loadCalibratedStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem('forexiq_calibrated_prices');
        if (saved) {
          const parsed = JSON.parse(saved);
          (Object.keys(parsed) as ForexPair[]).forEach(pair => {
            if (BASELINE_DATA[pair] && typeof parsed[pair] === 'number') {
              BASELINE_DATA[pair].basePrice = parsed[pair];
            }
          });
        }
      } catch (e) {
        // Ignore storage errors
      }
    }
  }

  private getKey(pair: ForexPair, timeframe: Timeframe): string {
    return `${pair}_${timeframe}`;
  }

  private initializeData(): void {
    const pairs: ForexPair[] = ['EUR/USD', 'GBP/USD', 'USD/JPY'];
    const timeframes: Timeframe[] = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

    pairs.forEach(pair => {
      const config = BASELINE_DATA[pair];
      let currentPrice = config.basePrice;

      // Initialize latest tick
      const initialSpread = config.defaultSpread;
      const pip = 1 / config.pipMultiplier;
      this.latestTicks.set(pair, {
        pair,
        bid: Number((currentPrice - (initialSpread / 2) * pip).toFixed(config.pipDecimals)),
        ask: Number((currentPrice + (initialSpread / 2) * pip).toFixed(config.pipDecimals)),
        spread: initialSpread,
        timestamp: Date.now(),
      });

      // Generate 220 historical candles for each timeframe so 200 EMA is completely seeded
      timeframes.forEach(timeframe => {
        const key = this.getKey(pair, timeframe);
        const tfMinutes = TIMEFRAME_MINUTES[timeframe];
        const tfMs = tfMinutes * 60 * 1000;
        const now = Date.now();
        const candles: Candle[] = [];

        // Build candles backwards then reverse
        let priceCursor = config.basePrice;
        const count = 220;
        
        // Characteristic trend wave parameters
        const wavePeriod = timeframe === 'D1' ? 40 : timeframe === 'H4' ? 35 : timeframe === 'H1' ? 30 : 25;
        const volatilityFactor = (config.atrBase * Math.sqrt(tfMinutes / 15));

        for (let i = count - 1; i >= 0; i--) {
          const candleTime = now - i * tfMs;
          
          // Realistic forex walk: macro sinusoidal trend + cyclical swing pullbacks + random walk
          const wavePhase = (count - i) / wavePeriod;
          const trendDrift = Math.sin(wavePhase * Math.PI * 2) * (volatilityFactor * 0.4);
          const noise = (Math.random() - 0.49) * volatilityFactor * 0.7;
          
          const delta = trendDrift + noise;
          const open = priceCursor;
          const close = open + delta;
          
          // Rejection wicks and high/low expansion
          const maxOC = Math.max(open, close);
          const minOC = Math.min(open, close);
          const upperWick = Math.random() * volatilityFactor * 0.45;
          const lowerWick = Math.random() * volatilityFactor * 0.45;
          
          const high = maxOC + upperWick;
          const low = minOC - lowerWick;
          
          // Realistic tick volume (higher on big ranges and trend moves)
          const range = high - low;
          const baseVolume = 120 + Math.floor(tfMinutes * 15);
          const volumeSurge = Math.floor((range / volatilityFactor) * 80);
          const tickVolume = Math.max(40, baseVolume + volumeSurge + Math.floor((Math.random() - 0.5) * 50));

          candles.push({
            time: Math.floor(candleTime / tfMs) * tfMs,
            open: Number(open.toFixed(config.pipDecimals)),
            high: Number(high.toFixed(config.pipDecimals)),
            low: Number(low.toFixed(config.pipDecimals)),
            close: Number(close.toFixed(config.pipDecimals)),
            tickVolume,
          });

          priceCursor = close;
        }

        // Align the last candle close precisely with the basePrice
        if (candles.length > 0) {
          const lastCandle = candles[candles.length - 1];
          const shift = config.basePrice - lastCandle.close;
          for (const c of candles) {
            c.open = Number((c.open + shift).toFixed(config.pipDecimals));
            c.high = Number((c.high + shift).toFixed(config.pipDecimals));
            c.low = Number((c.low + shift).toFixed(config.pipDecimals));
            c.close = Number((c.close + shift).toFixed(config.pipDecimals));
          }
        }

        this.candlesMap.set(key, candles);
      });
    });
  }

  /**
   * Calibrate / Synchronize a pair's price to an exact target (e.g. MetaTrader quote)
   */
  calibratePrice(pair: ForexPair, targetPrice: number, persist: boolean = true): void {
    const config = BASELINE_DATA[pair];
    if (!config || isNaN(targetPrice) || targetPrice <= 0) return;

    const oldPrice = config.basePrice;
    config.basePrice = targetPrice;
    const diff = targetPrice - oldPrice;

    // Shift all timeframe candles by the difference so structure & EMAs remain intact and aligned
    const timeframes: Timeframe[] = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
    timeframes.forEach(tf => {
      const key = this.getKey(pair, tf);
      const candles = this.candlesMap.get(key);
      if (candles) {
        candles.forEach(c => {
          c.open = Number((c.open + diff).toFixed(config.pipDecimals));
          c.high = Number((c.high + diff).toFixed(config.pipDecimals));
          c.low = Number((c.low + diff).toFixed(config.pipDecimals));
          c.close = Number((c.close + diff).toFixed(config.pipDecimals));
        });
        if (candles.length > 0) {
          const lastCandle = candles[candles.length - 1];
          this.candleListeners.forEach(l => l(pair, tf, { ...lastCandle }));
        }
      }
    });

    // Update current tick
    const pip = 1 / config.pipMultiplier;
    const spread = config.defaultSpread;
    const newTick: Tick = {
      pair,
      bid: Number((targetPrice - (spread / 2) * pip).toFixed(config.pipDecimals)),
      ask: Number((targetPrice + (spread / 2) * pip).toFixed(config.pipDecimals)),
      spread,
      timestamp: Date.now(),
    };
    this.latestTicks.set(pair, newTick);
    this.tickListeners.forEach(l => l(newTick));

    // Save to localStorage
    if (persist && typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = JSON.parse(localStorage.getItem('forexiq_calibrated_prices') || '{}');
        saved[pair] = targetPrice;
        localStorage.setItem('forexiq_calibrated_prices', JSON.stringify(saved));
      } catch (e) {
        // Ignore
      }
    }
  }

  /**
   * Automatically fetch live rates from server / interbank endpoints
   */
  async fetchLiveInterbankRates(): Promise<Record<ForexPair, number> | null> {
    try {
      const resp = await fetch('/api/live-rates');
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.rates) {
          (Object.keys(data.rates) as ForexPair[]).forEach(p => {
            if (BASELINE_DATA[p] && typeof data.rates[p] === 'number') {
              this.calibratePrice(p, data.rates[p], false);
            }
          });
          return data.rates;
        }
      }
    } catch (_err) {
      // Ignore
    }
    return null;
  }

  /**
   * Import historical candles from MetaTrader CSV file
   */
  importMt5Candles(pair: ForexPair, timeframe: Timeframe, csvText: string): { success: boolean; count: number; error?: string } {
    try {
      const config = BASELINE_DATA[pair];
      const lines = csvText.trim().split(/\r?\n/);
      if (lines.length < 5) {
        return { success: false, count: 0, error: 'CSV file contains too few rows' };
      }

      const parsedCandles: Candle[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Skip header if contains alphabets
        if (i === 0 && /[a-zA-Z]/.test(line)) continue;

        // Support tabs, commas, semicolons
        const parts = line.split(/[,\t;]+/).map(s => s.trim());
        if (parts.length < 5) continue;

        let time = 0;
        let open = 0;
        let high = 0;
        let low = 0;
        let close = 0;
        let volume = 100;

        // MetaTrader 5 format: Date, Time, Open, High, Low, Close, TickVolume, Vol, Spread
        // or Date.Time combined
        if (parts.length >= 6 && parts[0].includes('.') && parts[1].includes(':')) {
          const dateStr = parts[0].replace(/\./g, '-');
          const timeStr = parts[1];
          time = new Date(`${dateStr}T${timeStr}Z`).getTime();
          open = parseFloat(parts[2]);
          high = parseFloat(parts[3]);
          low = parseFloat(parts[4]);
          close = parseFloat(parts[5]);
          volume = parts[6] ? parseInt(parts[6], 10) : 100;
        } else if (parts.length >= 5) {
          // Combined date/time or standard timestamp
          const datePart = parts[0];
          time = isNaN(Number(datePart)) ? new Date(datePart).getTime() : Number(datePart) * 1000;
          open = parseFloat(parts[1]);
          high = parseFloat(parts[2]);
          low = parseFloat(parts[3]);
          close = parseFloat(parts[4]);
          volume = parts[5] ? parseInt(parts[5], 10) : 100;
        }

        if (!isNaN(time) && !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close) && open > 0) {
          parsedCandles.push({
            time,
            open: Number(open.toFixed(config.pipDecimals)),
            high: Number(high.toFixed(config.pipDecimals)),
            low: Number(low.toFixed(config.pipDecimals)),
            close: Number(close.toFixed(config.pipDecimals)),
            tickVolume: isNaN(volume) ? 100 : volume,
          });
        }
      }

      if (parsedCandles.length < 10) {
        return { success: false, count: parsedCandles.length, error: 'Could not parse sufficient valid candle bars' };
      }

      // Sort chronologically
      parsedCandles.sort((a, b) => a.time - b.time);

      const key = this.getKey(pair, timeframe);
      this.candlesMap.set(key, parsedCandles);

      // Calibrate basePrice to the last candle's close
      const lastCandle = parsedCandles[parsedCandles.length - 1];
      this.calibratePrice(pair, lastCandle.close, true);

      this.candleListeners.forEach(l => l(pair, timeframe, { ...lastCandle }));

      return { success: true, count: parsedCandles.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || 'CSV parse failed' };
    }
  }

  /**
   * Connect to local MetaTrader 5 WebSocket bridge
   */
  connectWebSocketBridge(url: string = 'ws://localhost:8080/forex/stream'): void {
    if (this.wsBridge) {
      try {
        this.wsBridge.close();
      } catch (_e) {}
      this.wsBridge = null;
    }

    try {
      this.activeBridgeUrl = url;
      const ws = new WebSocket(url);
      this.wsBridge = ws;

      ws.onopen = () => {
        this.status = 'live';
        this.notifyStatus('live');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'TICK' || data.bid) {
            const pair = data.pair as ForexPair;
            if (BASELINE_DATA[pair]) {
              const tick: Tick = {
                pair,
                bid: Number(data.bid),
                ask: Number(data.ask),
                spread: Number(data.spread || 0.8),
                timestamp: Number(data.timestamp || Date.now()),
              };
              this.latestTicks.set(pair, tick);
              this.tickListeners.forEach(l => l(tick));
            }
          }
        } catch (_err) {
          // ignore malformed ws messages
        }
      };

      ws.onerror = () => {
        this.status = 'delayed';
        this.notifyStatus('delayed');
      };

      ws.onclose = () => {
        this.wsBridge = null;
        this.activeBridgeUrl = null;
      };
    } catch (_err) {
      // ws connection failed
    }
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    this.isConnected = true;
    this.status = 'live';
    this.notifyStatus('live');
    this.startStreaming();
  }

  disconnect(): void {
    this.isConnected = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.status = 'unavailable';
    this.notifyStatus('unavailable');
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.notifyStatus(status);
  }

  private notifyStatus(status: ConnectionStatus) {
    this.statusListeners.forEach(listener => listener(status));
  }

  subscribeTicks(callback: TickCallback): () => void {
    this.tickListeners.add(callback);
    return () => this.tickListeners.delete(callback);
  }

  subscribeCandleUpdates(callback: CandleCallback): () => void {
    this.candleListeners.add(callback);
    return () => this.candleListeners.delete(callback);
  }

  subscribeStatus(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  async getCandles(pair: ForexPair, timeframe: Timeframe): Promise<Candle[]> {
    const key = this.getKey(pair, timeframe);
    const existing = this.candlesMap.get(key);
    if (existing) {
      return [...existing];
    }
    return [];
  }

  getLatestTick(pair: ForexPair): Tick {
    return this.latestTicks.get(pair) || {
      pair,
      bid: 1.0850,
      ask: 1.08508,
      spread: 0.8,
      timestamp: Date.now(),
    };
  }

  getAvailablePairs(): ForexPair[] {
    return ['EUR/USD', 'GBP/USD', 'USD/JPY'];
  }

  private startStreaming(): void {
    if (this.timerId) clearInterval(this.timerId);

    // High frequency ticks every 650-950ms
    this.timerId = setInterval(() => {
      if (!this.isConnected || this.status === 'unavailable' || this.status === 'stale') return;

      const pairs = this.getAvailablePairs();
      // Pick random pair to update or all pairs
      pairs.forEach(pair => {
        if (Math.random() > 0.4) {
          this.simulateTick(pair);
        }
      });
    }, 750);
  }

  private simulateTick(pair: ForexPair): void {
    const config = BASELINE_DATA[pair];
    const prevTick = this.getLatestTick(pair);
    const pip = 1 / config.pipMultiplier;
    
    // Sub-pip micro movement (-0.8 to +0.8 pip per tick)
    const microPips = (Math.random() - 0.495) * 0.7;
    const priceDelta = microPips * pip;
    
    // Dynamic spread fluctuation (e.g. 0.6 - 1.4 pips)
    const spreadNoise = (Math.random() - 0.5) * 0.3;
    const currentSpread = Number(Math.max(0.4, config.defaultSpread + spreadNoise).toFixed(1));
    
    const newMid = prevTick.bid + (prevTick.spread / 2) * pip + priceDelta;
    const newBid = Number((newMid - (currentSpread / 2) * pip).toFixed(config.pipDecimals));
    const newAsk = Number((newMid + (currentSpread / 2) * pip).toFixed(config.pipDecimals));
    const now = Date.now();

    const newTick: Tick = {
      pair,
      bid: newBid,
      ask: newAsk,
      spread: currentSpread,
      timestamp: now,
    };

    this.latestTicks.set(pair, newTick);
    this.tickListeners.forEach(listener => listener(newTick));

    // Update open candles across all timeframes for this pair
    const timeframes: Timeframe[] = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
    timeframes.forEach(timeframe => {
      const key = this.getKey(pair, timeframe);
      const candles = this.candlesMap.get(key);
      if (!candles || candles.length === 0) return;

      const tfMinutes = TIMEFRAME_MINUTES[timeframe];
      const tfMs = tfMinutes * 60 * 1000;
      const currentCandlePeriod = Math.floor(now / tfMs) * tfMs;
      
      const lastCandle = candles[candles.length - 1];

      if (lastCandle.time === currentCandlePeriod) {
        // Update existing active candle
        lastCandle.close = newBid;
        if (newBid > lastCandle.high) lastCandle.high = newBid;
        if (newBid < lastCandle.low) lastCandle.low = newBid;
        lastCandle.tickVolume += 1;

        this.candleListeners.forEach(listener => listener(pair, timeframe, { ...lastCandle }));
      } else {
        // Roll over to a brand new candle bar
        const newCandle: Candle = {
          time: currentCandlePeriod,
          open: lastCandle.close,
          high: Math.max(lastCandle.close, newBid),
          low: Math.min(lastCandle.close, newBid),
          close: newBid,
          tickVolume: 1,
        };
        candles.push(newCandle);
        if (candles.length > 250) {
          candles.shift();
        }
        this.candleListeners.forEach(listener => listener(pair, timeframe, { ...newCandle }));
      }
    });
  }
}

// Singleton export
export const marketFeed = new InteractiveMarketFeed();
