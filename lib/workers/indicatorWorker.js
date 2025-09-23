// Web Worker for technical indicator calculations
// Handles RSI, MACD, Bollinger Bands computations off the main thread

// RSI calculation
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return null;

  const gains = [];
  const losses = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// MACD calculation
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (prices.length < slowPeriod) return null;

  function ema(values, period) {
    const multiplier = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  const fastEMA = ema(prices, fastPeriod);
  const slowEMA = ema(prices, slowPeriod);
  const macd = fastEMA - slowEMA;
  const signal = ema([macd], signalPeriod); // Simplified

  return { macd, signal, histogram: macd - signal };
}

// Bollinger Bands calculation
function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  if (prices.length < period) return null;

  const sma = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
  const variance = prices.slice(-period).reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const std = Math.sqrt(variance);

  return {
    upper: sma + (stdDev * std),
    middle: sma,
    lower: sma - (stdDev * std)
  };
}

// Main worker message handler
self.onmessage = function(e) {
  const { type, data } = e.data;

  try {
    let result;

    switch (type) {
      case 'rsi':
        result = calculateRSI(data.prices, data.period);
        break;
      case 'macd':
        result = calculateMACD(data.prices, data.fastPeriod, data.slowPeriod, data.signalPeriod);
        break;
      case 'bollinger':
        result = calculateBollingerBands(data.prices, data.period, data.stdDev);
        break;
      default:
        throw new Error(`Unknown indicator type: ${type}`);
    }

    self.postMessage({ success: true, result, type });
  } catch (error) {
    self.postMessage({ success: false, error: error.message, type });
  }
};