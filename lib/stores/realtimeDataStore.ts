import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { PriceTick, OHLCData, MarketDepth, TradingSignal } from '../types';

interface RealTimeDataState {
  // Price data
  prices: Map<string, PriceTick>;
  ohlcData: Map<string, Map<string, OHLCData[]>>;
  marketDepth: Map<string, MarketDepth>;

  // Trading data
  positions: any[];
  orders: any[];
  signals: TradingSignal[];

  // Connection status
  connectionStatus: {
    market: 'connected' | 'connecting' | 'disconnected' | 'error';
    trading: 'connected' | 'connecting' | 'disconnected' | 'error';
    lastUpdate: Date | null;
  };

  // Actions
  updatePrice: (symbol: string, tick: PriceTick) => void;
  updateOHLC: (symbol: string, timeframe: string, data: OHLCData[]) => void;
  updateDepth: (symbol: string, depth: MarketDepth) => void;
  updatePositions: (positions: any[]) => void;
  updateOrders: (orders: any[]) => void;
  updateSignals: (signals: TradingSignal[]) => void;
  setConnectionStatus: (type: 'market' | 'trading', status: 'connected' | 'connecting' | 'disconnected' | 'error') => void;

  // Bulk operations
  batchUpdate: (updates: Partial<Pick<RealTimeDataState, 'prices' | 'ohlcData' | 'marketDepth' | 'positions' | 'orders' | 'signals'>>) => void;

  // Cleanup
  clearSymbolData: (symbol: string) => void;
  clearAllData: () => void;
}

export const useRealtimeDataStore = create<RealTimeDataState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    prices: new Map(),
    ohlcData: new Map(),
    marketDepth: new Map(),
    positions: [],
    orders: [],
    signals: [],
    connectionStatus: {
      market: 'disconnected',
      trading: 'disconnected',
      lastUpdate: null,
    },

    // Price update
    updatePrice: (symbol: string, tick: PriceTick) => {
      set((state) => {
        const newPrices = new Map(state.prices);
        newPrices.set(symbol, tick);
        return {
          prices: newPrices,
          connectionStatus: {
            ...state.connectionStatus,
            lastUpdate: new Date(),
          },
        };
      });
    },

    // OHLC data update
    updateOHLC: (symbol: string, timeframe: string, data: OHLCData[]) => {
      set((state) => {
        const newOHLCData = new Map(state.ohlcData);
        const symbolData = newOHLCData.get(symbol) || new Map();
        symbolData.set(timeframe, data);
        newOHLCData.set(symbol, symbolData);

        return {
          ohlcData: newOHLCData,
          connectionStatus: {
            ...state.connectionStatus,
            lastUpdate: new Date(),
          },
        };
      });
    },

    // Market depth update
    updateDepth: (symbol: string, depth: MarketDepth) => {
      set((state) => {
        const newDepth = new Map(state.marketDepth);
        newDepth.set(symbol, depth);

        return {
          marketDepth: newDepth,
          connectionStatus: {
            ...state.connectionStatus,
            lastUpdate: new Date(),
          },
        };
      });
    },

    // Positions update
    updatePositions: (positions: any[]) => {
      set((state) => ({
        positions,
        connectionStatus: {
          ...state.connectionStatus,
          lastUpdate: new Date(),
        },
      }));
    },

    // Orders update
    updateOrders: (orders: any[]) => {
      set((state) => ({
        orders,
        connectionStatus: {
          ...state.connectionStatus,
          lastUpdate: new Date(),
        },
      }));
    },

    // Signals update
    updateSignals: (signals: TradingSignal[]) => {
      set((state) => ({
        signals,
        connectionStatus: {
          ...state.connectionStatus,
          lastUpdate: new Date(),
        },
      }));
    },

    // Connection status
    setConnectionStatus: (type: 'market' | 'trading', status: 'connected' | 'connecting' | 'disconnected' | 'error') => {
      set((state) => ({
        connectionStatus: {
          ...state.connectionStatus,
          [type]: status,
          lastUpdate: type === 'market' || type === 'trading' ? new Date() : state.connectionStatus.lastUpdate,
        },
      }));
    },

    // Batch update
    batchUpdate: (updates) => {
      set((state) => ({
        ...updates,
        connectionStatus: {
          ...state.connectionStatus,
          lastUpdate: new Date(),
        },
      }));
    },

    // Clear symbol data
    clearSymbolData: (symbol: string) => {
      set((state) => {
        const newPrices = new Map(state.prices);
        const newOHLCData = new Map(state.ohlcData);
        const newDepth = new Map(state.marketDepth);

        newPrices.delete(symbol);
        newOHLCData.delete(symbol);
        newDepth.delete(symbol);

        return {
          prices: newPrices,
          ohlcData: newOHLCData,
          marketDepth: newDepth,
        };
      });
    },

    // Clear all data
    clearAllData: () => {
      set(() => ({
        prices: new Map(),
        ohlcData: new Map(),
        marketDepth: new Map(),
        positions: [],
        orders: [],
        signals: [],
        connectionStatus: {
          market: 'disconnected',
          trading: 'disconnected',
          lastUpdate: null,
        },
      }));
    },
  }))
);