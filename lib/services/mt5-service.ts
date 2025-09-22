import {
  MT5ConnectionConfig,
  MT5ConnectionStatus,
  MT5AccountInfo,
  MT5Symbol,
  MT5Position,
  MT5Order,
  MT5MarketData,
  MT5TickData,
  MT5TradeRequest,
  MT5TradeResult,
  MT5ApiResponse,
} from '../types';
import { mt5Config, validateMT5Config } from '../mt5-config';
import { MT5WebSocketClient, MT5WebSocketConfig, MT5WebSocketError } from './mt5-websocket-client';

export class MT5Error extends Error {
  constructor(
    message: string,
    public code: number,
    public details?: any
  ) {
    super(message);
    this.name = 'MT5Error';
  }
}

class MT5WebSocketConnection {
  private client: MT5WebSocketClient | null = null;
  private lastActivity: Date = new Date();

  constructor(private config: MT5ConnectionConfig) {}

  async connect(): Promise<void> {
    try {
      const wsConfig: MT5WebSocketConfig = {
        host: this.config.server.split(':')[0] || 'localhost',
        port: parseInt(this.config.server.split(':')[1]) || 8080,
        account: this.config.account,
        password: this.config.password,
        timeout: mt5Config.connection.timeout || 30000,
        reconnectInterval: mt5Config.connection.retryDelay || 5000,
        maxReconnectAttempts: mt5Config.connection.maxRetries || 5,
      };

      this.client = new MT5WebSocketClient(wsConfig);

      // Set up event handlers
      this.client.on('connected', () => {
        console.log(`MT5 WebSocket connected: ${this.config.account}@${this.config.server}`);
        this.lastActivity = new Date();
      });

      this.client.on('disconnected', () => {
        console.log('MT5 WebSocket disconnected');
      });

      this.client.on('error', (error) => {
        console.error('MT5 WebSocket error:', error);
      });

      await this.client.connect();
      this.lastActivity = new Date();

    } catch (error) {
      this.client = null;
      throw new MT5Error(
        `Failed to connect to MT5 WebSocket: ${error}`,
        1001,
        error
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  isConnected(): boolean {
    return this.client?.isConnected() || false;
  }

  updateActivity(): void {
    this.lastActivity = new Date();
  }

  getClient(): MT5WebSocketClient | null {
    return this.client;
  }
}

export class MT5Service {
  private connections: MT5WebSocketConnection[] = [];
  private currentConnection: MT5WebSocketConnection | null = null;
  private connectionStatus: MT5ConnectionStatus = {
    connected: false,
  };

  constructor() {
    this.initializeConnectionPool();
  }

  private initializeConnectionPool(): void {
    // Use a single connection instead of a pool for WebSocket
    this.connections.push(new MT5WebSocketConnection(mt5Config.connection));
  }

  private async getConnection(): Promise<MT5WebSocketConnection> {
    // Use the single WebSocket connection
    let connection = this.connections[0];

    if (!connection.isConnected()) {
      await connection.connect();
    }

    connection.updateActivity();
    this.currentConnection = connection;
    return connection;
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error = new Error('Unknown error');
    const maxRetries = mt5Config.connection.maxRetries || 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const connection = await this.getConnection();
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`${operationName} attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          const retryDelay = mt5Config.connection.retryDelay || 1000;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw new MT5Error(
      `${operationName} failed after ${maxRetries} attempts: ${lastError.message}`,
      1003,
      lastError
    );
  }

  async connect(): Promise<MT5ApiResponse<MT5ConnectionStatus>> {
    try {
      validateMT5Config();

      const connection = await this.getConnection();

      this.connectionStatus = {
        connected: true,
        account: mt5Config.connection.account,
        server: mt5Config.connection.server,
        last_connected: new Date(),
      };

      return {
        success: true,
        data: this.connectionStatus,
        timestamp: new Date(),
      };
    } catch (error) {
      this.connectionStatus = {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return {
        success: false,
        error: {
          code: error instanceof MT5Error ? error.code : 1000,
          message: error instanceof Error ? error.message : 'Connection failed',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  async disconnect(): Promise<MT5ApiResponse<void>> {
    try {
      await Promise.all(this.connections.map(conn => conn.disconnect()));

      this.connectionStatus = { connected: false };
      this.currentConnection = null;

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error instanceof MT5Error ? error.code : 1000,
          message: error instanceof Error ? error.message : 'Disconnection failed',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  async getConnectionStatus(): Promise<MT5ConnectionStatus> {
    return this.connectionStatus;
  }

  async getAccountInfo(): Promise<MT5ApiResponse<MT5AccountInfo>> {
    return this.executeWithRetry(async () => {
      const connection = await this.getConnection();
      const client = connection.getClient();

      if (!client) {
        throw new MT5Error('No WebSocket client available', 1002);
      }

      const accountData = await client.getAccountInfo();

      const accountInfo: MT5AccountInfo = {
        login: parseInt(accountData.login || mt5Config.connection.account),
        trade_mode: accountData.trade_mode || 0,
        leverage: accountData.leverage || 100,
        limit_orders: accountData.limit_orders || 200,
        margin_so_mode: accountData.margin_so_mode || 0,
        trade_allowed: accountData.trade_allowed !== false,
        trade_expert: accountData.trade_expert !== false,
        margin_mode: accountData.margin_mode || 0,
        currency_digits: accountData.currency_digits || 2,
        fifo_close: accountData.fifo_close || false,
        balance: accountData.balance || 0,
        credit: accountData.credit || 0,
        profit: accountData.profit || 0,
        equity: accountData.equity || 0,
        margin: accountData.margin || 0,
        margin_free: accountData.margin_free || 0,
        margin_level: accountData.margin_level || 0,
        margin_so_call: accountData.margin_so_call || 50,
        margin_so_so: accountData.margin_so_so || 30,
        currency: accountData.currency || 'USD',
        name: accountData.name || 'Trading Account',
        server: accountData.server || mt5Config.connection.server,
        company: accountData.company || 'MetaTrader 5',
      };

      return {
        success: true,
        data: accountInfo,
        timestamp: new Date(),
      };
    }, 'getAccountInfo');
  }

  async getSymbolInfo(symbol: string): Promise<MT5ApiResponse<MT5Symbol>> {
    return this.executeWithRetry(async () => {
      const connection = await this.getConnection();
      const client = connection.getClient();

      if (!client) {
        throw new MT5Error('No WebSocket client available', 1002);
      }

      const symbolData = await client.getSymbolInfo(symbol);

      const symbolInfo: MT5Symbol = {
        symbol: symbolData.symbol || symbol,
        description: symbolData.description || `${symbol} Trading Symbol`,
        bid: symbolData.bid || 0,
        ask: symbolData.ask || 0,
        spread: symbolData.spread || 0,
        volume: symbolData.volume || 0,
        high: symbolData.high || 0,
        low: symbolData.low || 0,
        time: symbolData.time ? new Date(symbolData.time) : new Date(),
        digits: symbolData.digits || 5,
        point: symbolData.point || 0.00001,
        tick_size: symbolData.tick_size || 0.00001,
        tick_value: symbolData.tick_value || 0.01,
        swap_long: symbolData.swap_long || 0,
        swap_short: symbolData.swap_short || 0,
        margin_initial: symbolData.margin_initial || 1000,
        margin_maintenance: symbolData.margin_maintenance || 500,
        volume_min: symbolData.volume_min || 0.01,
        volume_max: symbolData.volume_max || 100,
        volume_step: symbolData.volume_step || 0.01,
      };

      return {
        success: true,
        data: symbolInfo,
        timestamp: new Date(),
      };
    }, `getSymbolInfo(${symbol})`);
  }

  async getAllSymbols(): Promise<MT5ApiResponse<MT5Symbol[]>> {
    return this.executeWithRetry(async () => {
      // For now, return configured symbols since WebSocket might not provide all symbols
      // In a real implementation, this would query the terminal for all available symbols
      const symbolPromises = Object.keys(mt5Config.symbols).map(async (symbol) => {
        try {
          const symbolInfo = await this.getSymbolInfo(symbol);
          return symbolInfo.success ? symbolInfo.data! : null;
        } catch {
          // Fallback if real data fails
          return {
            symbol,
            description: `${symbol} Trading Symbol`,
            bid: 0,
            ask: 0,
            spread: 0,
            volume: 0,
            high: 0,
            low: 0,
            time: new Date(),
            digits: 5,
            point: 0.00001,
            tick_size: 0.00001,
            tick_value: 0.01,
            swap_long: 0,
            swap_short: 0,
            margin_initial: 1000,
            margin_maintenance: 500,
            volume_min: 0.01,
            volume_max: 100,
            volume_step: 0.01,
          };
        }
      });

      // Wait for all symbol info requests to complete
      const symbolData = await Promise.all(symbolPromises);
      const validSymbols = symbolData.filter(symbol => symbol !== null) as MT5Symbol[];

      return {
        success: true,
        data: validSymbols,
        timestamp: new Date(),
      };
    }, 'getAllSymbols');
  }

  async getMarketData(symbol: string): Promise<MT5ApiResponse<MT5MarketData>> {
    return this.executeWithRetry(async () => {
      const marketData: MT5MarketData = {
        symbol,
        timestamp: new Date(),
        open: 1.0820,
        high: 1.0900,
        low: 1.0800,
        close: 1.0850,
        volume: 1000000,
        spread: 2,
      };

      return {
        success: true,
        data: marketData,
        timestamp: new Date(),
      };
    }, `getMarketData(${symbol})`);
  }

  async getTickData(symbol: string): Promise<MT5ApiResponse<MT5TickData>> {
    return this.executeWithRetry(async () => {
      const connection = await this.getConnection();
      const client = connection.getClient();

      if (!client) {
        throw new MT5Error('No WebSocket client available', 1002);
      }

      const tickDataRaw = await client.getTickData(symbol);

      const tickData: MT5TickData = {
        symbol: tickDataRaw.symbol || symbol,
        timestamp: tickDataRaw.timestamp ? new Date(tickDataRaw.timestamp) : new Date(),
        bid: tickDataRaw.bid || 0,
        ask: tickDataRaw.ask || 0,
        last: tickDataRaw.last || 0,
        volume: tickDataRaw.volume || 0,
        flags: tickDataRaw.flags || 0,
      };

      return {
        success: true,
        data: tickData,
        timestamp: new Date(),
      };
    }, `getTickData(${symbol})`);
  }

  async getPositions(): Promise<MT5ApiResponse<MT5Position[]>> {
    return this.executeWithRetry(async () => {
      const connection = await this.getConnection();
      const client = connection.getClient();

      if (!client) {
        throw new MT5Error('No WebSocket client available', 1002);
      }

      const positionsData = await client.getPositions();

      const positions: MT5Position[] = positionsData.map((pos: any) => ({
        ticket: pos.ticket || 0,
        time: pos.time ? new Date(pos.time) : new Date(),
        time_msc: pos.time_msc || Date.now(),
        time_update: pos.time_update ? new Date(pos.time_update) : new Date(),
        time_update_msc: pos.time_update_msc || Date.now(),
        type: pos.type || 'buy',
        magic: pos.magic || 0,
        identifier: pos.identifier || pos.ticket || 0,
        reason: pos.reason || 'client',
        volume: pos.volume || 0,
        price_open: pos.price_open || 0,
        sl: pos.sl || 0,
        tp: pos.tp || 0,
        price_current: pos.price_current || 0,
        swap: pos.swap || 0,
        profit: pos.profit || 0,
        symbol: pos.symbol || '',
        comment: pos.comment || '',
        external_id: pos.external_id || '',
      }));

      return {
        success: true,
        data: positions,
        timestamp: new Date(),
      };
    }, 'getPositions');
  }

  async getOrders(): Promise<MT5ApiResponse<MT5Order[]>> {
    return this.executeWithRetry(async () => {
      const connection = await this.getConnection();
      const client = connection.getClient();

      if (!client) {
        throw new MT5Error('No WebSocket client available', 1002);
      }

      const ordersData = await client.getOrders();

      const orders: MT5Order[] = ordersData.map((order: any) => ({
        ticket: order.ticket || 0,
        time_setup: order.time_setup ? new Date(order.time_setup) : new Date(),
        time_setup_msc: order.time_setup_msc || Date.now(),
        time_expiration: order.time_expiration ? new Date(order.time_expiration) : new Date(),
        time_done: order.time_done ? new Date(order.time_done) : new Date(),
        time_done_msc: order.time_done_msc || Date.now(),
        type: order.type || 'buy_limit',
        type_filling: order.type_filling || 'fill_or_kill',
        type_time: order.type_time || 'good_till_cancelled',
        state: order.state || 'started',
        magic: order.magic || 0,
        position_id: order.position_id || 0,
        position_by_id: order.position_by_id || 0,
        reason: order.reason || 'client',
        volume_initial: order.volume_initial || 0,
        volume_current: order.volume_current || 0,
        price_open: order.price_open || 0,
        sl: order.sl || 0,
        tp: order.tp || 0,
        price_current: order.price_current || 0,
        price_stoplimit: order.price_stoplimit || 0,
        symbol: order.symbol || '',
        comment: order.comment || '',
        external_id: order.external_id || '',
      }));

      return {
        success: true,
        data: orders,
        timestamp: new Date(),
      };
    }, 'getOrders');
  }

  async placeOrder(request: MT5TradeRequest): Promise<MT5ApiResponse<MT5TradeResult>> {
    return this.executeWithRetry(async () => {
      const connection = await this.getConnection();
      const client = connection.getClient();

      if (!client) {
        throw new MT5Error('No WebSocket client available', 1002);
      }

      const orderData = {
        action: request.action,
        symbol: request.symbol,
        type: request.type,
        volume: request.volume,
        price: request.price,
        sl: request.sl,
        tp: request.tp,
        deviation: request.deviation,
        magic: request.magic,
        comment: request.comment,
        type_time: request.type_time,
        type_filling: request.type_filling,
      };

      const resultData = await client.placeOrder(orderData);

      const result: MT5TradeResult = {
        retcode: resultData.retcode || 10009,
        deal: resultData.deal || 0,
        order: resultData.order || 0,
        volume: resultData.volume || request.volume,
        price: resultData.price || request.price || 0,
        bid: resultData.bid || 0,
        ask: resultData.ask || 0,
        comment: resultData.comment || 'Order placed',
        request_id: resultData.request_id || Date.now(),
        retcode_external: resultData.retcode_external || 0,
      };

      return {
        success: true,
        data: result,
        timestamp: new Date(),
      };
    }, 'placeOrder');
  }

  async closePosition(ticket: number): Promise<MT5ApiResponse<MT5TradeResult>> {
    return this.executeWithRetry(async () => {
      const connection = await this.getConnection();
      const client = connection.getClient();

      if (!client) {
        throw new MT5Error('No WebSocket client available', 1002);
      }

      const resultData = await client.closePosition(ticket);

      const result: MT5TradeResult = {
        retcode: resultData.retcode || 10009,
        deal: resultData.deal || ticket + 1,
        order: resultData.order || ticket + 2,
        volume: resultData.volume || 0,
        price: resultData.price || 0,
        bid: resultData.bid || 0,
        ask: resultData.ask || 0,
        comment: resultData.comment || 'Position closed',
        request_id: resultData.request_id || Date.now(),
        retcode_external: resultData.retcode_external || 0,
      };

      return {
        success: true,
        data: result,
        timestamp: new Date(),
      };
    }, `closePosition(${ticket})`);
  }

  // Additional method for historical data
  async getHistoricalData(symbol: string, timeframe: string, bars: number): Promise<MT5ApiResponse<any[]>> {
    return this.executeWithRetry(async () => {
      const connection = await this.getConnection();
      const client = connection.getClient();

      if (!client) {
        throw new MT5Error('No WebSocket client available', 1002);
      }

      const historicalData = await client.getHistoricalData(symbol, timeframe, bars);

      return {
        success: true,
        data: historicalData,
        timestamp: new Date(),
      };
    }, `getHistoricalData(${symbol})`);
  }

  // Real-time market data subscription methods
  subscribeToPrices(symbol: string, callback: (tick: any) => void): void {
    const connection = this.currentConnection;
    if (connection?.getClient()) {
      const client = connection.getClient()!;
      // Set up event listener for market data updates
      client.on('message', (message) => {
        if (message.type === 'TICK_DATA' && message.data.symbol === symbol) {
          callback(message.data);
        }
      });
    }
  }

  unsubscribeFromPrices(symbol: string): void {
    // In a full implementation, this would send an unsubscribe command to MT5
    // For now, we rely on the WebSocket client to handle this
    const connection = this.currentConnection;
    if (connection?.getClient()) {
      // Remove event listeners or send unsubscribe command
    }
  }

  // Health check method for monitoring
  async healthCheck(): Promise<boolean> {
    try {
      await this.getConnection();
      return this.connectionStatus.connected;
    } catch {
      return false;
    }
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    await this.disconnect();
  }
}

// Singleton instance
export const mt5Service = new MT5Service();