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

class MT5Connection {
  private connected: boolean = false;
  private lastActivity: Date = new Date();
  private sessionId?: string;

  constructor(private config: MT5ConnectionConfig) {}

  async connect(): Promise<void> {
    try {
      // Simulate MT5 connection
      // In real implementation, this would connect to MT5 API
      await new Promise(resolve => setTimeout(resolve, 100));

      this.connected = true;
      this.lastActivity = new Date();
      this.sessionId = `mt5-session-${Date.now()}`;

      console.log(`MT5 connected: ${this.config.account}@${this.config.server}`);
    } catch (error) {
      this.connected = false;
      throw new MT5Error(
        `Failed to connect to MT5: ${error}`,
        1001,
        error
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      // Simulate disconnection
      await new Promise(resolve => setTimeout(resolve, 50));
      this.connected = false;
      this.sessionId = undefined;
      console.log('MT5 disconnected');
    }
  }

  isConnected(): boolean {
    return this.connected && (Date.now() - this.lastActivity.getTime()) < mt5Config.connectionPool.idleTimeout;
  }

  updateActivity(): void {
    this.lastActivity = new Date();
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }
}

export class MT5Service {
  private connections: MT5Connection[] = [];
  private currentConnection: MT5Connection | null = null;
  private connectionStatus: MT5ConnectionStatus = {
    connected: false,
  };

  constructor() {
    this.initializeConnectionPool();
  }

  private initializeConnectionPool(): void {
    for (let i = 0; i < mt5Config.connectionPool.size; i++) {
      this.connections.push(new MT5Connection(mt5Config.connection));
    }
  }

  private async getConnection(): Promise<MT5Connection> {
    // Find an available connection
    let connection = this.connections.find(conn => conn.isConnected());

    if (!connection) {
      // Try to get an idle connection and reconnect
      connection = this.connections.find(conn => !conn.isConnected());
      if (connection) {
        await connection.connect();
      }
    }

    if (!connection) {
      throw new MT5Error('No available MT5 connections', 1002);
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
      // Simulate MT5 account info retrieval
      const accountInfo: MT5AccountInfo = {
        login: parseInt(mt5Config.connection.account),
        trade_mode: 0,
        leverage: 100,
        limit_orders: 200,
        margin_so_mode: 0,
        trade_allowed: true,
        trade_expert: true,
        margin_mode: 0,
        currency_digits: 2,
        fifo_close: false,
        balance: 10000,
        credit: 0,
        profit: 250.50,
        equity: 10250.50,
        margin: 500,
        margin_free: 9750.50,
        margin_level: 2050.1,
        margin_so_call: 50,
        margin_so_so: 30,
        currency: 'USD',
        name: 'Demo Account',
        server: mt5Config.connection.server,
        company: 'MetaTrader 5',
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
      // Simulate MT5 symbol info retrieval
      const baseSymbol = mt5Config.symbols[symbol] || symbol;

      const symbolInfo: MT5Symbol = {
        symbol: baseSymbol,
        description: `${baseSymbol} Forex Pair`,
        bid: 1.0850,
        ask: 1.0852,
        spread: 2,
        volume: 1000000,
        high: 1.0900,
        low: 1.0800,
        time: new Date(),
        digits: 5,
        point: 0.00001,
        tick_size: 0.00001,
        tick_value: 0.01,
        swap_long: -0.5,
        swap_short: 0.3,
        margin_initial: 1000,
        margin_maintenance: 500,
        volume_min: 0.01,
        volume_max: 100,
        volume_step: 0.01,
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
      const symbols: MT5Symbol[] = Object.keys(mt5Config.symbols).map(symbol => ({
        symbol,
        description: `${symbol} Forex Pair`,
        bid: Math.random() * 2 + 0.5, // Random price for demo
        ask: Math.random() * 2 + 0.5,
        spread: Math.floor(Math.random() * 5) + 1,
        volume: Math.floor(Math.random() * 10000000) + 100000,
        high: Math.random() * 2 + 0.5,
        low: Math.random() * 2 + 0.5,
        time: new Date(),
        digits: 5,
        point: 0.00001,
        tick_size: 0.00001,
        tick_value: 0.01,
        swap_long: Math.random() * 2 - 1,
        swap_short: Math.random() * 2 - 1,
        margin_initial: 1000,
        margin_maintenance: 500,
        volume_min: 0.01,
        volume_max: 100,
        volume_step: 0.01,
      }));

      return {
        success: true,
        data: symbols,
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
      const tickData: MT5TickData = {
        symbol,
        timestamp: new Date(),
        bid: 1.0850,
        ask: 1.0852,
        last: 1.0851,
        volume: 10000,
        flags: 0,
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
      // Simulate open positions
      const positions: MT5Position[] = [
        {
          ticket: 12345678,
          time: new Date(Date.now() - 3600000), // 1 hour ago
          time_msc: Date.now() - 3600000,
          time_update: new Date(),
          time_update_msc: Date.now(),
          type: 'buy',
          magic: 12345,
          identifier: 12345678,
          reason: 'client',
          volume: 0.1,
          price_open: 1.0820,
          sl: 1.0750,
          tp: 1.0950,
          price_current: 1.0850,
          swap: -0.02,
          profit: 30.00,
          symbol: 'EURUSD',
          comment: 'Demo position',
          external_id: 'ext-123',
        },
      ];

      return {
        success: true,
        data: positions,
        timestamp: new Date(),
      };
    }, 'getPositions');
  }

  async getOrders(): Promise<MT5ApiResponse<MT5Order[]>> {
    return this.executeWithRetry(async () => {
      // Simulate pending orders
      const orders: MT5Order[] = [];

      return {
        success: true,
        data: orders,
        timestamp: new Date(),
      };
    }, 'getOrders');
  }

  async placeOrder(request: MT5TradeRequest): Promise<MT5ApiResponse<MT5TradeResult>> {
    return this.executeWithRetry(async () => {
      // Simulate order placement
      const result: MT5TradeResult = {
        retcode: 10009, // TRADE_RETCODE_DONE
        deal: 12345679,
        order: 12345680,
        volume: request.volume,
        price: request.price || 1.0850,
        bid: 1.0850,
        ask: 1.0852,
        comment: 'Order placed successfully',
        request_id: Date.now(),
        retcode_external: 0,
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
      // Simulate position closure
      const result: MT5TradeResult = {
        retcode: 10009, // TRADE_RETCODE_DONE
        deal: ticket + 1,
        order: ticket + 2,
        volume: 0.1,
        price: 1.0850,
        bid: 1.0850,
        ask: 1.0852,
        comment: 'Position closed successfully',
        request_id: Date.now(),
        retcode_external: 0,
      };

      return {
        success: true,
        data: result,
        timestamp: new Date(),
      };
    }, `closePosition(${ticket})`);
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