import { MarketDataService } from './market-data-service';
import { TradingStrategy, BacktestResult, OHLCData, Trade } from '@/lib/types';

export interface BacktestConfiguration {
  strategy: TradingStrategy;
  symbol: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  spread: number; // in pips
  commission: number; // per lot
  leverage: number;
}

export interface BacktestTrade {
  id: string;
  user_id: string;
  strategy_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entry_price: number;
  exit_price: number;
  entry_time: Date;
  exit_time: Date;
  profit_loss: number;
  commission: number;
  signal_type: 'entry' | 'exit';
  strategy_signal: string;
}

export interface OHLCDataWithIndicators extends OHLCData {
  sma_fast?: number;
  sma_slow?: number;
  ema_fast?: number;
  ema_slow?: number;
  ema12?: number;
  ema26?: number;
  rsi?: number;
  macd_line?: number;
  macd_signal?: number;
  [key: string]: any;
}

export interface BacktestExecution {
  id: string;
  configuration: BacktestConfiguration;
  results: BacktestResult;
  trades: BacktestTrade[];
  equity_curve: Array<{ timestamp: Date; equity: number }>;
  execution_time: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export class BacktestingService {
  constructor(
    private marketDataService: MarketDataService
  ) {}

  async runBacktest(configuration: BacktestConfiguration): Promise<BacktestResult> {
    const { strategy, symbol, timeframe, startDate, endDate, initialBalance, spread, commission } = configuration;

    // Get historical market data
    const marketData = await this.marketDataService.getHistoricalData(
      symbol,
      timeframe,
      5000 // Get sufficient data
    );

    // Note: MarketDataService currently generates mock data without date filtering
    // For now, use all available data and simulate it covers the backtest period
    const filteredData = marketData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (filteredData.length === 0) {
      throw new Error('No market data available for backtesting');
    }

    // Adjust timestamps to cover the backtest period for simulation
    const periodMs = endDate.getTime() - startDate.getTime();
    const intervalMs = periodMs / filteredData.length;

    filteredData.forEach((candle, index) => {
      candle.timestamp = new Date(startDate.getTime() + index * intervalMs);
    });

    // Calculate technical indicators
    const dataWithIndicators = this.calculateIndicators(filteredData, strategy);

    // Execute backtest
    const backtestResult = await this.executeBacktest(
      dataWithIndicators,
      strategy,
      initialBalance,
      spread,
      commission
    );

    return backtestResult;
  }

  private calculateIndicators(data: OHLCData[], strategy: TradingStrategy): OHLCDataWithIndicators[] {
    const strategyData = strategy.strategy_data || {};

    // Calculate required indicators based on strategy
    let processedData = [...data];

    if (strategyData.indicators?.includes('SMA')) {
      processedData = this.calculateSMA(processedData, strategyData.fast_period || 10, 'sma_fast');
      processedData = this.calculateSMA(processedData, strategyData.slow_period || 20, 'sma_slow');
    }

    if (strategyData.indicators?.includes('RSI')) {
      processedData = this.calculateRSI(processedData, strategyData.rsi_period || 14);
    }

    if (strategyData.indicators?.includes('EMA')) {
      processedData = this.calculateEMA(processedData, strategyData.fast_period || 10, 'ema_fast');
      processedData = this.calculateEMA(processedData, strategyData.slow_period || 20, 'ema_slow');
    }

    if (strategyData.indicators?.includes('MACD')) {
      processedData = this.calculateMACD(processedData);
    }

    return processedData;
  }

  private async executeBacktest(
    data: OHLCDataWithIndicators[],
    strategy: TradingStrategy,
    initialBalance: number,
    spread: number,
    commission: number
  ): Promise<BacktestResult> {
    const trades: BacktestTrade[] = [];
    let equity = initialBalance;
    let peakEquity = initialBalance;
    let maxDrawdown = 0;
    const equityCurve: Array<{ timestamp: Date; equity: number }> = [{ timestamp: data[0].timestamp, equity }];

    let position: { type: 'buy' | 'sell'; entryPrice: number; entryTime: Date; size: number } | null = null;
    const strategyData = strategy.strategy_data || {};

    for (let i = 0; i < data.length; i++) {
      const candle = data[i];
      const spreadCost = (spread / 10000) * candle.close; // Convert pips to price

      // Check entry conditions
      if (!position) {
        const entrySignal = this.checkEntryConditions(candle, strategyData, data, i);
        if (entrySignal) {
          const positionSize = this.calculatePositionSize(equity, strategyData, candle.close, spreadCost);

          position = {
            type: entrySignal.type,
            entryPrice: entrySignal.type === 'buy' ? candle.close + spreadCost : candle.close - spreadCost,
            entryTime: candle.timestamp,
            size: positionSize
          };
        }
      }
      // Check exit conditions
      else {
        const exitSignal = this.checkExitConditions(candle, position, strategyData, data, i);
        if (exitSignal) {
          const exitPrice = exitSignal.type === 'sell' ? candle.close - spreadCost : candle.close + spreadCost;
          const grossPnL = (exitPrice - position.entryPrice) * position.size * (position.type === 'buy' ? 1 : -1);
          const tradeCommission = commission * Math.abs(position.size / 100000); // Assuming standard lot size
          const netPnL = grossPnL - tradeCommission;

          const trade: BacktestTrade = {
            id: `bt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: strategy.user_id,
            strategy_id: strategy.id,
            symbol: strategy.id.split('_')[0] || 'UNKNOWN',
            side: position.type,
            quantity: position.size,
            entry_price: position.entryPrice,
            exit_price: exitPrice,
            entry_time: position.entryTime,
            exit_time: candle.timestamp,
            profit_loss: netPnL,
            commission: tradeCommission,
            signal_type: 'exit',
            strategy_signal: exitSignal.reason
          };

          trades.push(trade);
          equity += netPnL;

          // Update drawdown
          if (equity > peakEquity) peakEquity = equity;
          const drawdown = (peakEquity - equity) / peakEquity;
          if (drawdown > maxDrawdown) maxDrawdown = drawdown;

          position = null;
        }
      }

      equityCurve.push({ timestamp: candle.timestamp, equity });
    }

    // Calculate performance metrics
    const totalReturn = (equity - initialBalance) / initialBalance;
    const winningTrades = trades.filter(t => t.profit_loss > 0);
    const losingTrades = trades.filter(t => t.profit_loss < 0);

    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    const profitFactor = losingTrades.length > 0 ?
      winningTrades.reduce((sum, t) => sum + t.profit_loss, 0) / Math.abs(losingTrades.reduce((sum, t) => sum + t.profit_loss, 0)) :
      winningTrades.length > 0 ? Infinity : 0;

    // Calculate Sharpe ratio (simplified)
    const returns = equityCurve.slice(1).map((point, index) =>
      (point.equity - equityCurve[index].equity) / equityCurve[index].equity
    );
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev * Math.sqrt(252) : 0; // Annualized

    // Calculate Sortino ratio
    const negativeReturns = returns.filter(r => r < 0);
    const downsideStdDev = negativeReturns.length > 0 ?
      Math.sqrt(negativeReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / negativeReturns.length) : 0;
    const sortinoRatio = downsideStdDev > 0 ? avgReturn / downsideStdDev * Math.sqrt(252) : 0;

    return {
      strategy_id: strategy.id,
      period: {
        start: data[0].timestamp,
        end: data[data.length - 1].timestamp
      },
      performance_metrics: {
        total_return: totalReturn,
        annualized_return: totalReturn * (252 / (data.length / (24 * 60))), // Assuming hourly data
        max_drawdown: maxDrawdown,
        sharpe_ratio: sharpeRatio,
        sortino_ratio: sortinoRatio,
        win_rate: winRate,
        profit_factor: profitFactor,
        calmar_ratio: maxDrawdown > 0 ? totalReturn / maxDrawdown : 0,
        recovery_factor: maxDrawdown > 0 ? totalReturn / maxDrawdown : 0,
        value_at_risk: -maxDrawdown * initialBalance
      },
      trade_log: trades.map(t => ({
        entry_time: t.entry_time,
        exit_time: t.exit_time,
        symbol: t.symbol,
        side: t.side,
        entry_price: t.entry_price,
        exit_price: t.exit_price,
        profit_loss: t.profit_loss,
        commission: t.commission
      })),
      equity_curve: equityCurve,
      drawdown_analysis: {
        max_drawdown: maxDrawdown,
        average_drawdown: maxDrawdown * 0.7, // Simplified
        drawdown_duration: 30, // Simplified
        recovery_time: 15 // Simplified
      },
      risk_analysis: {
        value_at_risk: -maxDrawdown * initialBalance,
        expected_shortfall: -maxDrawdown * initialBalance * 1.2
      }
    };
  }

  private checkEntryConditions(candle: OHLCDataWithIndicators, strategyData: any, data: OHLCDataWithIndicators[], index: number): { type: 'buy' | 'sell'; reason: string } | null {
    // SMA Crossover strategy
    if (strategyData.entry_conditions?.sma_crossover) {
      const fastSMA = candle.sma_fast;
      const slowSMA = candle.sma_slow;
      const prevFastSMA = index > 0 ? data[index - 1].sma_fast : fastSMA;
      const prevSlowSMA = index > 0 ? data[index - 1].sma_slow : slowSMA;

      if (fastSMA && slowSMA && prevFastSMA && prevSlowSMA) {
        if (prevFastSMA <= prevSlowSMA && fastSMA > slowSMA) {
          return { type: 'buy', reason: 'SMA Golden Cross' };
        }
        if (prevFastSMA >= prevSlowSMA && fastSMA < slowSMA) {
          return { type: 'sell', reason: 'SMA Death Cross' };
        }
      }
    }

    // RSI strategy
    if (strategyData.entry_conditions?.rsi) {
      const rsi = candle.rsi;
      const overbought = strategyData.overbought_level || 70;
      const oversold = strategyData.oversold_level || 30;

      if (rsi && rsi < oversold) {
        return { type: 'buy', reason: 'RSI Oversold' };
      }
      if (rsi && rsi > overbought) {
        return { type: 'sell', reason: 'RSI Overbought' };
      }
    }

    return null;
  }

  private checkExitConditions(candle: OHLCDataWithIndicators, position: any, strategyData: any, data: OHLCDataWithIndicators[], index: number): { type: 'sell' | 'buy'; reason: string } | null {
    // Take profit and stop loss
    const takeProfit = strategyData.exit_conditions?.take_profit || 0.02;
    const stopLoss = strategyData.exit_conditions?.stop_loss || 0.01;

    const currentPnL = position.type === 'buy' ?
      (candle.close - position.entryPrice) / position.entryPrice :
      (position.entryPrice - candle.close) / position.entryPrice;

    if (currentPnL >= takeProfit) {
      return { type: position.type === 'buy' ? 'sell' : 'buy', reason: 'Take Profit' };
    }
    if (currentPnL <= -stopLoss) {
      return { type: position.type === 'buy' ? 'sell' : 'buy', reason: 'Stop Loss' };
    }

    // RSI exit conditions
    if (strategyData.exit_conditions?.rsi && candle.rsi) {
      const overbought = strategyData.overbought_level || 70;
      const oversold = strategyData.oversold_level || 30;

      if (position.type === 'buy' && candle.rsi > overbought) {
        return { type: 'sell', reason: 'RSI Exit Signal' };
      }
      if (position.type === 'sell' && candle.rsi < oversold) {
        return { type: 'buy', reason: 'RSI Exit Signal' };
      }
    }

    return null;
  }

  private calculatePositionSize(equity: number, strategyData: any, price: number, spreadCost: number): number {
    const riskPerTrade = strategyData.risk_per_trade || 0.01; // 1% risk per trade
    const stopLoss = strategyData.stop_loss || 0.01; // 1% stop loss

    const riskAmount = equity * riskPerTrade;
    const stopLossAmount = price * stopLoss;

    if (stopLossAmount === 0) return 0;

    return riskAmount / stopLossAmount;
  }

  private calculateSMA(data: OHLCData[], period: number, key: string = 'sma'): OHLCDataWithIndicators[] {
    return data.map((candle, index) => {
      if (index < period - 1) return { ...candle, [key]: candle.close };

      const sum = data.slice(index - period + 1, index + 1).reduce((acc, c) => acc + c.close, 0);
      return { ...candle, [key]: sum / period };
    });
  }

  private calculateEMA(data: OHLCData[], period: number, key: string = 'ema'): OHLCDataWithIndicators[] {
    const multiplier = 2 / (period + 1);
    return data.map((candle, index) => {
      if (index === 0) return { ...candle, [key]: candle.close };

      const prevEMA = (data[index - 1] as OHLCDataWithIndicators)[key] || candle.close;
      return { ...candle, [key]: (candle.close - prevEMA) * multiplier + prevEMA };
    });
  }

  private calculateRSI(data: OHLCData[], period: number): OHLCDataWithIndicators[] {
    return data.map((candle, index) => {
      if (index < period) return { ...candle, rsi: 50 }; // Neutral RSI for initial periods

      const gains = [];
      const losses = [];

      for (let i = index - period + 1; i <= index; i++) {
        const change = data[i].close - data[i - 1].close;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? -change : 0);
      }

      const avgGain = gains.reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.reduce((a, b) => a + b, 0) / period;

      if (avgLoss === 0) return { ...candle, rsi: 100 };

      const rs = avgGain / avgLoss;
      return { ...candle, rsi: 100 - (100 / (1 + rs)) };
    });
  }

  private calculateMACD(data: OHLCData[]): OHLCDataWithIndicators[] {
    const fastPeriod = 12;
    const slowPeriod = 26;
    const signalPeriod = 9;

    let dataWithEMAs = this.calculateEMA(data, fastPeriod, 'ema12');
    dataWithEMAs = this.calculateEMA(dataWithEMAs, slowPeriod, 'ema26');

    dataWithEMAs = dataWithEMAs.map(candle => ({
      ...candle,
      macd_line: ((candle as OHLCDataWithIndicators).ema12 || 0) - ((candle as OHLCDataWithIndicators).ema26 || 0)
    }));

    return this.calculateEMA(dataWithEMAs, signalPeriod, 'macd_signal');
  }
}