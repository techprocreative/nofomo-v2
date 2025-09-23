import { useEffect, useCallback, useRef, useState } from 'react';
import { eventEmitterService, EventData, EventSubscription } from '../lib/services/eventEmitterService';

export function useEventBus() {
  const subscriptionsRef = useRef<EventSubscription[]>([]);

  const emit = useCallback((type: string, payload?: any, source?: string) => {
    eventEmitterService.emit(type, payload, source);
  }, []);

  const on = useCallback((type: string, callback: (event: EventData) => void) => {
    const subscription = eventEmitterService.on(type, callback);
    subscriptionsRef.current.push(subscription);
    return subscription;
  }, []);

  const onMultiple = useCallback((types: string[], callback: (event: EventData) => void) => {
    const subscription = eventEmitterService.onMultiple(types, callback);
    subscriptionsRef.current.push(subscription);
    return subscription;
  }, []);

  const unsubscribe = useCallback((subscriptionId: string) => {
    eventEmitterService.unsubscribe(subscriptionId);
    subscriptionsRef.current = subscriptionsRef.current.filter(sub => sub.id !== subscriptionId);
  }, []);

  // Domain-specific emitters
  const emitMarketData = useCallback((eventType: string, symbol: string, data: any) => {
    eventEmitterService.emitMarketData(eventType, symbol, data);
  }, []);

  const emitTradingData = useCallback((eventType: string, data: any) => {
    eventEmitterService.emitTradingData(eventType, data);
  }, []);

  const emitUIEvent = useCallback((eventType: string, data: any) => {
    eventEmitterService.emitUIEvent(eventType, data);
  }, []);

  const emitConnectionEvent = useCallback((status: 'connected' | 'disconnected' | 'error', details?: any) => {
    eventEmitterService.emitConnectionEvent(status, details);
  }, []);

  const emitSignalEvent = useCallback((signalType: 'new' | 'update' | 'expired', signal: any) => {
    eventEmitterService.emitSignalEvent(signalType, signal);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(subscription => {
        subscription.unsubscribe();
      });
      subscriptionsRef.current = [];
    };
  }, []);

  return {
    emit,
    on,
    onMultiple,
    unsubscribe,
    emitMarketData,
    emitTradingData,
    emitUIEvent,
    emitConnectionEvent,
    emitSignalEvent,
    getSubscriptions: () => eventEmitterService.getSubscriptions(),
    getEventStats: () => eventEmitterService.getEventStats(),
  };
}

/**
 * Hook for subscribing to specific event types
 */
export function useEventSubscription(type: string, callback: (event: EventData) => void, enabled = true) {
  const subscriptionRef = useRef<EventSubscription | null>(null);

  useEffect(() => {
    if (enabled && !subscriptionRef.current) {
      subscriptionRef.current = eventEmitterService.on(type, callback);
    } else if (!enabled && subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [type, callback, enabled]);

  return subscriptionRef.current;
}

/**
 * Hook for subscribing to market data events
 */
export function useMarketDataEvents(symbol?: string, enabled = true) {
  const eventsRef = useRef<EventData[]>([]);

  const handleMarketEvent = useCallback((event: EventData) => {
    if (!symbol || (event.payload && event.payload.symbol === symbol)) {
      eventsRef.current.push(event);
      // Keep only last 10 events
      if (eventsRef.current.length > 10) {
        eventsRef.current.shift();
      }
    }
  }, [symbol]);

  useEventSubscription('market:*', handleMarketEvent, enabled);

  return eventsRef.current;
}

/**
 * Hook for subscribing to connection events
 */
export function useConnectionEvents(enabled = true) {
  const [connectionStatus, setConnectionStatus] = useState<{
    type: 'connected' | 'disconnected' | 'error';
    timestamp: Date;
    details?: any;
  } | null>(null);

  const handleConnectionEvent = useCallback((event: EventData) => {
    if (event.type.startsWith('connection:')) {
      const status = event.type.split(':')[1] as 'connected' | 'disconnected' | 'error';
      setConnectionStatus({
        type: status,
        timestamp: event.timestamp,
        details: event.payload,
      });
    }
  }, []);

  useEventSubscription('connection:*', handleConnectionEvent, enabled);

  return connectionStatus;
}

/**
 * Hook for subscribing to trading events
 */
export function useTradingEvents(enabled = true) {
  const eventsRef = useRef<EventData[]>([]);

  const handleTradingEvent = useCallback((event: EventData) => {
    eventsRef.current.push(event);
    // Keep only last 20 events
    if (eventsRef.current.length > 20) {
      eventsRef.current.shift();
    }
  }, []);

  useEventSubscription('trading:*', handleTradingEvent, enabled);

  return eventsRef.current;
}

/**
 * Hook for subscribing to signal events
 */
export function useSignalEvents(enabled = true) {
  const [latestSignal, setLatestSignal] = useState<any>(null);

  const handleSignalEvent = useCallback((event: EventData) => {
    setLatestSignal(event.payload);
  }, []);

  useEventSubscription('signal:*', handleSignalEvent, enabled);

  return latestSignal;
}

// Re-export for convenience
export { eventEmitterService };