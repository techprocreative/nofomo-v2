import {
  TradingStrategy,
  TradingSignal,
  TradingStrategyExecution,
  MarketAnalysis,
  PriceTick,
  CreateTradingStrategyRequest,
} from '../types';
import { StrategyService } from './strategy-service';
import { MarketDataService } from './market-data-service';
import { Cache } from '../cache';

export interface IStrategyExecutionService {
  executeStrategy(
    strategy: TradingStrategy,
    userId: string,
    symbol: string
  ): Promise<TradingSignal[]>;
  createStrategyExecution(
    userId: string,
    strategyId: string,
    config: Partial<TradingStrategyExecution>
  ): Promise<TradingStrategyExecution>;
  getActiveExecutions(userId: string): Promise<TradingStrategyExecution[]>;
  stopStrategyExecution(id: string): Promise<boolean>;
  updateStrategyExecution(id: string, updates: Partial<TradingStrategyExecution>): Promise<TradingStrategyExecution | null>;
  evaluateEntryConditions(strategy: TradingStrategy, analysis: MarketAnalysis, currentPrice: PriceTick): boolean;
  evaluateExitConditions(strategy: TradingStrategy, analysis: MarketAnalysis, currentPrice: PriceTick, position?: any): boolean;
  calculatePositionSize(strategy: TradingStrategy, riskAmount: number, currentPrice: number, stopLoss?: number): number;
}

export class StrategyExecutionService implements IStrategyExecutionService {
  constructor(
    private strategyService: StrategyService,
    private marketDataService: MarketDataService,
    private cache: Cache
  ) {}

  async executeStrategy(
    strategy: TradingStrategy,
    userId: string,
    symbol: string
  ): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    try {
      // Get current market data and analysis
      const [analysis, currentPrice] = await Promise.all([
        this.marketDataService.getMarketAnalysis(symbol),
        this.marketDataService.getPriceTick(symbol),
      ]);

      // Evaluate entry conditions
      if (this.evaluateEntryConditions(strategy, analysis, currentPrice)) {
        const signal: TradingSignal = {
          id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          strategy_id: strategy.id,
          symbol,
          type: 'entry',
          side: this.determineEntrySide(strategy, analysis),
          price: currentPrice.ask, // Use ask price for buy signals
          volume: this.calculatePositionSize(strategy, 100, currentPrice.ask), // Default risk amount
          confidence: this.calculateSignalConfidence(strategy, analysis),
          timestamp: new Date(),
        };
        signals.push(signal);
      }

      // Evaluate exit conditions (would need current position data)
      // This would be called with position information for exit signals

    } catch (error) {
      console.error(`Error executing strategy ${strategy.id}:`, error);
    }

