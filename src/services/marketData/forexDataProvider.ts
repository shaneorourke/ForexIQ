import { ForexPair, Timeframe, Candle, Tick, ConnectionStatus } from '../../types/forex';

export type TickCallback = (tick: Tick) => void;
export type CandleCallback = (pair: ForexPair, timeframe: Timeframe, candle: Candle) => void;
export type StatusCallback = (status: ConnectionStatus) => void;

export interface ForexDataProvider {
  id: string;
  name: string;
  description: string;
  status: ConnectionStatus;
  
  connect(): Promise<void>;
  disconnect(): void;
  getStatus(): ConnectionStatus;
  
  subscribeTicks(callback: TickCallback): () => void;
  subscribeCandleUpdates(callback: CandleCallback): () => void;
  subscribeStatus(callback: StatusCallback): () => void;
  
  getCandles(pair: ForexPair, timeframe: Timeframe): Promise<Candle[]>;
  getLatestTick(pair: ForexPair): Tick;
  getAvailablePairs(): ForexPair[];
}
