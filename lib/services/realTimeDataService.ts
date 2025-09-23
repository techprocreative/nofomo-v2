import { Observable, Subject, timer } from 'rxjs';
import { retry, retryWhen, delay, take, concatMap } from 'rxjs/operators';
import { PriceTick, WebSocketConnection } from '../types';
import { MarketDataWebSocketService } from './market-data-websocket';
import { MT5WebSocketClient } from './mt5-websocket-client';
import { cacheService } from './cacheService';
import { eventEmitterService } from './eventEmitterService';
import { useRealtimeDataStore } from '../stores/realtimeDataStore';

export interface RealTimeDataConfig {
  marketWebSocketUrl: string;
  mt5Host: string;
  mt5Port: number;
  mt5Account: string;
  mt5Password: string;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
}

export interface StreamSubscription {
  id: string;
  symbol: string;
  type: 'price' | 'depth' | 'ohlc';
  active: boolean;
  unsubscribe: () => void;
}

export class RealTimeDataService {
  private marketWebSocket: MarketDataWebSocketService;
  private mt5Client: MT5WebSocketClient | null = null;
  private config: RealTimeDataConfig;
  private subscriptions = new Map<string, StreamSubscription>();
  private dataSubject = new Subject<any>();
  private connectionSubject = new Subject<'connected' | 'disconnected' | 'error'>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor(config: RealTimeDataConfig) {
    this.config = config;
    this.marketWebSocket = new MarketDataWebSocketService();

    this.setupEventHandlers();
    this.preloadCommonSymbols();
  }

  private setupEventHandlers(): void {
    // Market WebSocket events
    this.marketWebSocket.on('connected', (connectionId) => {
      console.log(`Market WebSocket connected: ${connectionId}`);
      this.isConnected = true;
      this.connectionSubject.next('connected');
      eventEmitterService.emitConnectionEvent('connected', { type: 'market', connectionId });
      useRealtimeDataStore.getState().setConnectionStatus('market', 'connected');
    });

    this.marketWebSocket.on('disconnected', (connectionId) => {
      console.log(`Market WebSocket disconnected: ${connectionId}`);
      this.isConnected = false;
      this.connectionSubject.next('disconnected');
      eventEmitterService.emitConnectionEvent('disconnected', { type: 'market', connectionId });
      useRealtimeDataStore.getState().setConnectionStatus('market', 'disconnected');
      this.scheduleReconnect();
    });

    this.marketWebSocket.on('priceUpdate', ({ connectionId, symbol, tick }) => {
      this.handlePriceUpdate(symbol, tick);
    });

    this.marketWebSocket.on('depthUpdate', ({ connectionId, symbol, depth }) => {
      this.handleDepthUpdate(symbol, depth);
    });

    // MT5 events would be handled similarly if integrated
  }

