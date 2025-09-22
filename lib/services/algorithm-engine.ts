import {
  AlgorithmType,
  AlgorithmConfig,
  StatisticalArbitrageConfig,
  MomentumConfig,
  MeanReversionConfig,
  PairsTradingConfig,
  MarketMakingConfig,
  AlgorithmExecution,
  AlgorithmRiskAssessment,
  AlgorithmState,
  PriceTick,
  OHLCData,
  MarketAnalysis
} from '../types';
import { MarketDataService } from './market-data-service';
import { RiskManagementService } from './risk-management-service';

// Abstract base class for all trading algorithms
export abstract class BaseAlgorithm {
  protected config: AlgorithmConfig;
  protected marketDataService: MarketDataService;
  protected riskService: RiskManagementService;
  protected state: AlgorithmState;

  constructor(
    config: AlgorithmConfig,
    marketDataService: MarketDataService,
    riskService: RiskManagementService
  ) {
    this.config = config;
    this.marketDataService = marketDataService;
    this.riskService = riskService;
    this.state = this.initializeState();
  }

  protected abstract initializeState(): AlgorithmState;
  public abstract analyze(marketData: OHLCData[], analysis: MarketAnalysis): Promise<any>;
  public abstract generateSignal(analysisResult: any): Promise<AlgorithmExecution | null>;
  public abstract validateSignal(signal: AlgorithmExecution): Promise<boolean>;
  public abstract calculatePositionSize(signal: AlgorithmExecution): Promise<number>;

  public getState(): AlgorithmState {
    return this.state;
  }

  public updateConfig(newConfig: Partial<AlgorithmConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public isActive(): boolean {
    return this.config.is_active;
  }

  public async assessRisk(execution: AlgorithmExecution): Promise<AlgorithmRiskAssessment> {
    // Simplified risk assessment for algorithm execution
    const positionValue = execution.volume * (execution.entry_price || 0);

    // Mock risk calculations - in production, use more sophisticated analysis
    const exposurePercentage = Math.random() * 5; // 0-5% exposure
    const drawdownCurrent = Math.random() * 2; // 0-2% drawdown
    const correlationRisk = Math.random() * 50; // 0-50 correlation risk
    const liquidityRisk = Math.random() * 30; // 0-30 liquidity risk

    return {
      position_value: positionValue,
      exposure_percentage: exposurePercentage,
      drawdown_current: drawdownCurrent,
      correlation_risk: correlationRisk,
      liquidity_risk: liquidityRisk,
      market_impact: Math.random() * 10, // 0-10 market impact
      var_contribution: Math.random() * 1000, // Mock VaR contribution
      stress_test_score: Math.random() * 100, // 0-100 stress test score
      circuit_breaker_triggered: exposurePercentage > this.config.risk_limits.circuit_breaker_threshold
    };
  }
}

// Statistical Arbitrage Algorithm
export class StatisticalArbitrageAlgorithm extends BaseAlgorithm {
  private spreadHistory: number[] = [];
  private zScoreHistory: number[] = [];

  constructor(
    config: StatisticalArbitrageConfig,
    marketDataService: MarketDataService,
    riskService: RiskManagementService
  ) {
    super(config, marketDataService, riskService);
  }

  protected initializeState(): AlgorithmState {
    return {
      id: `state_${this.config.id}`,
      algorithm_id: this.config.id,
      user_id: this.config.user_id,
      status: 'idle',
      current_positions: 0,
      pending_orders: 0,
      performance_snapshot: {},
      health_score: 100,
      metadata: {},
      updated_at: new Date()
    };
  }

  public async analyze(marketData: OHLCData[], analysis: MarketAnalysis): Promise<any> {
    const config = this.config as StatisticalArbitrageConfig;

    // Calculate price spread (assuming we're trading EURUSD vs correlated pair)
    // This is simplified - in practice would use cointegration analysis
    const prices = marketData.map(d => d.close);
    const spread = this.calculateSpread(prices);

    // Calculate z-score
    const zScore = this.calculateZScore(spread, config.parameters.lookback_period);

    this.spreadHistory.push(spread);
    this.zScoreHistory.push(zScore);

    // Keep history manageable
    if (this.spreadHistory.length > config.parameters.lookback_period * 2) {
      this.spreadHistory.shift();
      this.zScoreHistory.shift();
    }

    return {
      spread,
      zScore,
      isEntrySignal: Math.abs(zScore) > config.parameters.entry_threshold,
      isExitSignal: Math.abs(zScore) < config.parameters.exit_threshold,
      direction: zScore > 0 ? 'short' : 'long'
    };
  }

