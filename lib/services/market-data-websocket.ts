import { EventEmitter } from 'events';
import { PriceTick, WebSocketConnection, MarketDepth } from '../types';

export class MarketDataWebSocketService extends EventEmitter {
  private connections: Map<string, WebSocketConnection> = new Map();
  private subscriptions: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private _marketDataService?: import('./market-data-service').MarketDataService;

  constructor() {
    super();
    this.setupEventHandlers();
  }

  private async getMarketDataService(): Promise<import('./market-data-service').MarketDataService> {
    if (!this._marketDataService) {
      const { container } = await import('../di');
      this._marketDataService = container.resolve('MarketDataService') as import('./market-data-service').MarketDataService;
    }
    return this._marketDataService;
  }

  private setupEventHandlers(): void {
    // Handle process termination for cleanup
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  /**
   * Create a WebSocket connection for real-time market data
   */
  async createConnection(connectionId: string, url: string): Promise<WebSocketConnection> {
    const connection: WebSocketConnection = {
      id: connectionId,
      url,
      connected: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
      reconnectDelay: 5000,
      subscriptions: new Set(),
    };

    this.connections.set(connectionId, connection);
    await this.connect(connectionId);

    return connection;
  }

  /**
   * Connect to WebSocket server
   */
  private async connect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      // In a real implementation, this would connect to MT5 WebSocket or a market data provider
      // For now, we'll simulate the connection
      console.log(`Connecting to WebSocket: ${connection.url}`);

      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 100));

      connection.connected = true;
      connection.lastHeartbeat = new Date();
      connection.reconnectAttempts = 0;

      this.startHeartbeat(connectionId);
      this.emit('connected', connectionId);

      console.log(`WebSocket connected: ${connectionId}`);
    } catch (error) {
      console.error(`Failed to connect WebSocket ${connectionId}:`, error);
      connection.error = error instanceof Error ? error.message : 'Connection failed';
      this.handleReconnect(connectionId);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(connectionId: string): void {
    const interval = setInterval(() => {
      const connection = this.connections.get(connectionId);
      if (!connection || !connection.connected) {
        clearInterval(interval);
        return;
      }

      // Check if heartbeat is overdue (30 seconds)
      const now = Date.now();
      const lastHeartbeat = connection.lastHeartbeat?.getTime() || 0;

      if (now - lastHeartbeat > 30000) {
        console.warn(`Heartbeat missed for connection ${connectionId}`);
        this.handleConnectionLoss(connectionId);
      }
    }, 10000); // Check every 10 seconds

    this.heartbeatIntervals.set(connectionId, interval);
  }

  /**
   * Handle connection loss and attempt reconnection
   */
  private handleConnectionLoss(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.connected = false;
    this.emit('disconnected', connectionId);

    // Clear heartbeat interval
    const interval = this.heartbeatIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(connectionId);
    }

    this.handleReconnect(connectionId);
  }

  /**
   * Handle reconnection logic with exponential backoff
   */
  private handleReconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (connection.reconnectAttempts >= connection.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${connectionId}`);
      this.emit('maxReconnectAttemptsReached', connectionId);
      return;
    }

    connection.reconnectAttempts++;
    const delay = connection.reconnectDelay * Math.pow(2, connection.reconnectAttempts - 1);

    console.log(`Attempting to reconnect ${connectionId} in ${delay}ms (attempt ${connection.reconnectAttempts})`);

    const timeout = setTimeout(async () => {
      await this.connect(connectionId);
    }, delay);

    this.reconnectTimeouts.set(connectionId, timeout);
  }

  /**
   * Subscribe to real-time price updates for a symbol
   */
  subscribeToPrices(connectionId: string, symbol: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    if (!connection.subscriptions.has(symbol)) {
      connection.subscriptions.add(symbol);
      console.log(`Subscribed to ${symbol} on connection ${connectionId}`);

      // Start streaming prices for this symbol
      this.startPriceStreaming(connectionId, symbol);
    }
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribeFromPrices(connectionId: string, symbol: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (connection.subscriptions.has(symbol)) {
      connection.subscriptions.delete(symbol);
      console.log(`Unsubscribed from ${symbol} on connection ${connectionId}`);

      // Stop streaming if no more subscriptions for this symbol
      this.stopPriceStreaming(connectionId, symbol);
    }
  }

  /**
   * Start streaming price updates for a symbol
   */
  private startPriceStreaming(connectionId: string, symbol: string): void {
    const subscriptionKey = `${connectionId}:${symbol}`;

    if (this.subscriptions.has(subscriptionKey)) {
      return; // Already streaming
    }

    const interval = setInterval(async () => {
      try {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.connected) {
          clearInterval(interval);
          return;
        }

        // Get latest price data
        const tick = await (await this.getMarketDataService()).getPriceTick(symbol);

        // Send to all subscribers of this symbol on this connection
        this.emit('priceUpdate', { connectionId, symbol, tick });

        // Update last heartbeat
        connection.lastHeartbeat = new Date();
      } catch (error) {
        console.error(`Error streaming price for ${symbol}:`, error);
      }
    }, 1000); // Update every second

    this.subscriptions.set(subscriptionKey, interval as any);
  }

  /**
   * Stop streaming price updates
   */
  private stopPriceStreaming(connectionId: string, symbol: string): void {
    const subscriptionKey = `${connectionId}:${symbol}`;
    const interval = this.subscriptions.get(subscriptionKey);

    if (interval) {
      clearInterval(interval);
      this.subscriptions.delete(subscriptionKey);
    }
  }

  /**
   * Subscribe to market depth updates
   */
  subscribeToDepth(connectionId: string, symbol: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const subscriptionKey = `depth:${connectionId}:${symbol}`;

    if (this.subscriptions.has(subscriptionKey)) {
      return; // Already subscribed
    }

    const interval = setInterval(async () => {
      try {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.connected) {
          clearInterval(interval);
          return;
        }

        // Get latest market depth
        const depth = await (await this.getMarketDataService()).getMarketDepth(symbol);

        // Send depth update
        this.emit('depthUpdate', { connectionId, symbol, depth });

        // Update last heartbeat
        connection.lastHeartbeat = new Date();
      } catch (error) {
        console.error(`Error streaming depth for ${symbol}:`, error);
      }
    }, 5000); // Update every 5 seconds (depth changes less frequently)

    this.subscriptions.set(subscriptionKey, interval as any);
  }

  /**
   * Unsubscribe from depth updates
   */
  unsubscribeFromDepth(connectionId: string, symbol: string): void {
    const subscriptionKey = `depth:${connectionId}:${symbol}`;
    const interval = this.subscriptions.get(subscriptionKey);

    if (interval) {
      clearInterval(interval);
      this.subscriptions.delete(subscriptionKey);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(connectionId: string): WebSocketConnection | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Get all active connections
   */
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Close a connection
   */
  async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Clear all subscriptions for this connection
    for (const symbol of connection.subscriptions) {
      this.unsubscribeFromPrices(connectionId, symbol);
      this.unsubscribeFromDepth(connectionId, symbol);
    }

    // Clear heartbeat interval
    const heartbeatInterval = this.heartbeatIntervals.get(connectionId);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      this.heartbeatIntervals.delete(connectionId);
    }

    // Clear reconnect timeout
    const reconnectTimeout = this.reconnectTimeouts.get(connectionId);
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      this.reconnectTimeouts.delete(connectionId);
    }

    connection.connected = false;
    this.connections.delete(connectionId);

    this.emit('connectionClosed', connectionId);
    console.log(`Connection ${connectionId} closed`);
  }

  /**
   * Broadcast message to all connections
   */
  broadcast(message: any): void {
    for (const [connectionId, connection] of this.connections) {
      if (connection.connected) {
        this.emit('broadcast', { connectionId, message });
      }
    }
  }

  /**
   * Get connection statistics
   */
  getStatistics(): {
    totalConnections: number;
    activeConnections: number;
    totalSubscriptions: number;
  } {
    let activeConnections = 0;
    let totalSubscriptions = 0;

    for (const connection of this.connections.values()) {
      if (connection.connected) {
        activeConnections++;
      }
      totalSubscriptions += connection.subscriptions.size;
    }

    return {
      totalConnections: this.connections.size,
      activeConnections,
      totalSubscriptions,
    };
  }

  /**
   * Cleanup all connections and intervals
   */
  cleanup(): void {
    console.log('Cleaning up WebSocket service...');

    // Clear all intervals
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }

    for (const interval of this.subscriptions.values()) {
      if (typeof interval === 'number') {
        clearInterval(interval);
      }
    }

    // Clear all timeouts
    for (const timeout of this.reconnectTimeouts.values()) {
      clearTimeout(timeout);
    }

    // Close all connections
    for (const connectionId of this.connections.keys()) {
      this.closeConnection(connectionId);
    }

    this.connections.clear();
    this.subscriptions.clear();
    this.heartbeatIntervals.clear();
    this.reconnectTimeouts.clear();

    console.log('WebSocket service cleanup completed');
  }
}

// Singleton instance
export const marketDataWebSocketService = new MarketDataWebSocketService();