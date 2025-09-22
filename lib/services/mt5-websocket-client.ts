import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface MT5WebSocketConfig {
  host: string;
  port: number;
  account: string;
  password: string;
  timeout: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

export interface MT5Message {
  type: string;
  data: any;
  timestamp: Date;
}

export interface MT5Request {
  id: string;
  command: string;
  parameters?: Record<string, any>;
}

export interface MT5Response {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

export class MT5WebSocketError extends Error {
  constructor(
    message: string,
    public code: number,
    public details?: any
  ) {
    super(message);
    this.name = 'MT5WebSocketError';
  }
}

export class MT5WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: MT5WebSocketConfig;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
  private requestId: number = 1;

  constructor(config: MT5WebSocketConfig) {
    super();
    this.config = config;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('connected', () => {
      console.log(`MT5 WebSocket connected to ${this.config.host}:${this.config.port}`);
      this.connected = true;
      this.reconnectAttempts = 0;
    });

    this.on('disconnected', () => {
      console.log('MT5 WebSocket disconnected');
      this.connected = false;
      this.cleanupPendingRequests();
    });

    this.on('error', (error) => {
      console.error('MT5 WebSocket error:', error);
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `ws://${this.config.host}:${this.config.port}`;
        console.log(`Connecting to MT5 WebSocket: ${url}`);

        this.ws = new WebSocket(url, {
          handshakeTimeout: this.config.timeout,
          perMessageDeflate: false,
        });

        this.ws.on('open', async () => {
          try {
            // Perform authentication handshake
            await this.authenticate();
            this.emit('connected');
            resolve();
          } catch (authError) {
            this.emit('error', authError);
            this.scheduleReconnect();
            reject(authError);
          }
        });

        this.ws.on('message', (data: Buffer) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          this.emit('error', error);
          this.scheduleReconnect();
          reject(error);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          this.emit('disconnected', code, reason);
          if (code !== 1000) { // Not a normal closure
            this.scheduleReconnect();
          }
        });

      } catch (error) {
        reject(new MT5WebSocketError(
          `Failed to create WebSocket connection: ${error}`,
          1001,
          error
        ));
      }
    });
  }

  private async authenticate(): Promise<void> {
    const authRequest: MT5Request = {
      id: this.generateRequestId(),
      command: 'AUTH',
      parameters: {
        account: this.config.account,
        password: this.config.password,
        type: 'MANAGER', // or 'CLIENT' depending on access level
      },
    };

    const response = await this.sendRequest(authRequest, 10000); // 10 second timeout

    if (!response.success) {
      throw new MT5WebSocketError(
        `MT5 authentication failed: ${response.error}`,
        1002,
        response
      );
    }

    console.log('MT5 authentication successful');
  }

  private handleMessage(data: Buffer): void {
    try {
      const message: MT5Response = JSON.parse(data.toString());

      // Check if this is a response to a pending request
      const pendingRequest = this.pendingRequests.get(message.id);
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        this.pendingRequests.delete(message.id);

        if (message.success) {
          pendingRequest.resolve(message);
        } else {
          pendingRequest.reject(new MT5WebSocketError(
            message.error || 'MT5 API error',
            1003,
            message
          ));
        }
      } else {
        // This is an unsolicited message (like market data updates)
        this.emit('message', message);
      }
    } catch (error) {
      this.emit('error', new MT5WebSocketError(
        `Failed to parse MT5 message: ${error}`,
        1004,
        error
      ));
    }
  }

  private sendRequest(request: MT5Request, timeout: number = 5000): Promise<MT5Response> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new MT5WebSocketError('WebSocket not connected', 1005));
        return;
      }

      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new MT5WebSocketError(
          `Request timeout after ${timeout}ms`,
          1006
        ));
      }, timeout);

      this.pendingRequests.set(request.id, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      try {
        this.ws.send(JSON.stringify(request));
      } catch (error) {
        clearTimeout(timeoutHandle);
        this.pendingRequests.delete(request.id);
        reject(new MT5WebSocketError(
          `Failed to send request: ${error}`,
          1007,
          error
        ));
      }
    });
  }

  private generateRequestId(): string {
    return `req_${this.requestId++}_${Date.now()}`;
  }

  private cleanupPendingRequests(): void {
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new MT5WebSocketError('Connection closed', 1008));
    }
    this.pendingRequests.clear();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('maxReconnectsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.warn(`Reconnect attempt ${this.reconnectAttempts} failed:`, error);
        this.scheduleReconnect(); // Try again
      }
    }, delay);
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.cleanupPendingRequests();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connected = false;
    this.emit('disconnected');
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  // Public API methods
  async getAccountInfo(): Promise<any> {
    const request: MT5Request = {
      id: this.generateRequestId(),
      command: 'GET_ACCOUNT_INFO',
    };
    const response = await this.sendRequest(request);
    return response.data;
  }

  async getPositions(): Promise<any[]> {
    const request: MT5Request = {
      id: this.generateRequestId(),
      command: 'GET_POSITIONS',
    };
    const response = await this.sendRequest(request);
    return response.data || [];
  }

  async getOrders(): Promise<any[]> {
    const request: MT5Request = {
      id: this.generateRequestId(),
      command: 'GET_ORDERS',
    };
    const response = await this.sendRequest(request);
    return response.data || [];
  }

  async getSymbolInfo(symbol: string): Promise<any> {
    const request: MT5Request = {
      id: this.generateRequestId(),
      command: 'GET_SYMBOL_INFO',
      parameters: { symbol },
    };
    const response = await this.sendRequest(request);
    return response.data;
  }

  async placeOrder(orderData: any): Promise<any> {
    const request: MT5Request = {
      id: this.generateRequestId(),
      command: 'PLACE_ORDER',
      parameters: orderData,
    };
    const response = await this.sendRequest(request);
    return response.data;
  }

  async closePosition(ticket: number): Promise<any> {
    const request: MT5Request = {
      id: this.generateRequestId(),
      command: 'CLOSE_POSITION',
      parameters: { ticket },
    };
    const response = await this.sendRequest(request);
    return response.data;
  }

  async getTickData(symbol: string): Promise<any> {
    const request: MT5Request = {
      id: this.generateRequestId(),
      command: 'GET_TICK_DATA',
      parameters: { symbol },
    };
    const response = await this.sendRequest(request);
    return response.data;
  }

  async getHistoricalData(symbol: string, timeframe: string, bars: number): Promise<any[]> {
    const request: MT5Request = {
      id: this.generateRequestId(),
      command: 'GET_HISTORICAL_DATA',
      parameters: { symbol, timeframe, bars },
    };
    const response = await this.sendRequest(request);
    return response.data || [];
  }
}