  public async generateSignal(analysisResult: any): Promise<AlgorithmExecution | null> {
    if (!analysisResult.isEntrySignal) return null;

    const config = this.config as StatisticalArbitrageConfig;
    const symbol = this.config.market_conditions.symbols[0];

    return {
      id: `${this.config.id}_${Date.now()}`,
      algorithm_id: this.config.id,
      user_id: this.config.user_id,
      symbol,
      side: analysisResult.direction === 'short' ? 'sell' : 'buy',
      volume: 0, // Will be calculated by position sizing
      status: 'pending',
      commission: 0,
      slippage: 0,
      metadata: {
        z_score: analysisResult.zScore,
        spread: analysisResult.spread,
        algorithm_type: 'statistical_arbitrage'
      },
      risk_assessment: {} as AlgorithmRiskAssessment, // Will be filled by assessRisk
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  public async validateSignal(signal: AlgorithmExecution): Promise<boolean> {
    // Validate against risk limits
    const config = this.config as StatisticalArbitrageConfig;

    // Check if we already have a position for this algorithm
    if (this.state.current_positions >= this.config.execution_settings.max_concurrent_positions) {
      return false;
    }

    // Check holding period if we have existing positions
    if (this.state.last_execution_time) {
      const timeSinceLastExecution = Date.now() - this.state.last_execution_time.getTime();
      const maxHoldingMs = config.parameters.max_holding_period * 60 * 1000;
      if (timeSinceLastExecution < maxHoldingMs) {
        return false;
      }
    }

    return true;
  }

  public async calculatePositionSize(signal: AlgorithmExecution): Promise<number> {
    const config = this.config as StatisticalArbitrageConfig;
    const symbol = signal.symbol;

    // Get current price
    const currentPrice = await this.marketDataService.getPriceTick(symbol);
    if (!currentPrice) return 0;

    // Base position size on risk limits
    const riskAmount = Math.min(
      this.config.risk_limits.max_single_trade_loss * 10000, // Assume 10k account
      this.config.execution_settings.max_position_size
    );

    // Calculate stop loss distance (based on z-score exit threshold)
    const stopLossDistance = Math.abs(signal.metadata.z_score - config.parameters.exit_threshold) * currentPrice.ask * 0.01;

    let positionSize = 0;
    if (config.execution_settings.position_size_method === 'percentage') {
      positionSize = (riskAmount / stopLossDistance) * 0.01; // Convert to lots
    } else if (config.execution_settings.position_size_method === 'fixed') {
      positionSize = config.execution_settings.min_position_size;
    }

    // Ensure within bounds
    return Math.max(
      config.execution_settings.min_position_size,
      Math.min(config.execution_settings.max_position_size, positionSize)
    );
  }

  private calculateSpread(prices: number[]): number {
    if (prices.length < 2) return 0;
    // Simplified spread calculation - in practice, use cointegration
    return prices[prices.length - 1] - prices[prices.length - 2];
  }

  private calculateZScore(spread: number, lookback: number): number {
    if (this.spreadHistory.length < lookback) return 0;

    const recentSpreads = this.spreadHistory.slice(-lookback);
    const mean = recentSpreads.reduce((a, b) => a + b, 0) / recentSpreads.length;
    const variance = recentSpreads.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentSpreads.length;
    const stdDev = Math.sqrt(variance);

    return stdDev === 0 ? 0 : (spread - mean) / stdDev;
  }
}

// Momentum Algorithm
export class MomentumAlgorithm extends BaseAlgorithm {
  constructor(
    config: MomentumConfig,
    marketDataService: MarketDataService,
    riskService: RiskManagementService
  ) {
    super(config, marketDataService, riskService);
  }

  protected initializeState(): AlgorithmState {
    return {
      id: `state_${this.config.id}`,
      algorithm_id: this.config.id,
      user_id: this.config.user_id,
      status: 'idle',
      current_positions: 0,
      pending_orders: 0,
      performance_snapshot: {},
      health_score: 100,
      metadata: {},
      updated_at: new Date()
    };
  }

  public async analyze(marketData: OHLCData[], analysis: MarketAnalysis): Promise<any> {
    const config = this.config as MomentumConfig;

    // Calculate momentum indicators
    const momentum = this.calculateMomentum(marketData, config.parameters.momentum_period);
    const trendStrength = this.calculateTrendStrength(marketData, config.parameters.trend_filter_period);
    const volumeConfirmation = config.parameters.volume_confirmation ?
      this.checkVolumeConfirmation(marketData) : true;

    const rsiValid = config.parameters.rsi_filter.enabled ?
      this.checkRSIFilter(analysis) : true;

    return {
      momentum,
      trendStrength,
      volumeConfirmation,
      rsiValid,
      isEntrySignal: Math.abs(momentum) > config.parameters.entry_signal_strength &&
                    trendStrength > 0.5 &&
                    volumeConfirmation &&
                    rsiValid,
      isExitSignal: Math.abs(momentum) < config.parameters.exit_signal_strength,
      direction: momentum > 0 ? 'long' : 'short'
    };
  }

  public async generateSignal(analysisResult: any): Promise<AlgorithmExecution | null> {
    if (!analysisResult.isEntrySignal) return null;

    const symbol = this.config.market_conditions.symbols[0];

    return {
      id: `${this.config.id}_${Date.now()}`,
      algorithm_id: this.config.id,
      user_id: this.config.user_id,
      symbol,
      side: analysisResult.direction === 'long' ? 'buy' : 'sell',
      volume: 0,
      status: 'pending',
      commission: 0,
      slippage: 0,
      metadata: {
        momentum: analysisResult.momentum,
        trend_strength: analysisResult.trendStrength,
        algorithm_type: 'momentum'
      },
      risk_assessment: {} as AlgorithmRiskAssessment,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  public async validateSignal(signal: AlgorithmExecution): Promise<boolean> {
    return this.state.current_positions < this.config.execution_settings.max_concurrent_positions;
  }

  public async calculatePositionSize(signal: AlgorithmExecution): Promise<number> {
    const config = this.config as MomentumConfig;

    // Momentum-based position sizing - stronger momentum = larger position
    const momentumMultiplier = Math.abs(signal.metadata.momentum) / 100;
    const baseSize = config.execution_settings.min_position_size;

    let positionSize = baseSize * momentumMultiplier;

    return Math.max(
      config.execution_settings.min_position_size,
      Math.min(config.execution_settings.max_position_size, positionSize)
    );
  }

  private calculateMomentum(data: OHLCData[], period: number): number {
    if (data.length < period + 1) return 0;

    const currentPrice = data[data.length - 1].close;
    const pastPrice = data[data.length - period - 1].close;

    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }

  private calculateTrendStrength(data: OHLCData[], period: number): number {
    if (data.length < period) return 0;

    const recentData = data.slice(-period);
    const upMoves = recentData.filter(d => d.close > d.open).length;
    const totalMoves = recentData.length;

    return upMoves / totalMoves;
  }

  private checkVolumeConfirmation(data: OHLCData[]): boolean {
    if (data.length < 2) return true;

    const current = data[data.length - 1];
    const previous = data[data.length - 2];

    // Simple volume confirmation - current volume > average of last 5 periods
    const avgVolume = data.slice(-6, -1).reduce((sum, d) => sum + d.volume, 0) / 5;

    return current.volume > avgVolume;
  }

  private checkRSIFilter(analysis: MarketAnalysis): boolean {
    const config = this.config as MomentumConfig;
    const rsi = analysis.indicators.rsi;

    if (!rsi || !config.parameters.rsi_filter.enabled) return true;

    const { overbought_level, oversold_level } = config.parameters.rsi_filter;

    // For momentum, we want to avoid overbought (bullish momentum) or oversold (bearish momentum)
    return rsi < overbought_level && rsi > oversold_level;
  }
}

// Mean Reversion Algorithm
export class MeanReversionAlgorithm extends BaseAlgorithm {
  constructor(
    config: MeanReversionConfig,
    marketDataService: MarketDataService,
    riskService: RiskManagementService
  ) {
    super(config, marketDataService, riskService);
  }

  protected initializeState(): AlgorithmState {
    return {
      id: `state_${this.config.id}`,
      algorithm_id: this.config.id,
      user_id: this.config.user_id,
      status: 'idle',
      current_positions: 0,
      pending_orders: 0,
      performance_snapshot: {},
      health_score: 100,
      metadata: {},
      updated_at: new Date()
    };
  }

  public async analyze(marketData: OHLCData[], analysis: MarketAnalysis): Promise<any> {
    const config = this.config as MeanReversionConfig;

    const prices = marketData.map(d => d.close);
    const mean = this.calculateMean(prices, config.parameters.lookback_period);
    const stdDev = this.calculateStdDev(prices, config.parameters.lookback_period);
    const currentPrice = prices[prices.length - 1];

    const deviation = (currentPrice - mean) / stdDev;
    const bollingerBands = config.parameters.bollinger_bands.enabled ?
      this.calculateBollingerBands(prices, config.parameters.bollinger_bands.period, config.parameters.bollinger_bands.deviation) :
      null;

    return {
      currentPrice,
      mean,
      stdDev,
      deviation,
      bollingerBands,
      isEntrySignal: Math.abs(deviation) > config.parameters.entry_deviation,
      isExitSignal: Math.abs(deviation) < config.parameters.exit_deviation,
      direction: deviation > 0 ? 'short' : 'long' // Mean reversion: sell high, buy low
    };
  }

  public async generateSignal(analysisResult: any): Promise<AlgorithmExecution | null> {
    if (!analysisResult.isEntrySignal) return null;

    const symbol = this.config.market_conditions.symbols[0];

    return {
      id: `${this.config.id}_${Date.now()}`,
      algorithm_id: this.config.id,
      user_id: this.config.user_id,
      symbol,
      side: analysisResult.direction === 'short' ? 'sell' : 'buy',
      volume: 0,
      status: 'pending',
      commission: 0,
      slippage: 0,
      metadata: {
        deviation: analysisResult.deviation,
        mean: analysisResult.mean,
        std_dev: analysisResult.stdDev,
        algorithm_type: 'mean_reversion'
      },
      risk_assessment: {} as AlgorithmRiskAssessment,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  public async validateSignal(signal: AlgorithmExecution): Promise<boolean> {
    const config = this.config as MeanReversionConfig;

    // Check if price is within reasonable bounds (not too far from mean)
    const maxDeviation = Math.abs(signal.metadata.deviation);
    if (maxDeviation > 3.0) return false; // Too extreme, might not revert

    return this.state.current_positions < this.config.execution_settings.max_concurrent_positions;
  }

  public async calculatePositionSize(signal: AlgorithmExecution): Promise<number> {
    const config = this.config as MeanReversionConfig;

    // Position size based on deviation - larger deviations get smaller positions (safer)
    const deviationMultiplier = Math.max(0.1, 1 - Math.abs(signal.metadata.deviation) / 3);
    const baseSize = config.execution_settings.min_position_size;

    let positionSize = baseSize * deviationMultiplier;

    return Math.max(
      config.execution_settings.min_position_size,
      Math.min(config.execution_settings.max_position_size, positionSize)
    );
  }

  private calculateMean(prices: number[], period: number): number {
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
  }

  private calculateStdDev(prices: number[], period: number): number {
    const recentPrices = prices.slice(-period);
    const mean = this.calculateMean(recentPrices, period);
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / recentPrices.length;
    return Math.sqrt(variance);
  }

  private calculateBollingerBands(prices: number[], period: number, deviation: number): { upper: number; middle: number; lower: number } {
    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    const stdDev = this.calculateStdDev(recentPrices, period);

    return {
      upper: sma + (stdDev * deviation),
      middle: sma,
      lower: sma - (stdDev * deviation)
    };
  }
}

// Pairs Trading Algorithm
export class PairsTradingAlgorithm extends BaseAlgorithm {
  private hedgeRatio: number = 1.0;
  private spreadHistory: number[] = [];

  constructor(
    config: PairsTradingConfig,
    marketDataService: MarketDataService,
    riskService: RiskManagementService
  ) {
    super(config, marketDataService, riskService);
  }

  protected initializeState(): AlgorithmState {
    return {
      id: `state_${this.config.id}`,
      algorithm_id: this.config.id,
      user_id: this.config.user_id,
      status: 'idle',
      current_positions: 0,
      pending_orders: 0,
      performance_snapshot: {},
      health_score: 100,
      metadata: {},
      updated_at: new Date()
    };
  }

  public async analyze(marketData: OHLCData[], analysis: MarketAnalysis): Promise<any> {
    const config = this.config as PairsTradingConfig;
    const [symbol1, symbol2] = config.parameters.pair_symbols;

    // Get historical data for both symbols
    const data1 = await this.marketDataService.getHistoricalData(
      symbol1,
      this.config.market_conditions.timeframes[0],
      config.parameters.cointegration_period
    );

    const data2 = await this.marketDataService.getHistoricalData(
      symbol2,
      this.config.market_conditions.timeframes[0],
      config.parameters.cointegration_period
    );

    if (!data1 || !data2) return { isEntrySignal: false };

    // Calculate hedge ratio (simplified OLS)
    this.hedgeRatio = this.calculateHedgeRatio(
      data1.map((d: OHLCData) => d.close),
      data2.map((d: OHLCData) => d.close)
    );

    // Calculate spread
    const currentPrice1 = marketData.find(d => d.symbol === symbol1)?.close || 0;
    const currentPrice2 = marketData.find(d => d.symbol === symbol2)?.close || 0;
    const spread = this.calculateSpread(currentPrice1, currentPrice2, this.hedgeRatio);

    // Calculate z-score of spread
    const zScore = this.calculateSpreadZScore(spread);

    const correlation = this.calculateCorrelation(
      data1.map((d: OHLCData) => d.close),
      data2.map((d: OHLCData) => d.close)
    );

    return {
      spread,
      zScore,
      hedgeRatio: this.hedgeRatio,
      correlation,
      isEntrySignal: Math.abs(zScore) > config.parameters.entry_threshold &&
                    correlation > config.parameters.correlation_minimum,
      isExitSignal: Math.abs(zScore) < config.parameters.exit_threshold,
      direction: zScore > 0 ? 'long_short' : 'short_long' // Long symbol1, short symbol2 or vice versa
    };
  }

  public async generateSignal(analysisResult: any): Promise<AlgorithmExecution | null> {
    if (!analysisResult.isEntrySignal) return null;

    const config = this.config as PairsTradingConfig;
    const [symbol1, symbol2] = config.parameters.pair_symbols;

    // Create paired execution (buy one, sell other)
    const primarySymbol = analysisResult.direction === 'long_short' ? symbol1 : symbol2;
    const secondarySymbol = analysisResult.direction === 'long_short' ? symbol2 : symbol1;
    const primarySide = analysisResult.direction === 'long_short' ? 'buy' : 'sell';
    const secondarySide = analysisResult.direction === 'long_short' ? 'sell' : 'buy';

    return {
      id: `${this.config.id}_${Date.now()}`,
      algorithm_id: this.config.id,
      user_id: this.config.user_id,
      symbol: primarySymbol, // Primary symbol for execution
      side: primarySide,
      volume: 0,
      status: 'pending',
      commission: 0,
      slippage: 0,
      metadata: {
        z_score: analysisResult.zScore,
        spread: analysisResult.spread,
        hedge_ratio: analysisResult.hedgeRatio,
        correlation: analysisResult.correlation,
        paired_symbol: secondarySymbol,
        paired_side: secondarySide,
        algorithm_type: 'pairs_trading'
      },
      risk_assessment: {} as AlgorithmRiskAssessment,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  public async validateSignal(signal: AlgorithmExecution): Promise<boolean> {
    // Pairs trading requires two positions, so check if we can execute both
    return this.state.current_positions < this.config.execution_settings.max_concurrent_positions - 1;
  }

  public async calculatePositionSize(signal: AlgorithmExecution): Promise<number> {
    const config = this.config as PairsTradingConfig;

    // Position size based on spread deviation
    const spreadMultiplier = Math.abs(signal.metadata.z_score) / 2; // Normalize z-score
    const baseSize = config.execution_settings.min_position_size;

    let positionSize = baseSize * Math.min(spreadMultiplier, 2.0); // Cap at 2x base size

    return Math.max(
      config.execution_settings.min_position_size,
      Math.min(config.execution_settings.max_position_size, positionSize)
    );
  }

  private calculateHedgeRatio(prices1: number[], prices2: number[]): number {
    // Simplified OLS hedge ratio calculation
    const n = Math.min(prices1.length, prices2.length);
    const x = prices1.slice(-n);
    const y = prices2.slice(-n);

    const xMean = x.reduce((a, b) => a + b, 0) / x.length;
    const yMean = y.reduce((a, b) => a + b, 0) / y.length;

    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean), 0);
    const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);

    return denominator === 0 ? 1.0 : numerator / denominator;
  }

  private calculateSpread(price1: number, price2: number, hedgeRatio: number): number {
    return price1 - hedgeRatio * price2;
  }

  private calculateSpreadZScore(spread: number): number {
    if (this.spreadHistory.length < 20) {
      this.spreadHistory.push(spread);
      return 0;
    }

    const mean = this.spreadHistory.reduce((a, b) => a + b, 0) / this.spreadHistory.length;
    const variance = this.spreadHistory.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.spreadHistory.length;
    const stdDev = Math.sqrt(variance);

    this.spreadHistory.push(spread);
    if (this.spreadHistory.length > 100) this.spreadHistory.shift();

    return stdDev === 0 ? 0 : (spread - mean) / stdDev;
  }

  private calculateCorrelation(prices1: number[], prices2: number[]): number {
    const n = Math.min(prices1.length, prices2.length);
    const x = prices1.slice(-n);
    const y = prices2.slice(-n);

    const xMean = x.reduce((a, b) => a + b, 0) / x.length;
    const yMean = y.reduce((a, b) => a + b, 0) / y.length;

    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean), 0);
    const xStd = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0) / x.length);
    const yStd = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0) / y.length);

