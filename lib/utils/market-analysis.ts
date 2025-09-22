import { OHLCData, MarketAnalysis } from '../types';

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;

  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], period: number = 14): number | null {
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

/**
 * Calculate Moving Average Convergence Divergence (MACD)
 */
export function calculateMACD(
  prices: number[]
): { line: number; signal: number; histogram: number } | null {
  if (prices.length < 26) return null;

  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;

  // Calculate signal line (9-period EMA of MACD line)
  const macdValues = prices.slice(-prices.length + 25).map((_, i) => {
    const slice = prices.slice(0, i + 26);
    return calculateEMA(slice, 12) - calculateEMA(slice, 26);
  });

  const signalLine = calculateEMA(macdValues, 9);
  const histogram = macdLine - signalLine;

  return {
    line: macdLine,
    signal: signalLine,
    histogram,
  };
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number; middle: number; lower: number } | null {
  if (prices.length < period) return null;

  const sma = calculateSMA(prices, period);
  const recentPrices = prices.slice(-period);

  const variance = recentPrices.reduce((acc, price) => {
    return acc + Math.pow(price - sma, 2);
  }, 0) / period;

  const standardDeviation = Math.sqrt(variance);

  return {
    upper: sma + (stdDev * standardDeviation),
    middle: sma,
    lower: sma - (stdDev * standardDeviation),
  };
}

/**
 * Calculate Average True Range (ATR)
 */
export function calculateATR(data: OHLCData[], period: number = 14): number {
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

/**
 * Calculate Standard Deviation
 */
export function calculateStdDev(prices: number[]): number {
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
  return Math.sqrt(variance);
}

/**
 * Determine trend direction from price data
 */
export function calculateTrend(prices: number[]): { direction: 'up' | 'down' | 'sideways'; strength: number } {
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

/**
 * Calculate market volatility score
 */
export function calculateVolatilityScore(prices: number[], period: number = 20): number {
  if (prices.length < period) return 0;

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const stdDev = calculateStdDev(returns.slice(-period));
  // Scale to 0-100 (assuming 0.05 = 100% volatility score)
  return Math.min((stdDev / 0.05) * 100, 100);
}

/**
 * Calculate volume-based liquidity score
 */
export function calculateLiquidityScore(volumes: number[]): number {
  if (volumes.length === 0) return 0;

  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  // Scale to 0-100 (assuming 1M average volume = 100% liquidity)
  return Math.min((avgVolume / 1000000) * 100, 100);
}

/**
 * Detect support and resistance levels
 */
export function detectSupportResistance(prices: number[], lookback: number = 20): { support: number[]; resistance: number[] } {
  const support: number[] = [];
  const resistance: number[] = [];

  for (let i = lookback; i < prices.length - lookback; i++) {
    const window = prices.slice(i - lookback, i + lookback + 1);
    const currentPrice = prices[i];
    const minInWindow = Math.min(...window);
    const maxInWindow = Math.max(...window);

    if (currentPrice === minInWindow && !support.includes(currentPrice)) {
      support.push(currentPrice);
    }
    if (currentPrice === maxInWindow && !resistance.includes(currentPrice)) {
      resistance.push(currentPrice);
    }
  }

  return { support, resistance };
}

/**
 * Calculate comprehensive market analysis
 */
export function analyzeMarket(data: OHLCData[]): MarketAnalysis {
  const prices = data.map(d => d.close);
  const volumes = data.map(d => d.volume);
  const symbol = data[0]?.symbol || 'UNKNOWN';

  const analysis: MarketAnalysis = {
    symbol,
    timestamp: new Date(),
    indicators: {},
    volatility: {},
    trend: { direction: 'sideways', strength: 50 },
    liquidity: {
      score: calculateLiquidityScore(volumes),
      volume24h: volumes.reduce((a, b) => a + b, 0),
      spreadAverage: 0.0002, // Placeholder - would come from tick data
    },
  };

  // Calculate indicators if enough data
  if (prices.length >= 20) {
    analysis.indicators.sma = calculateSMA(prices, 20);
    analysis.indicators.ema = calculateEMA(prices, 20);
  }

  if (prices.length >= 14) {
    const rsi = calculateRSI(prices, 14);
    if (rsi !== null) analysis.indicators.rsi = rsi;
  }

  if (prices.length >= 26) {
    const macd = calculateMACD(prices);
    if (macd) analysis.indicators.macd = macd;
  }

  if (prices.length >= 20) {
    const bb = calculateBollingerBands(prices, 20);
    if (bb) analysis.indicators.bollingerBands = bb;
  }

  // Calculate volatility
  if (data.length >= 14) {
    analysis.volatility.atr = calculateATR(data, 14);
    analysis.volatility.standardDeviation = calculateStdDev(prices);
  }

  // Determine trend
  if (prices.length >= 10) {
    analysis.trend = calculateTrend(prices);
  }

  return analysis;
}

/**
 * Calculate price momentum
 */
export function calculateMomentum(prices: number[], period: number = 10): number {
  if (prices.length < period + 1) return 0;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - 1 - period];
  return ((current - past) / past) * 100;
}

/**
 * Calculate price rate of change
 */
export function calculateROC(prices: number[], period: number = 10): number {
  if (prices.length < period + 1) return 0;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - 1 - period];
  return ((current - past) / past) * 100;
}