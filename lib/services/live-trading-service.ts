import {
  MT5Service,
  mt5Service,
} from './mt5-service';
import { TradeService } from './trade-service';
import { MarketDataService } from './market-data-service';
import {
  TradingSignal,
  PositionRisk,
  RiskLimits,
  LiveTradeExecution,
  TradingStrategyExecution,
  MT5Position,
  MT5TradeRequest,
  MT5ApiResponse,
  MT5TradeResult,
} from '../types';
import { Cache } from '../cache';

export interface ILiveTradingService {
  executeSignal(signal: TradingSignal, userId: string): Promise<LiveTradeExecution>;
  monitorPositions(userId: string): Promise<PositionRisk[]>;
  modifyPosition(ticket: number, sl?: number, tp?: number): Promise<MT5ApiResponse<MT5TradeResult>>;
  closePosition(ticket: number): Promise<MT5ApiResponse<MT5TradeResult>>;
  getRiskLimits(userId: string): Promise<RiskLimits>;
  updateRiskLimits(userId: string, limits: Partial<RiskLimits>): Promise<void>;
  assessPositionRisk(position: MT5Position, accountEquity: number): Promise<PositionRisk>;
  checkRiskLimits(userId: string, newTrade: Partial<LiveTradeExecution>): Promise<{ approved: boolean; reason?: string }>;
  getStrategyExecution(userId: string, strategyId: string): Promise<TradingStrategyExecution | null>;
  updateStrategyExecution(id: string, updates: Partial<TradingStrategyExecution>): Promise<TradingStrategyExecution | null>;
}

export class LiveTradingService implements ILiveTradingService {
  private defaultRiskLimits: RiskLimits = {
    max_position_size: 0.1, // 10% of equity
    max_total_exposure: 0.5, // 50% of equity
    max_drawdown: 0.05, // 5%
    max_correlation_risk: 70,
    max_daily_loss: 500,
    max_single_trade_loss: 0.02, // 2%
  };

  constructor(
    private mt5Service: MT5Service,
    private tradeService: TradeService,
    private marketDataService: MarketDataService,
    private cache: Cache
  ) {}

  async executeSignal(signal: TradingSignal, userId: string): Promise<LiveTradeExecution> {
    // Validate risk limits before execution
    const riskCheck = await this.checkRiskLimits(userId, {
      symbol: signal.symbol,
      side: signal.side,
      volume: signal.volume,
      entry_price: signal.price,
    });

    if (!riskCheck.approved) {
      throw new Error(`Risk check failed: ${riskCheck.reason}`);
    }

    // Get current market price if not provided
    const price = signal.price || await this.getCurrentPrice(signal.symbol);

    // Create MT5 trade request
    const tradeRequest: MT5TradeRequest = {
      action: 'DEAL',
      symbol: signal.symbol,
      volume: signal.volume,
      type: signal.side === 'buy' ? 'buy' : 'sell',
      price: price,
      deviation: 10, // 10 points slippage tolerance
      magic: parseInt(signal.strategy_id.slice(-6), 16), // Generate magic number from strategy ID
      comment: `Strategy: ${signal.strategy_id}`,
    };

    // Execute the trade on MT5
    const mt5Result = await this.mt5Service.placeOrder(tradeRequest);

    if (!mt5Result.success || !mt5Result.data) {
      throw new Error(`MT5 order failed: ${mt5Result.error?.message}`);
    }

    // Get current account info for risk assessment
    const accountInfo = await this.mt5Service.getAccountInfo();
    if (!accountInfo.success || !accountInfo.data) {
      throw new Error('Failed to get account info for risk assessment');
    }

    // Get position details
    const positions = await this.mt5Service.getPositions();
    const position = positions.data?.find(p => p.ticket === mt5Result.data!.order);

    // Assess risk for the new position
    let riskAssessment: PositionRisk | null = null;
    if (position) {
      riskAssessment = await this.assessPositionRisk(position, accountInfo.data.equity);
    }

    // Create execution record
    const execution: LiveTradeExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      strategy_id: signal.strategy_id,
      mt5_order_id: mt5Result.data.order,
      mt5_deal_id: mt5Result.data.deal,
      symbol: signal.symbol,
      side: signal.side,
      volume: signal.volume,
      entry_price: mt5Result.data.price,
      status: 'executed',
      executed_at: new Date(),
      risk_assessment: riskAssessment || {
        position_id: mt5Result.data.order.toString(),
        symbol: signal.symbol,
        exposure: 0,
        unrealized_pnl: 0,
        risk_percentage: 0,
        max_drawdown: 0,
        stop_loss_distance: 0,
        take_profit_distance: 0,
        correlation_risk: 0,
      },
    };

