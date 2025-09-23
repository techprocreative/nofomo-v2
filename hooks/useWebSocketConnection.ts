import { useEffect, useState, useCallback } from 'react';
import { RealTimeDataService, defaultRealTimeDataConfig } from '../lib/services/realTimeDataService';
import { useConnectionStatus } from './useRealtimeState';

export function useWebSocketConnection(config = defaultRealTimeDataConfig) {
  const [service, setService] = useState<RealTimeDataService | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { connectionStatus } = useConnectionStatus();

  const initialize = useCallback(async () => {
    if (service || isInitializing) return;

    setIsInitializing(true);
    setError(null);

    try {
      const realTimeService = new RealTimeDataService(config);
      await realTimeService.initialize();
      setService(realTimeService);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize WebSocket connection');
      setError(error);
      console.error('WebSocket initialization failed:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [service, isInitializing, config]);

  const disconnect = useCallback(() => {
    if (service) {
      service.cleanup();
      setService(null);
    }
  }, [service]);

  const subscribeToPrices = useCallback((symbol: string) => {
    return service?.subscribeToPrices(symbol);
  }, [service]);

  const subscribeToDepth = useCallback((symbol: string) => {
    return service?.subscribeToDepth(symbol);
  }, [service]);

  const subscribeToOHLC = useCallback((symbol: string, timeframe: string) => {
    return service?.subscribeToOHLC(symbol, timeframe);
  }, [service]);

  const unsubscribeFromPrices = useCallback((symbol: string) => {
    service?.unsubscribeFromPrices(symbol);
  }, [service]);

  const unsubscribeFromDepth = useCallback((symbol: string) => {
    service?.unsubscribeFromDepth(symbol);
  }, [service]);

  const unsubscribeFromOHLC = useCallback((symbol: string, timeframe: string) => {
    service?.unsubscribeFromOHLC(symbol, timeframe);
  }, [service]);

  // Auto-initialize on mount if not already connected
  useEffect(() => {
    if (!service && !isInitializing && !connectionStatus.lastUpdate) {
      initialize();
    }
  }, [service, isInitializing, connectionStatus.lastUpdate, initialize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (service) {
        service.cleanup();
      }
    };
  }, [service]);

  return {
    // State
    isConnected: service?.isServiceConnected() || false,
    isInitializing,
    error,
    connectionStatus,

    // Service instance
    service,

    // Actions
    initialize,
    disconnect,
    subscribeToPrices,
    subscribeToDepth,
    subscribeToOHLC,
    unsubscribeFromPrices,
    unsubscribeFromDepth,
    unsubscribeFromOHLC,

    // Utilities
    getActiveSubscriptions: () => service?.getActiveSubscriptions() || [],
    clearAllSubscriptions: () => service?.clearAllSubscriptions(),
  };
}

/**
 * Hook for monitoring connection health
 */
export function useConnectionHealth() {
  const { connectionStatus } = useConnectionStatus();
  const [isHealthy, setIsHealthy] = useState(false);
  const [downtime, setDowntime] = useState(0);

  useEffect(() => {
    const isConnected = connectionStatus.market === 'connected' || connectionStatus.trading === 'connected';
    setIsHealthy(isConnected);

    if (!isConnected) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        setDowntime(Date.now() - startTime);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setDowntime(0);
    }
  }, [connectionStatus]);

  return {
    isHealthy,
    downtime,
    lastUpdate: connectionStatus.lastUpdate,
    status: connectionStatus,
  };
}

/**
 * Hook for automatic reconnection
 */
export function useAutoReconnect(config = defaultRealTimeDataConfig) {
  const { initialize, isConnected, error } = useWebSocketConnection(config);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    if (!isConnected && !isReconnecting && reconnectAttempts < config.maxReconnectAttempts) {
      setIsReconnecting(true);

      const delay = config.reconnectDelay * Math.pow(2, reconnectAttempts); // Exponential backoff

      const timer = setTimeout(async () => {
        try {
          await initialize();
          setReconnectAttempts(0); // Reset on success
        } catch (err) {
          setReconnectAttempts(prev => prev + 1);
          console.warn(`Reconnect attempt ${reconnectAttempts + 1} failed:`, err);
        } finally {
          setIsReconnecting(false);
        }
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [isConnected, isReconnecting, reconnectAttempts, initialize, config]);

  return {
    isReconnecting,
    reconnectAttempts,
    maxAttempts: config.maxReconnectAttempts,
    canReconnect: reconnectAttempts < config.maxReconnectAttempts,
  };
}