    const denominator = xStd * yStd;
    return denominator === 0 ? 0 : numerator / denominator;
  }
}

// Market Making Algorithm
export class MarketMakingAlgorithm extends BaseAlgorithm {
  private inventory: number = 0;
  private lastQuoteTime: Date = new Date();

  constructor(
    config: MarketMakingConfig,
    marketDataService: MarketDataService,
    riskService: RiskManagementService
  ) {
    super(config, marketDataService, riskService);
  }

  protected initializeState(): AlgorithmState {
    return {
      id: `state_${this.config.id}`,
      algorithm_id: this.config.id,
      user_id: this.config.user_id,
      status: 'idle',
      current_positions: 0,
      pending_orders: 0,
      performance_snapshot: {},
      health_score: 100,
      metadata: { inventory: 0 },
      updated_at: new Date()
    };
  }

  public async analyze(marketData: OHLCData[], analysis: MarketAnalysis): Promise<any> {
    const config = this.config as MarketMakingConfig;
    const symbol = this.config.market_conditions.symbols[0];

    // Get current market depth
    const depth = await this.marketDataService.getMarketDepth(symbol);
    if (!depth) return { shouldQuote: false };

    // Calculate optimal quotes based on inventory and spread target
    const midPrice = (depth.bids[0]?.[0] + depth.asks[0]?.[0]) / 2 || 0;
    const spread = depth.asks[0]?.[0] - depth.bids[0]?.[0] || 0;

    // Adjust quotes based on inventory
    const inventorySkew = this.inventory / config.parameters.max_inventory_skew;
    const baseSpread = config.parameters.spread_target;

    const bidAdjustment = inventorySkew > 0 ? inventorySkew * baseSpread * 0.1 : 0;
    const askAdjustment = inventorySkew < 0 ? Math.abs(inventorySkew) * baseSpread * 0.1 : 0;

    const optimalBid = midPrice - (baseSpread / 2) - bidAdjustment;
    const optimalAsk = midPrice + (baseSpread / 2) + askAdjustment;

    // Check if we should refresh quotes
    const timeSinceLastQuote = Date.now() - this.lastQuoteTime.getTime();
    const shouldRefresh = timeSinceLastQuote > config.parameters.quote_refresh_interval;

    // Check adverse selection
    const adverseSelection = this.detectAdverseSelection(depth);

    return {
      midPrice,
      optimalBid,
      optimalAsk,
      currentSpread: spread,
      inventorySkew,
      shouldQuote: shouldRefresh && !adverseSelection,
      adverseSelection,
      marketDepth: depth
    };
  }

