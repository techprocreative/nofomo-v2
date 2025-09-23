import { useEffect, useState, useCallback } from 'react';
import { cacheService } from '../lib/services/cacheService';

export function useOfflineCache() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStats, setCacheStats] = useState(cacheService.getStats());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update cache stats periodically
    const interval = setInterval(() => {
      setCacheStats(cacheService.getStats());
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const set = useCallback(async (key: string, data: any, ttl?: number) => {
    return cacheService.set(key, data, ttl);
  }, []);

  const get = useCallback(async <T>(key: string): Promise<T | null> => {
    return cacheService.get<T>(key);
  }, []);

  const deleteCache = useCallback(async (key: string) => {
    return cacheService.delete(key);
  }, []);

  const clear = useCallback(async () => {
    return cacheService.clear();
  }, []);

  const getKeys = useCallback(async (pattern: string) => {
    return cacheService.getKeys(pattern);
  }, []);

  const preloadCommonSymbols = useCallback(async (symbols: string[]) => {
    return cacheService.preloadCommonSymbols(symbols);
  }, []);

  return {
    // Status
    isOnline,
    cacheStats,

    // Actions
    set,
    get,
    delete: deleteCache,
    clear,
    getKeys,
    preloadCommonSymbols,

    // Utilities
    isAvailable: () => typeof indexedDB !== 'undefined',
  };
}

/**
 * Hook for caching specific data types
 */
export function useCachedPrices(symbols?: string[]) {
  const { get, set, isOnline } = useOfflineCache();
  const [cachedPrices, setCachedPrices] = useState<Map<string, any>>(new Map());

  const loadCachedPrices = useCallback(async () => {
    if (!symbols) return;

    const prices = new Map();
    for (const symbol of symbols) {
      const cached = await get(`price:${symbol}`);
      if (cached) {
        prices.set(symbol, cached);
      }
    }
    setCachedPrices(prices);
  }, [symbols, get]);

  const cachePrice = useCallback(async (symbol: string, price: any) => {
    await set(`price:${symbol}`, price, 300000); // 5 minutes
    setCachedPrices(prev => new Map(prev.set(symbol, price)));
  }, [set]);

  useEffect(() => {
    loadCachedPrices();
  }, [loadCachedPrices]);

  return {
    cachedPrices,
    cachePrice,
    loadCachedPrices,
    isOnline,
  };
}

/**
 * Hook for caching OHLC data
 */
export function useCachedOHLC(symbol?: string, timeframe?: string) {
  const { get, set, isOnline } = useOfflineCache();
  const [cachedData, setCachedData] = useState<any[]>([]);

  const loadCachedOHLC = useCallback(async () => {
    if (!symbol || !timeframe) return;

    const cached = await get(`ohlc:${symbol}:${timeframe}`);
    if (cached && Array.isArray(cached)) {
      setCachedData(cached);
    }
  }, [symbol, timeframe, get]);

  const cacheOHLC = useCallback(async (data: any[]) => {
    if (!symbol || !timeframe) return;

    await set(`ohlc:${symbol}:${timeframe}`, data, 300000); // 5 minutes
    setCachedData(data);
  }, [symbol, timeframe, set]);

  useEffect(() => {
    loadCachedOHLC();
  }, [loadCachedOHLC]);

  return {
    cachedData,
    cacheOHLC,
    loadCachedOHLC,
    isOnline,
  };
}

/**
 * Hook for offline queue management
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<Array<{ id: string; action: string; data: any; timestamp: Date }>>([]);
  const { isOnline, set, get } = useOfflineCache();

  const addToQueue = useCallback((action: string, data: any) => {
    const item = {
      id: `${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      data,
      timestamp: new Date(),
    };

    setQueue(prev => [...prev, item]);

    // Persist queue
    set('offline_queue', [...queue, item], 86400000); // 24 hours
  }, [queue, set]);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const processQueue = useCallback(async () => {
    if (!isOnline || queue.length === 0) return;

    // Process queue items (would typically send to server)
    for (const item of queue) {
      try {
        // Simulate processing
        console.log('Processing queued item:', item);
        removeFromQueue(item.id);
      } catch (error) {
        console.error('Failed to process queued item:', error);
      }
    }

    // Clear persisted queue
    await set('offline_queue', [], 86400000);
  }, [isOnline, queue, removeFromQueue, set]);

  // Process queue when coming online
  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  // Load persisted queue on mount
  useEffect(() => {
    const loadQueue = async () => {
      const cached = await get('offline_queue');
      if (cached && Array.isArray(cached)) {
        setQueue(cached);
      }
    };
    loadQueue();
  }, [get]);

  return {
    queue,
    addToQueue,
    removeFromQueue,
    processQueue,
    queueLength: queue.length,
    isOnline,
  };
}

/**
 * Hook for cache size monitoring
 */
export function useCacheSize() {
  const { cacheStats } = useOfflineCache();
  const [sizeStatus, setSizeStatus] = useState<'normal' | 'warning' | 'critical'>('normal');

  useEffect(() => {
    const totalSize = cacheStats.memorySize + cacheStats.indexedDBSize;
    const maxSize = cacheService['maxMemorySize'] + cacheService['maxIndexedDBSize'];

    const usageRatio = totalSize / maxSize;

    if (usageRatio > 0.9) {
      setSizeStatus('critical');
    } else if (usageRatio > 0.7) {
      setSizeStatus('warning');
    } else {
      setSizeStatus('normal');
    }
  }, [cacheStats]);

  return {
    ...cacheStats,
    sizeStatus,
    totalSize: cacheStats.memorySize + cacheStats.indexedDBSize,
    shouldClear: sizeStatus === 'critical',
  };
}