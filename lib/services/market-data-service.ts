import {
  PriceTick,
  OHLCData,
  MarketDepth,
  CurrencyPair,
  MarketDataCache,
  MarketAnalysis,
  MarketDataRequest,
  MarketDataResponse,
} from '../types';
import { cache } from '../cache';

export class MarketDataService {
  private cache: MarketDataCache = {
    ticks: new Map(),
    ohlc: new Map(),
    depth: new Map(),
    lastUpdated: new Map(),
  };

  private subscriptions: Map<string, Set<(price: PriceTick) => void>> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(private mt5Service: any = null) {
    this.initializeCache();
  }

  private initializeCache(): void {
    // Clean up expired cache entries every 5 minutes
    // Commented out to prevent build issues
    // setInterval(() => {
    //   this.cleanupExpiredCache();
    // }, 5 * 60 * 1000);
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [symbol, timestamp] of this.cache.lastUpdated) {
      if (now - timestamp.getTime() > maxAge) {
        this.cache.ticks.delete(symbol);
        this.cache.depth.delete(symbol);
        this.cache.lastUpdated.delete(symbol);
      }
    }

    for (const [symbol, timeframes] of this.cache.ohlc) {
      for (const [timeframe, data] of timeframes) {
        const filtered = data.filter(item =>
          now - item.timestamp.getTime() < maxAge
        );
        if (filtered.length === 0) {
          timeframes.delete(timeframe);
        } else {
          timeframes.set(timeframe, filtered);
        }
      }
      if (timeframes.size === 0) {
        this.cache.ohlc.delete(symbol);
      }
    }
  }

  /**
   * Get real-time price tick for a symbol
   */
  async getPriceTick(symbol: string): Promise<PriceTick> {
    const cacheKey = `tick:${symbol}`;
    const cached = cache.get<PriceTick>(cacheKey);

    if (cached && Date.now() - cached.timestamp.getTime() < 30000) { // 30 seconds
      return cached;
    }

    // If mt5Service is not available, return mock data
    if (!this.mt5Service) {
      const mockTick: PriceTick = {
        symbol,
        timestamp: new Date(),
        bid: 1.0850 + (Math.random() - 0.5) * 0.01,
        ask: 1.0852 + (Math.random() - 0.5) * 0.01,
        last: 1.0851 + (Math.random() - 0.5) * 0.01,
        volume: Math.floor(Math.random() * 10000) + 1000,
        flags: 0,
      };
      cache.set(cacheKey, mockTick, 30000);
      this.cache.ticks.set(symbol, mockTick);
      this.cache.lastUpdated.set(symbol, new Date());
      return mockTick;
    }

    try {
      const mt5Response = await this.mt5Service.getTickData(symbol);
      if (!mt5Response.success || !mt5Response.data) {
        throw new Error(mt5Response.error?.message || 'Failed to get tick data');
      }

      const tick: PriceTick = {
        symbol: mt5Response.data.symbol,
        timestamp: mt5Response.data.timestamp,
        bid: mt5Response.data.bid,
        ask: mt5Response.data.ask,
        last: mt5Response.data.last,
        volume: mt5Response.data.volume,
        flags: mt5Response.data.flags,
      };

      cache.set(cacheKey, tick, 30000); // Cache for 30 seconds
      this.cache.ticks.set(symbol, tick);
      this.cache.lastUpdated.set(symbol, new Date());

      return tick;
    } catch (error) {
      console.error(`Failed to get price tick for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get historical OHLC data
   */
  async getHistoricalData(
    symbol: string,
    timeframe: string = '1h',
    limit: number = 100
  ): Promise<OHLCData[]> {
    const cacheKey = `ohlc:${symbol}:${timeframe}:${limit}`;
    const cached = cache.get<OHLCData[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // In a real implementation, this would call MT5 API for historical data
      // For now, generate mock historical data
      const data: OHLCData[] = [];
      const now = new Date();
      let currentPrice = 1.0850;

      for (let i = limit - 1; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * this.getTimeframeMs(timeframe));
        const volatility = 0.001; // 0.1% volatility

        const open = currentPrice;
        const high = open + Math.random() * volatility;
        const low = open - Math.random() * volatility;
        const close = low + Math.random() * (high - low);
        const volume = Math.floor(Math.random() * 1000000) + 10000;

        data.push({
          symbol,
          timestamp,
          timeframe,
          open,
          high,
          low,
          close,
          volume,
        });

        currentPrice = close;
      }

      cache.set(cacheKey, data, 5 * 60 * 1000); // Cache for 5 minutes

      // Update internal cache
      if (!this.cache.ohlc.has(symbol)) {
        this.cache.ohlc.set(symbol, new Map());
      }
      this.cache.ohlc.get(symbol)!.set(timeframe, data);
      this.cache.lastUpdated.set(symbol, new Date());

      return data;
    } catch (error) {
      console.error(`Failed to get historical data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get market depth (order book)
   */
  async getMarketDepth(symbol: string): Promise<MarketDepth> {
    const cacheKey = `depth:${symbol}`;
    const cached = cache.get<MarketDepth>(cacheKey);

    if (cached && Date.now() - cached.timestamp.getTime() < 10000) { // 10 seconds
      return cached;
    }

    try {
      // Mock market depth data - in real implementation, this would come from MT5
      const tick = await this.getPriceTick(symbol);
      const spread = 0.0001; // 1 pip spread
      const levels = 10;

      const bids: [number, number][] = [];
      const asks: [number, number][] = [];

      for (let i = 0; i < levels; i++) {
        const bidPrice = tick.bid - (i * spread);
        const askPrice = tick.ask + (i * spread);
        const bidVolume = Math.floor(Math.random() * 100000) + 1000;
        const askVolume = Math.floor(Math.random() * 100000) + 1000;

        bids.push([bidPrice, bidVolume]);
        asks.push([askPrice, askVolume]);
      }

      const depth: MarketDepth = {
        symbol,
        timestamp: new Date(),
        bids,
        asks,
      };

      cache.set(cacheKey, depth, 10000); // Cache for 10 seconds
      this.cache.depth.set(symbol, depth);
      this.cache.lastUpdated.set(symbol, new Date());

      return depth;
    } catch (error) {
      console.error(`Failed to get market depth for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get available trading symbols
   */
  async getAvailableSymbols(): Promise<CurrencyPair[]> {
    const cacheKey = 'symbols';
    const cached = cache.get<CurrencyPair[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // If mt5Service is not available, return mock symbols
    if (!this.mt5Service) {
      const mockSymbols: CurrencyPair[] = [
        {
          symbol: 'EURUSD',
          baseCurrency: 'EUR',
          quoteCurrency: 'USD',
          description: 'Euro vs US Dollar',
          category: 'major',
          pipValue: 0.0001,
          pipLocation: 4,
          minVolume: 0.01,
          maxVolume: 100,
          volumeStep: 0.01,
          marginRequired: 100000,
          swapLong: -0.5,
          swapShort: 0.2,
          tradingHours: { start: '00:00', end: '23:59', timezone: 'UTC' },
        },
        {
          symbol: 'GBPUSD',
          baseCurrency: 'GBP',
          quoteCurrency: 'USD',
          description: 'British Pound vs US Dollar',
          category: 'major',
          pipValue: 0.0001,
          pipLocation: 4,
          minVolume: 0.01,
          maxVolume: 100,
          volumeStep: 0.01,
          marginRequired: 100000,
          swapLong: -0.8,
          swapShort: 0.3,
          tradingHours: { start: '00:00', end: '23:59', timezone: 'UTC' },
        },
        {
          symbol: 'USDJPY',
          baseCurrency: 'USD',
          quoteCurrency: 'JPY',
          description: 'US Dollar vs Japanese Yen',
          category: 'major',
          pipValue: 0.01,
          pipLocation: 2,
          minVolume: 0.01,
          maxVolume: 100,
          volumeStep: 0.01,
          marginRequired: 100000,
          swapLong: 0.1,
          swapShort: -0.4,
          tradingHours: { start: '00:00', end: '23:59', timezone: 'UTC' },
        },
        {
          symbol: 'USDCHF',
          baseCurrency: 'USD',
          quoteCurrency: 'CHF',
          description: 'US Dollar vs Swiss Franc',
          category: 'major',
          pipValue: 0.0001,
          pipLocation: 4,
          minVolume: 0.01,
          maxVolume: 100,
          volumeStep: 0.01,
          marginRequired: 100000,
          swapLong: 0.2,
          swapShort: -0.5,
          tradingHours: { start: '00:00', end: '23:59', timezone: 'UTC' },
        },
        {
          symbol: 'AUDUSD',
          baseCurrency: 'AUD',
          quoteCurrency: 'USD',
          description: 'Australian Dollar vs US Dollar',
          category: 'major',
          pipValue: 0.0001,
          pipLocation: 4,
          minVolume: 0.01,
          maxVolume: 100,
          volumeStep: 0.01,
          marginRequired: 100000,
          swapLong: -0.3,
          swapShort: 0.1,
          tradingHours: { start: '00:00', end: '23:59', timezone: 'UTC' },
        },
      ];
      cache.set(cacheKey, mockSymbols, 60 * 60 * 1000);
      return mockSymbols;
    }

    try {
      const mt5Response = await this.mt5Service.getAllSymbols();
      if (!mt5Response.success || !mt5Response.data) {
        throw new Error(mt5Response.error?.message || 'Failed to get symbols');
      }

      const symbols: CurrencyPair[] = mt5Response.data.map((mt5Symbol: any) => ({
        symbol: mt5Symbol.symbol,
        baseCurrency: mt5Symbol.symbol.substring(0, 3),
        quoteCurrency: mt5Symbol.symbol.substring(3, 6),
        description: mt5Symbol.description || `${mt5Symbol.symbol} Forex Pair`,
        category: this.getSymbolCategory(mt5Symbol.symbol),
        pipValue: mt5Symbol.tick_value,
        pipLocation: Math.log10(1 / mt5Symbol.point),
        minVolume: mt5Symbol.volume_min,
        maxVolume: mt5Symbol.volume_max,
        volumeStep: mt5Symbol.volume_step,
        marginRequired: mt5Symbol.margin_initial,
        swapLong: mt5Symbol.swap_long,
        swapShort: mt5Symbol.swap_short,
        tradingHours: {
          start: '00:00',
          end: '23:59',
          timezone: 'UTC',
        },
      }));

      cache.set(cacheKey, symbols, 60 * 60 * 1000); // Cache for 1 hour
      return symbols;
    } catch (error) {
      console.error('Failed to get available symbols:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time price updates
   */
  subscribeToPrices(symbol: string, callback: (price: PriceTick) => void): string {
    const subscriptionId = `${symbol}-${Date.now()}-${Math.random()}`;

    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, new Set());
    }
    this.subscriptions.get(symbol)!.add(callback);

    // Start polling if not already started
    if (!this.updateIntervals.has(symbol)) {
      const interval = setInterval(async () => {
        try {
          const tick = await this.getPriceTick(symbol);
          const callbacks = this.subscriptions.get(symbol);
          if (callbacks) {
            callbacks.forEach(cb => cb(tick));
          }
        } catch (error) {
          console.error(`Failed to update price for ${symbol}:`, error);
        }
      }, 1000); // Update every second

      this.updateIntervals.set(symbol, interval);
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribeFromPrices(symbol: string, callback: (price: PriceTick) => void): void {
    const callbacks = this.subscriptions.get(symbol);
    if (callbacks) {
      callbacks.delete(callback);

      if (callbacks.size === 0) {
        this.subscriptions.delete(symbol);
        const interval = this.updateIntervals.get(symbol);
        if (interval) {
          clearInterval(interval);
          this.updateIntervals.delete(symbol);
        }
      }
    }
  }

  /**
   * Calculate price metrics and analysis
   */
  async getMarketAnalysis(symbol: string, timeframe: string = '1h'): Promise<MarketAnalysis> {
    const cacheKey = `analysis:${symbol}:${timeframe}`;
    const cached = cache.get<MarketAnalysis>(cacheKey);

    if (cached && Date.now() - cached.timestamp.getTime() < 30000) {
      return cached;
    }

    try {
      const historicalData = await this.getHistoricalData(symbol, timeframe, 50);
      const currentTick = await this.getPriceTick(symbol);

      const analysis: MarketAnalysis = {
        symbol,
        timestamp: new Date(),
        indicators: {},
        volatility: {},
        trend: {
          direction: 'sideways',
          strength: 50,
        },
        liquidity: {
          score: 75,
          volume24h: historicalData.reduce((sum, item) => sum + item.volume, 0),
          spreadAverage: currentTick.ask - currentTick.bid,
        },
      };

      // Calculate basic indicators
      if (historicalData.length >= 20) {
        analysis.indicators.sma = this.calculateSMA(historicalData.map(d => d.close), 20);
        analysis.indicators.ema = this.calculateEMA(historicalData.map(d => d.close), 20);
      }

      if (historicalData.length >= 14) {
        const rsi = this.calculateRSI(historicalData.map(d => d.close), 14);
        if (rsi !== null) analysis.indicators.rsi = rsi;
      }

      if (historicalData.length >= 26) {
        const macd = this.calculateMACD(historicalData.map(d => d.close));
        if (macd) analysis.indicators.macd = macd;
      }

      // Calculate volatility
      if (historicalData.length >= 14) {
        analysis.volatility.atr = this.calculateATR(historicalData, 14);
        analysis.volatility.standardDeviation = this.calculateStdDev(historicalData.map(d => d.close));
      }

      // Determine trend
      const recentPrices = historicalData.slice(-20).map(d => d.close);
      const trend = this.calculateTrend(recentPrices);
      analysis.trend = trend;

      cache.set(cacheKey, analysis, 30000); // Cache for 30 seconds
      return analysis;
    } catch (error) {
      console.error(`Failed to get market analysis for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Convert price between different symbols
   */
  convertPrice(fromSymbol: string, toSymbol: string, amount: number): number {
    // Simple conversion - in real implementation, this would be more sophisticated
    // For forex pairs, this involves cross rates
    return amount * 1.0; // Placeholder
  }

  /**
   * Calculate pip value for a symbol
   */
  calculatePipValue(symbol: string, accountCurrency: string = 'USD'): number {
    // Standard pip calculation for forex
    const lotSize = 100000; // Standard lot
    const pipMovement = 0.0001; // For 4-digit pairs
    return lotSize * pipMovement;
  }

  // Helper methods for technical analysis

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  private calculateRSI(prices: number[], period: number): number | null {
    if (prices.length < period + 1) return null;

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]): { line: number; signal: number; histogram: number } | null {
    if (prices.length < 26) return null;

    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;

    // Calculate signal line (9-period EMA of MACD line)
    const macdValues = prices.slice(-prices.length + 25).map((_, i) => {
      const slice = prices.slice(0, i + 26);
      return this.calculateEMA(slice, 12) - this.calculateEMA(slice, 26);
    });

    const signalLine = this.calculateEMA(macdValues, 9);
    const histogram = macdLine - signalLine;

    return {
      line: macdLine,
      signal: signalLine,
      histogram,
    };
  }

  private calculateATR(data: OHLCData[], period: number): number {
    if (data.length < period) return 0;

    const trueRanges: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      trueRanges.push(tr);
    }

    return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  private calculateStdDev(prices: number[]): number {
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  private calculateTrend(prices: number[]): { direction: 'up' | 'down' | 'sideways'; strength: number } {
    if (prices.length < 10) {
      return { direction: 'sideways', strength: 50 };
    }

    const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
    const secondHalf = prices.slice(Math.floor(prices.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;
    const strength = Math.min(Math.abs(change) * 1000, 100); // Scale to 0-100

    let direction: 'up' | 'down' | 'sideways';
    if (change > 0.001) direction = 'up';
    else if (change < -0.001) direction = 'down';
    else direction = 'sideways';

    return { direction, strength };
  }

  private getSymbolCategory(symbol: string): 'major' | 'minor' | 'exotic' {
    const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD'];
    if (majorPairs.includes(symbol)) return 'major';

    // Simple heuristic for minor pairs (contains USD but not major)
    if (symbol.includes('USD')) return 'minor';

    return 'exotic';
  }

  private getTimeframeMs(timeframe: string): number {
    const timeframeMap: { [key: string]: number } = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    };

    return timeframeMap[timeframe] || 60 * 60 * 1000; // Default to 1h
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    // Clear all intervals
    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();
    this.subscriptions.clear();
  }
}

// Export the class for DI