  public async generateSignal(analysisResult: any): Promise<AlgorithmExecution | null> {
    if (!analysisResult.shouldQuote) return null;

    const config = this.config as MarketMakingConfig;
    const symbol = this.config.market_conditions.symbols[0];

    // Decide whether to quote bid, ask, or both based on inventory
    const shouldQuoteBid = this.inventory > -config.parameters.max_inventory_skew;
    const shouldQuoteAsk = this.inventory < config.parameters.max_inventory_skew;

    let side: 'buy' | 'sell';
    let price: number;

    if (shouldQuoteBid && shouldQuoteAsk) {
      // Quote both sides - for simplicity, alternate or base on market conditions
      side = Math.random() > 0.5 ? 'buy' : 'sell';
      price = side === 'buy' ? analysisResult.optimalBid : analysisResult.optimalAsk;
    } else if (shouldQuoteBid) {
      side = 'buy';
      price = analysisResult.optimalBid;
    } else if (shouldQuoteAsk) {
      side = 'sell';
      price = analysisResult.optimalAsk;
    } else {
      return null; // Inventory limits reached
    }

    this.lastQuoteTime = new Date();

    return {
      id: `${this.config.id}_${Date.now()}`,
      algorithm_id: this.config.id,
      user_id: this.config.user_id,
      symbol,
      side,
      volume: 0, // Will be calculated based on order size algorithm
      entry_price: price,
      status: 'pending',
      commission: 0,
      slippage: 0,
      metadata: {
        quote_type: 'market_making',
        inventory_before: this.inventory,
        optimal_bid: analysisResult.optimalBid,
        optimal_ask: analysisResult.optimalAsk,
        inventory_skew: analysisResult.inventorySkew,
        algorithm_type: 'market_making'
      },
      risk_assessment: {} as AlgorithmRiskAssessment,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  public async validateSignal(signal: AlgorithmExecution): Promise<boolean> {
    const config = this.config as MarketMakingConfig;

    // Check inventory bounds
    const projectedInventory = this.inventory + (signal.side === 'buy' ? signal.volume : -signal.volume);

    if (Math.abs(projectedInventory) > config.parameters.max_inventory_skew) {
      return false;
    }

    // Check adverse selection from metadata
    if (signal.metadata.adverseSelection) {
      return false;
    }

    return this.state.current_positions < this.config.execution_settings.max_concurrent_positions;
  }

  public async calculatePositionSize(signal: AlgorithmExecution): Promise<number> {
    const config = this.config as MarketMakingConfig;

    let positionSize = 0;

    switch (config.parameters.order_size_algorithm) {
      case 'fixed':
        positionSize = this.config.execution_settings.min_position_size;
        break;
      case 'adaptive':
        // Smaller orders when inventory is high, larger when low
        const inventoryRatio = Math.abs(signal.metadata.inventory_skew);
        positionSize = this.config.execution_settings.min_position_size * (1 - inventoryRatio * 0.5);
        break;
      case 'inventory_based':
        // Smaller orders when moving away from target, larger when moving towards target
        const distanceFromTarget = Math.abs(signal.metadata.inventory_skew);
        positionSize = this.config.execution_settings.min_position_size * (1 + distanceFromTarget);
        break;
    }

    return Math.max(
      config.execution_settings.min_position_size,
      Math.min(config.execution_settings.max_position_size, positionSize)
    );
  }

  private detectAdverseSelection(depth: { bids: [number, number][], asks: [number, number][] }): boolean {
    const config = this.config as MarketMakingConfig;

    if (!config.parameters.adverse_selection_filter.enabled) return false;

    // Simple adverse selection detection: large order book imbalance
    const bidVolume = depth.bids.slice(0, 5).reduce((sum, [_, vol]) => sum + vol, 0);
    const askVolume = depth.asks.slice(0, 5).reduce((sum, [_, vol]) => sum + vol, 0);

    const imbalance = Math.abs(bidVolume - askVolume) / Math.max(bidVolume, askVolume);

    return imbalance > config.parameters.adverse_selection_filter.threshold;
  }
}

// Factory class for creating algorithms
export class AlgorithmFactory {
  private marketDataService: MarketDataService;
  private riskService: RiskManagementService;

  constructor(marketDataService: MarketDataService, riskService: RiskManagementService) {
    this.marketDataService = marketDataService;
    this.riskService = riskService;
  }

  public createAlgorithm(config: AlgorithmConfig): BaseAlgorithm {
    switch (config.type) {
      case 'statistical_arbitrage':
        return new StatisticalArbitrageAlgorithm(config as StatisticalArbitrageConfig, this.marketDataService, this.riskService);
      case 'momentum':
        return new MomentumAlgorithm(config as MomentumConfig, this.marketDataService, this.riskService);
      case 'mean_reversion':
        return new MeanReversionAlgorithm(config as MeanReversionConfig, this.marketDataService, this.riskService);
      case 'pairs_trading':
        return new PairsTradingAlgorithm(config as PairsTradingConfig, this.marketDataService, this.riskService);
      case 'market_making':
        return new MarketMakingAlgorithm(config as MarketMakingConfig, this.marketDataService, this.riskService);
      default:
        throw new Error(`Unknown algorithm type: ${config.type}`);
    }
  }
}