    return signals;
  }

  async createStrategyExecution(
    userId: string,
    strategyId: string,
    config: Partial<TradingStrategyExecution>
  ): Promise<TradingStrategyExecution> {
    const strategy = await this.strategyService.getStrategyById(strategyId);
    if (!strategy || strategy.user_id !== userId) {
      throw new Error('Strategy not found or access denied');
    }

    const execution: TradingStrategyExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      strategy_id: strategyId,
      user_id: userId,
      is_active: config.is_active || false,
      parameters: config.parameters || {},
      position_sizing: config.position_sizing || {
        method: 'percentage',
        base_amount: 1000,
        max_amount: 10000,
        risk_per_trade: 0.01, // 1%
      },
      entry_conditions: config.entry_conditions || {},
      exit_conditions: config.exit_conditions || {},
      risk_limits: config.risk_limits || {
        max_position_size: 0.1,
        max_total_exposure: 0.5,
        max_drawdown: 0.05,
        max_correlation_risk: 70,
        max_daily_loss: 500,
        max_single_trade_loss: 0.02,
      },
      last_execution: config.last_execution,
    };

    // Store in cache (in real app, persist to database)
    const cacheKey = `strategy_execution:${execution.id}`;
    this.cache.set(cacheKey, execution, 86400000); // 24 hours

    return execution;
  }

  async getActiveExecutions(userId: string): Promise<TradingStrategyExecution[]> {
    const cacheKey = `active_executions:${userId}`;
    const cached = this.cache.get<TradingStrategyExecution[]>(cacheKey);
    if (cached) return cached;

    // In real implementation, fetch from database
    // For now, return empty array
    const executions: TradingStrategyExecution[] = [];
    this.cache.set(cacheKey, executions, 300000); // 5 minutes
    return executions;
  }

  async stopStrategyExecution(id: string): Promise<boolean> {
    const cacheKey = `strategy_execution:${id}`;
    const execution = this.cache.get<TradingStrategyExecution>(cacheKey);

    if (execution) {
      execution.is_active = false;
      this.cache.set(cacheKey, execution, 86400000);
      return true;
    }

    return false;
  }

  async updateStrategyExecution(id: string, updates: Partial<TradingStrategyExecution>): Promise<TradingStrategyExecution | null> {
    const cacheKey = `strategy_execution:${id}`;
    const execution = this.cache.get<TradingStrategyExecution>(cacheKey);

    if (execution) {
      const updated = { ...execution, ...updates };
      this.cache.set(cacheKey, updated, 86400000);
      return updated;
    }

    return null;
  }

  evaluateEntryConditions(strategy: TradingStrategy, analysis: MarketAnalysis, currentPrice: PriceTick): boolean {
    const conditions = strategy.strategy_data?.entry_conditions || {};

    // RSI-based entry
    if (conditions.rsi) {
      const rsiCondition = conditions.rsi;
      if (rsiCondition.overbought && analysis.indicators.rsi && analysis.indicators.rsi > rsiCondition.overbought) {
        return false; // Overbought, don't enter
      }
      if (rsiCondition.oversold && analysis.indicators.rsi && analysis.indicators.rsi < rsiCondition.oversold) {
        return true; // Oversold, enter
      }
    }

    // Moving average crossover
    if (conditions.moving_average) {
      const maCondition = conditions.moving_average;
      if (maCondition.crossover && analysis.indicators.ema && analysis.indicators.sma) {
        const isBullishCrossover = analysis.indicators.ema > analysis.indicators.sma;
        return maCondition.direction === 'bullish' ? isBullishCrossover : !isBullishCrossover;
      }
    }

    // MACD signal
    if (conditions.macd) {
      const macdCondition = conditions.macd;
      if (analysis.indicators.macd) {
        const isBullish = analysis.indicators.macd.line > analysis.indicators.macd.signal;
        return macdCondition.direction === 'bullish' ? isBullish : !isBullish;
      }
    }

    // Trend-based entry
    if (conditions.trend) {
      const trendCondition = conditions.trend;
      return analysis.trend.direction === trendCondition.direction;
    }

    // Default: no specific conditions met
    return false;
  }

  evaluateExitConditions(strategy: TradingStrategy, analysis: MarketAnalysis, currentPrice: PriceTick, position?: any): boolean {
    const conditions = strategy.strategy_data?.exit_conditions || {};

    // Stop loss / take profit (would check against position entry price)
    if (position && conditions.stop_loss) {
      const lossPercent = Math.abs(currentPrice.bid - position.price_open) / position.price_open;
      if (lossPercent >= conditions.stop_loss) {
        return true;
      }
    }

    if (position && conditions.take_profit) {
      const profitPercent = Math.abs(currentPrice.ask - position.price_open) / position.price_open;
      if (profitPercent >= conditions.take_profit) {
        return true;
      }
    }

    // RSI-based exit
    if (conditions.rsi) {
      const rsiCondition = conditions.rsi;
      if (rsiCondition.exit_overbought && analysis.indicators.rsi && analysis.indicators.rsi > rsiCondition.exit_overbought) {
        return true;
      }
    }

    // Time-based exit
    if (conditions.time_based && position) {
      const positionAge = Date.now() - position.time.getTime();
      const maxAge = conditions.time_based.max_age_minutes * 60 * 1000;
      if (positionAge >= maxAge) {
        return true;
      }
    }

    return false;
  }

  calculatePositionSize(strategy: TradingStrategy, riskAmount: number, currentPrice: number, stopLoss?: number): number {
    const sizing = strategy.strategy_data?.position_sizing || { method: 'fixed', base_amount: 0.1 };

    switch (sizing.method) {
      case 'fixed':
        return sizing.base_amount || 0.1;

      case 'percentage':
        // Risk a percentage of account (simplified)
        const accountBalancePercent = 10000; // Would get from account info
        return (accountBalancePercent * (sizing.risk_per_trade || 0.01)) / currentPrice;

      case 'kelly':
        // Kelly criterion (simplified)
        const winRate = sizing.win_rate || 0.5;
        const winLossRatio = sizing.win_loss_ratio || 1;
        const kellyPercent = (winRate * winLossRatio - (1 - winRate)) / winLossRatio;
        const accountBalanceKelly = 10000;
        return Math.max(0.01, (accountBalanceKelly * Math.min(kellyPercent, sizing.max_kelly || 0.1)) / currentPrice);

      case 'martingale':
        // Martingale (simplified - risky!)
        const baseAmount = sizing.base_amount || 0.1;
        const multiplier = sizing.multiplier || 2;
        const consecutiveLosses = sizing.consecutive_losses || 0;
        return baseAmount * Math.pow(multiplier, consecutiveLosses);

      default:
        return 0.1;
    }
  }

  private determineEntrySide(strategy: TradingStrategy, analysis: MarketAnalysis): 'buy' | 'sell' {
    // Determine side based on strategy logic
    const strategyType = strategy.strategy_data?.type || 'trend_following';

    switch (strategyType) {
      case 'trend_following':
        return analysis.trend.direction === 'up' ? 'buy' : 'sell';

      case 'mean_reversion':
        return analysis.trend.direction === 'down' ? 'buy' : 'sell';

      case 'breakout':
        // Would check for breakout patterns
        return 'buy'; // Default

      default:
        return 'buy';
    }
  }

  private calculateSignalConfidence(strategy: TradingStrategy, analysis: MarketAnalysis): number {
    let confidence = 50; // Base confidence

    // Add confidence based on indicators alignment
    if (analysis.indicators.rsi) {
      if ((analysis.indicators.rsi < 30) || (analysis.indicators.rsi > 70)) {
        confidence += 20;
      }
    }

    if (analysis.indicators.macd) {
      const macdStrength = Math.abs(analysis.indicators.macd.histogram);
      confidence += Math.min(macdStrength * 10, 15);
    }

    if (analysis.trend.strength > 70) {
      confidence += 10;
    }

    return Math.min(confidence, 100);
  }
}

// Service will be registered in DI container in lib/di.ts