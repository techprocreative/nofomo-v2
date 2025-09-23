import { useRealtimeDataStore } from '../lib/stores/realtimeDataStore';
import { useEffect, useState } from 'react';

export function useRealtimeState() {
  const store = useRealtimeDataStore();

  return {
    // Price data
    prices: store.prices,
    ohlcData: store.ohlcData,
    marketDepth: store.marketDepth,

    // Trading data
    positions: store.positions,
    orders: store.orders,
    signals: store.signals,

    // Connection status
    connectionStatus: store.connectionStatus,

    // Actions
    updatePrice: store.updatePrice,
    updateOHLC: store.updateOHLC,
    updateDepth: store.updateDepth,
    updatePositions: store.updatePositions,
    updateOrders: store.updateOrders,
    updateSignals: store.updateSignals,
    setConnectionStatus: store.setConnectionStatus,
    batchUpdate: store.batchUpdate,
    clearSymbolData: store.clearSymbolData,
    clearAllData: store.clearAllData,
  };
}

/**
 * Hook for getting real-time price data for specific symbols
 */
export function useRealtimePrices(symbols?: string[]) {
  const { prices, updatePrice } = useRealtimeDataStore();
  const [filteredPrices, setFilteredPrices] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (!symbols) {
      setFilteredPrices(prices);
      return;
    }

    const filtered = new Map();
    symbols.forEach(symbol => {
      const price = prices.get(symbol);
      if (price) {
        filtered.set(symbol, price);
      }
    });
    setFilteredPrices(filtered);
  }, [prices, symbols]);

  return { prices: filteredPrices, updatePrice };
}

/**
 * Hook for getting OHLC data for specific symbols and timeframes
 */
export function useRealtimeOHLC(symbol?: string, timeframe?: string) {
  const { ohlcData, updateOHLC } = useRealtimeDataStore();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!symbol || !timeframe) {
      setData([]);
      return;
    }

    const symbolData = ohlcData.get(symbol);
    const timeframeData = symbolData?.get(timeframe) || [];
    setData(timeframeData);
  }, [ohlcData, symbol, timeframe]);

  return { data, updateOHLC };
}

/**
 * Hook for connection status monitoring
 */
export function useConnectionStatus() {
  const { connectionStatus, setConnectionStatus } = useRealtimeDataStore();

  return {
    connectionStatus,
    setConnectionStatus,
    isConnected: connectionStatus.market === 'connected' || connectionStatus.trading === 'connected',
    lastUpdate: connectionStatus.lastUpdate,
  };
}

/**
 * Hook for real-time signals
 */
export function useRealtimeSignals() {
  const { signals, updateSignals } = useRealtimeDataStore();

  return { signals, updateSignals };
}

/**
 * Hook for real-time positions
 */
export function useRealtimePositions() {
  const { positions, updatePositions } = useRealtimeDataStore();

  return { positions, updatePositions };
}