  /**
   * Initialize the real-time data service
   */
  async initialize(): Promise<void> {
    try {
      // Create market WebSocket connection
      const connection = await this.marketWebSocket.createConnection(
        'main-market-stream',
        this.config.marketWebSocketUrl
      );

      console.log('Real-time data service initialized');
    } catch (error) {
      console.error('Failed to initialize real-time data service:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time price updates
   */
  subscribeToPrices(symbol: string): StreamSubscription {
    const subscriptionId = `price:${symbol}`;

    if (this.subscriptions.has(subscriptionId)) {
      return this.subscriptions.get(subscriptionId)!;
    }

    // Subscribe via market WebSocket
    this.marketWebSocket.subscribeToPrices('main-market-stream', symbol);

    const subscription: StreamSubscription = {
      id: subscriptionId,
      symbol,
      type: 'price',
      active: true,
      unsubscribe: () => this.unsubscribeFromPrices(symbol),
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Try to load from cache first
    this.loadCachedData(symbol);

    return subscription;
  }

  /**
   * Subscribe to market depth updates
   */
  subscribeToDepth(symbol: string): StreamSubscription {
    const subscriptionId = `depth:${symbol}`;

    if (this.subscriptions.has(subscriptionId)) {
      return this.subscriptions.get(subscriptionId)!;
    }

    this.marketWebSocket.subscribeToDepth('main-market-stream', symbol);

    const subscription: StreamSubscription = {
      id: subscriptionId,
      symbol,
      type: 'depth',
      active: true,
      unsubscribe: () => this.unsubscribeFromDepth(symbol),
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscription;
  }

  /**
   * Subscribe to OHLC data
   */
  subscribeToOHLC(symbol: string, timeframe: string): StreamSubscription {
    const subscriptionId = `ohlc:${symbol}:${timeframe}`;

    if (this.subscriptions.has(subscriptionId)) {
      return this.subscriptions.get(subscriptionId)!;
    }

    // For OHLC, we might use MT5 or market data service
    // For now, simulate with periodic updates
    this.startOHLCStreaming(symbol, timeframe);

    const subscription: StreamSubscription = {
      id: subscriptionId,
      symbol,
      type: 'ohlc',
      active: true,
      unsubscribe: () => this.unsubscribeFromOHLC(symbol, timeframe),
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscription;
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribeFromPrices(symbol: string): void {
    const subscriptionId = `price:${symbol}`;
    const subscription = this.subscriptions.get(subscriptionId);

    if (subscription) {
      this.marketWebSocket.unsubscribeFromPrices('main-market-stream', symbol);
      subscription.active = false;
      this.subscriptions.delete(subscriptionId);
    }
  }

  /**
   * Unsubscribe from depth updates
   */
  unsubscribeFromDepth(symbol: string): void {
    const subscriptionId = `depth:${symbol}`;
    const subscription = this.subscriptions.get(subscriptionId);

    if (subscription) {
      this.marketWebSocket.unsubscribeFromDepth('main-market-stream', symbol);
      subscription.active = false;
      this.subscriptions.delete(subscriptionId);
    }
  }

  /**
   * Unsubscribe from OHLC updates
   */
  unsubscribeFromOHLC(symbol: string, timeframe: string): void {
    const subscriptionId = `ohlc:${symbol}:${timeframe}`;
    const subscription = this.subscriptions.get(subscriptionId);

    if (subscription) {
      // Stop OHLC streaming
      subscription.active = false;
      this.subscriptions.delete(subscriptionId);
    }
  }

  /**
   * Get observable for real-time data
   */
  getDataObservable(): Observable<any> {
    return this.dataSubject.asObservable();
  }

  /**
   * Get connection status observable
   */
  getConnectionObservable(): Observable<'connected' | 'disconnected' | 'error'> {
    return this.connectionSubject.asObservable();
  }

  /**
   * Check if service is connected
   */
  isServiceConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): StreamSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.active);
  }

  /**
   * Clear all subscriptions
   */
  clearAllSubscriptions(): void {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.active) {
        subscription.unsubscribe();
      }
    }
    this.subscriptions.clear();
  }

  /**
   * Handle price update from WebSocket
   */
  private handlePriceUpdate(symbol: string, tick: PriceTick): void {
    // Update store
    useRealtimeDataStore.getState().updatePrice(symbol, tick);

    // Cache the data
    cacheService.set(`price:${symbol}`, tick, 300000); // 5 minutes TTL

    // Emit event
    eventEmitterService.emitMarketData('price_update', symbol, tick);

    // Send to observable
    this.dataSubject.next({ type: 'price', symbol, data: tick });
  }

  /**
   * Handle depth update from WebSocket
   */
  private handleDepthUpdate(symbol: string, depth: any): void {
    // Update store
    useRealtimeDataStore.getState().updateDepth(symbol, depth);

    // Cache the data
    cacheService.set(`depth:${symbol}`, depth, 60000); // 1 minute TTL

    // Emit event
    eventEmitterService.emitMarketData('depth_update', symbol, depth);

    // Send to observable
    this.dataSubject.next({ type: 'depth', symbol, data: depth });
  }

  /**
   * Start OHLC streaming (simulated for now)
   */
  private startOHLCStreaming(symbol: string, timeframe: string): void {
    // This would integrate with a charting service or MT5 for real OHLC data
    // For now, we'll simulate periodic OHLC updates

    const interval = setInterval(async () => {
      try {
        const subscriptionId = `ohlc:${symbol}:${timeframe}`;
        const subscription = this.subscriptions.get(subscriptionId);

        if (!subscription?.active) {
          clearInterval(interval);
          return;
        }

        // Get OHLC data (would come from market data service)
        const ohlcData = await this.getOHLCData(symbol, timeframe);

        // Update store
        useRealtimeDataStore.getState().updateOHLC(symbol, timeframe, ohlcData);

        // Cache the data
        cacheService.set(`ohlc:${symbol}:${timeframe}`, ohlcData, 300000);

        // Emit event
        eventEmitterService.emitMarketData('ohlc_update', symbol, { timeframe, data: ohlcData });

        // Send to observable
        this.dataSubject.next({ type: 'ohlc', symbol, timeframe, data: ohlcData });

      } catch (error) {
        console.error(`Error streaming OHLC for ${symbol}:${timeframe}:`, error);
      }
    }, 60000); // Update every minute

    // Store interval for cleanup
    const subscription = this.subscriptions.get(`ohlc:${symbol}:${timeframe}`);
    if (subscription) {
      (subscription as any).interval = interval;
    }
  }

  /**
   * Get OHLC data (placeholder - would integrate with market data service)
   */
  private async getOHLCData(symbol: string, timeframe: string): Promise<any[]> {
    // This would call the actual market data service
    // For now, return cached data or empty array
    const cached = await cacheService.get(`ohlc:${symbol}:${timeframe}`);
    return Array.isArray(cached) ? cached : [];
  }

  /**
   * Load cached data for symbol
   */
  private async loadCachedData(symbol: string): Promise<void> {
    try {
      // Load cached price data
      const cachedPrice = await cacheService.get<PriceTick>(`price:${symbol}`);
      if (cachedPrice) {
        useRealtimeDataStore.getState().updatePrice(symbol, cachedPrice);
      }

      // Load cached depth data
      const cachedDepth = await cacheService.get(`depth:${symbol}`);
      if (cachedDepth) {
        useRealtimeDataStore.getState().updateDepth(symbol, cachedDepth as any);
      }

    } catch (error) {
      console.warn(`Failed to load cached data for ${symbol}:`, error);
    }
  }

  /**
   * Preload data for common symbols
   */
  private async preloadCommonSymbols(): Promise<void> {
    const commonSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD'];
    await cacheService.preloadCommonSymbols(commonSymbols);
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.connectionSubject.next('error');
      eventEmitterService.emitConnectionEvent('error', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.initialize();
      } catch (error) {
        console.warn(`Reconnect attempt ${this.reconnectAttempts} failed:`, error);
        this.scheduleReconnect(); // Try again
      }
    }, delay);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected) {
        return;
      }

      // Check connection health
      const connection = this.marketWebSocket.getConnectionStatus('main-market-stream');
      if (!connection?.connected) {
        console.warn('Connection health check failed');
        this.connectionSubject.next('error');
        eventEmitterService.emitConnectionEvent('error', { reason: 'heartbeat_failed' });
        this.scheduleReconnect();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.clearAllSubscriptions();
    this.marketWebSocket.cleanup();

    if (this.mt5Client) {
      this.mt5Client.disconnect();
      this.mt5Client = null;
    }
  }
}

// Default configuration
export const defaultRealTimeDataConfig: RealTimeDataConfig = {
  marketWebSocketUrl: 'ws://localhost:8080/market-stream',
  mt5Host: 'localhost',
  mt5Port: 8081,
  mt5Account: '',
  mt5Password: '',
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 30000,
};

// Singleton instance
export const realTimeDataService = new RealTimeDataService(defaultRealTimeDataConfig);