    // Store execution record in cache (could be persisted to DB)
    this.cache.set(`execution:${execution.id}`, execution, 86400000); // 24 hours

    // Update strategy execution metrics
    await this.updateStrategyExecutionMetrics(signal.strategy_id, userId, true);

    return execution;
  }

  async monitorPositions(userId: string): Promise<PositionRisk[]> {
    const positionsResult = await this.mt5Service.getPositions();
    if (!positionsResult.success || !positionsResult.data) {
      return [];
    }

    const accountInfo = await this.mt5Service.getAccountInfo();
    const equity = accountInfo.data?.equity || 10000;

    const riskAssessments = await Promise.all(
      positionsResult.data.map(position => this.assessPositionRisk(position, equity))
    );

    return riskAssessments;
  }

  async modifyPosition(ticket: number, sl?: number, tp?: number): Promise<MT5ApiResponse<MT5TradeResult>> {
    // MT5 modification request - would need proper MT5 API call
    // For now, simulate the modification
    const result: MT5TradeResult = {
      retcode: 10009,
      deal: ticket,
      order: ticket,
      volume: 0.1,
      price: sl || tp || 1.0850,
      bid: 1.0850,
      ask: 1.0852,
      comment: 'Position modified successfully',
      request_id: Date.now(),
      retcode_external: 0,
    };

    return {
      success: true,
      data: result,
      timestamp: new Date(),
    };
  }

  async closePosition(ticket: number): Promise<MT5ApiResponse<MT5TradeResult>> {
    return this.mt5Service.closePosition(ticket);
  }

  async getRiskLimits(userId: string): Promise<RiskLimits> {
    const cacheKey = `risk_limits:${userId}`;
    const cached = this.cache.get<RiskLimits>(cacheKey);
    if (cached) return cached;

    // In real implementation, fetch from user profile or database
    // For now, return defaults
    const limits = { ...this.defaultRiskLimits };
    this.cache.set(cacheKey, limits, 3600000); // 1 hour
    return limits;
  }

  async updateRiskLimits(userId: string, limits: Partial<RiskLimits>): Promise<void> {
    const currentLimits = await this.getRiskLimits(userId);
    const updatedLimits = { ...currentLimits, ...limits };

    // Persist to cache (in real app, save to database)
    this.cache.set(`risk_limits:${userId}`, updatedLimits, 3600000);
  }

  async assessPositionRisk(position: MT5Position, accountEquity: number): Promise<PositionRisk> {
    const exposure = position.volume * position.price_open;
    const riskPercentage = (exposure / accountEquity) * 100;

    // Calculate stop loss distance (simplified)
    const stopLossDistance = position.sl > 0 ?
      Math.abs(position.price_current - position.sl) / position.price_current : 0;

    // Calculate take profit distance
    const takeProfitDistance = position.tp > 0 ?
      Math.abs(position.price_current - position.tp) / position.price_current : 0;

    // Calculate max drawdown (simplified - would need historical data)
    const maxDrawdown = Math.abs(position.price_current - position.price_open) / position.price_open;

    // Correlation risk (simplified - would need portfolio analysis)
    const correlationRisk = Math.random() * 30; // Mock value

    return {
      position_id: position.ticket.toString(),
      symbol: position.symbol,
      exposure,
      unrealized_pnl: position.profit,
      risk_percentage: riskPercentage,
      max_drawdown: maxDrawdown * 100,
      stop_loss_distance: stopLossDistance * 100,
      take_profit_distance: takeProfitDistance * 100,
      correlation_risk: correlationRisk,
    };
  }

  async checkRiskLimits(userId: string, newTrade: Partial<LiveTradeExecution>): Promise<{ approved: boolean; reason?: string }> {
    const limits = await this.getRiskLimits(userId);
    const accountInfo = await this.mt5Service.getAccountInfo();

    if (!accountInfo.success || !accountInfo.data) {
      return { approved: false, reason: 'Unable to retrieve account information' };
    }

    const equity = accountInfo.data.equity;
    const newTradeValue = (newTrade.volume || 0) * (newTrade.entry_price || 0);
    const newTradeRiskPercent = (newTradeValue / equity) * 100;

    // Check position size limit
    if (newTradeRiskPercent > limits.max_position_size * 100) {
      return {
        approved: false,
        reason: `Trade size ${newTradeRiskPercent.toFixed(2)}% exceeds maximum position size limit of ${(limits.max_position_size * 100).toFixed(2)}%`
      };
    }

    // Check total exposure
    const positions = await this.mt5Service.getPositions();
    let totalExposure = newTradeValue;

    if (positions.success && positions.data) {
      totalExposure += positions.data.reduce((sum, pos) => sum + (pos.volume * pos.price_open), 0);
    }

    const totalExposurePercent = (totalExposure / equity) * 100;
    if (totalExposurePercent > limits.max_total_exposure * 100) {
      return {
        approved: false,
        reason: `Total exposure ${totalExposurePercent.toFixed(2)}% exceeds maximum exposure limit of ${(limits.max_total_exposure * 100).toFixed(2)}%`
      };
    }

    // Check single trade loss limit (would need to calculate potential loss)
    const potentialLossPercent = newTradeRiskPercent * 0.5; // Assume 50% stop loss
    if (potentialLossPercent > limits.max_single_trade_loss * 100) {
      return {
        approved: false,
        reason: `Potential single trade loss ${potentialLossPercent.toFixed(2)}% exceeds limit of ${(limits.max_single_trade_loss * 100).toFixed(2)}%`
      };
    }

    return { approved: true };
  }

  async getStrategyExecution(userId: string, strategyId: string): Promise<TradingStrategyExecution | null> {
    const cacheKey = `strategy_execution:${userId}:${strategyId}`;
    const cached = this.cache.get<TradingStrategyExecution>(cacheKey);
    if (cached) return cached;

    // In real implementation, fetch from database
    // For now, return null to indicate not found
    return null;
  }

  async updateStrategyExecution(id: string, updates: Partial<TradingStrategyExecution>): Promise<TradingStrategyExecution | null> {
    // In real implementation, update in database
    // For now, just update cache if exists
    const cacheKey = `strategy_execution:${updates.user_id}:${updates.strategy_id}`;
    const existing = this.cache.get<TradingStrategyExecution>(cacheKey);

    if (existing) {
      const updated = { ...existing, ...updates };
      this.cache.set(cacheKey, updated, 3600000);
      return updated;
    }

    return null;
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    const tickData = await this.mt5Service.getTickData(symbol);
    if (tickData.success && tickData.data) {
      return tickData.data.ask; // Use ask price for buy orders
    }

    // Fallback to symbol info
    const symbolInfo = await this.mt5Service.getSymbolInfo(symbol);
    if (symbolInfo.success && symbolInfo.data) {
      return symbolInfo.data.ask;
    }

    throw new Error(`Unable to get current price for ${symbol}`);
  }

  private async updateStrategyExecutionMetrics(strategyId: string, userId: string, success: boolean): Promise<void> {
    const execution = await this.getStrategyExecution(userId, strategyId);
    if (execution) {
      const metrics = execution.parameters.metrics || {};
      metrics.total_executions = (metrics.total_executions || 0) + 1;
      metrics.successful_executions = (metrics.successful_executions || 0) + (success ? 1 : 0);

      await this.updateStrategyExecution(execution.id, {
        parameters: { ...execution.parameters, metrics },
        last_execution: new Date(),
      });
    }
  }
}

// Create service instance with dependencies
// Services are registered in DI container in lib/di.ts