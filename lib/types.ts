export interface Profile {
  id: string;
  full_name?: string;
  trading_preferences?: Record<string, any>;
  risk_tolerance?: number;
  preferred_currencies?: string[];
  created_at: string;
  updated_at: string;
}

export interface TradingStrategy {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  strategy_data?: Record<string, any>;
  is_ai_generated: boolean;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  strategy_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entry_price: number;
  exit_price?: number;
  status: 'open' | 'closed' | 'cancelled';
  entry_time: string;
  exit_time?: string;
  profit_loss?: number;
  created_at: string;
  updated_at: string;
}

export interface MT5Bot {
  id: string;
  user_id: string;
  bot_name: string;
  mt5_account_id: string;
  mt5_server?: string;
  api_key?: string;
  performance_metrics?: Record<string, any>;
  is_active: boolean;
  last_run?: string;
  created_at: string;
  updated_at: string;
}

export interface PerformanceAnalytics {
  id: string;
  user_id: string;
  strategy_id?: string;
  bot_id?: string;
  metric_name: string;
  metric_value: number;
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request types for creation/updates
export interface CreateProfileRequest {
  full_name?: string;
  trading_preferences?: Record<string, any>;
  risk_tolerance?: number;
  preferred_currencies?: string[];
}

export interface CreateTradingStrategyRequest {
  name: string;
  description?: string;
  strategy_data?: Record<string, any>;
  is_ai_generated?: boolean;
  status?: 'draft' | 'active' | 'archived';
}

export interface CreateTradeRequest {
  strategy_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entry_price: number;
  exit_price?: number;
  status?: 'open' | 'closed' | 'cancelled';
  entry_time?: string;
  exit_time?: string;
  profit_loss?: number;
}

export interface CreateMT5BotRequest {
  bot_name: string;
  mt5_account_id: string;
  mt5_server?: string;
  api_key?: string;
  performance_metrics?: Record<string, any>;
  is_active?: boolean;
  last_run?: string;
}

export interface CreatePerformanceAnalyticsRequest {
  strategy_id?: string;
  bot_id?: string;
  metric_name: string;
  metric_value: number;
  period?: 'daily' | 'weekly' | 'monthly';
  date: string;
}

// MT5 API Types & Interfaces

export interface MT5ConnectionConfig {
  account: string;
  password: string;
  server: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface MT5Symbol {
  symbol: string;
  description?: string;
  bid: number;
  ask: number;
  spread: number;
  volume: number;
  high: number;
  low: number;
  time: Date;
  digits: number;
  point: number;
  tick_size: number;
  tick_value: number;
  swap_long: number;
  swap_short: number;
  margin_initial: number;
  margin_maintenance: number;
  volume_min: number;
  volume_max: number;
  volume_step: number;
}

export interface MT5Order {
  ticket: number;
  time_setup: Date;
  time_done?: Date;
  time_expiration?: Date;
  type: 'buy' | 'sell' | 'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop';
  state: 'started' | 'placed' | 'canceled' | 'partial' | 'filled' | 'rejected' | 'expired' | 'request_adding' | 'request_modifying' | 'request_cancelling';
  magic: number;
  position_id: number;
  position_by_id: number;
  volume_current: number;
  volume_initial: number;
  price_open: number;
  sl: number;
  tp: number;
  price_current: number;
  price_stoplimit?: number;
  symbol: string;
  comment: string;
  external_id: string;
}

export interface MT5Position {
  ticket: number;
  time: Date;
  time_msc: number;
  time_update: Date;
  time_update_msc: number;
  type: 'buy' | 'sell';
  magic: number;
  identifier: number;
  reason: 'client' | 'mobile' | 'web' | 'expert';
  volume: number;
  price_open: number;
  sl: number;
  tp: number;
  price_current: number;
  swap: number;
  profit: number;
  symbol: string;
  comment: string;
  external_id: string;
}

export interface MT5AccountInfo {
  login: number;
  trade_mode: number;
  leverage: number;
  limit_orders: number;
  margin_so_mode: number;
  trade_allowed: boolean;
  trade_expert: boolean;
  margin_mode: number;
  currency_digits: number;
  fifo_close: boolean;
  balance: number;
  credit: number;
  profit: number;
  equity: number;
  margin: number;
  margin_free: number;
  margin_level: number;
  margin_so_call: number;
  margin_so_so: number;
  currency: string;
  name: string;
  server: string;
  company: string;
}

export interface MT5MarketData {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  spread: number;
}

export interface MT5TickData {
  symbol: string;
  timestamp: Date;
  bid: number;
  ask: number;
  last?: number;
  volume: number;
  flags: number;
}

export interface MT5ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

export interface MT5ConnectionStatus {
  connected: boolean;
  account?: string;
  server?: string;
  last_connected?: Date;
  error?: string;
}

export interface MT5TradeRequest {
  action: 'DEAL' | 'ORDER';
  symbol: string;
  volume: number;
  type: 'buy' | 'sell' | 'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop';
  price?: number;
  sl?: number;
  tp?: number;
  deviation?: number;
  magic?: number;
  comment?: string;
  type_time?: 'GTC' | 'DAY' | 'SPECIFIED';
  type_filling?: 'FOK' | 'IOC' | 'RETURN';
}

export interface MT5TradeResult {
  retcode: number;
  deal: number;
  order: number;
  volume: number;
  price: number;
  bid: number;
  ask: number;
  comment: string;
  request_id: number;
  retcode_external: number;
}

// Update types
export type UpdateProfileRequest = Partial<CreateProfileRequest>;
export type UpdateTradingStrategyRequest = Partial<CreateTradingStrategyRequest>;
export type UpdateTradeRequest = Partial<CreateTradeRequest>;
export type UpdateMT5BotRequest = Partial<CreateMT5BotRequest>;
export type UpdatePerformanceAnalyticsRequest = Partial<CreatePerformanceAnalyticsRequest>;

// Market Data Types & Interfaces

export interface PriceTick {
  symbol: string;
  timestamp: Date;
  bid: number;
  ask: number;
  last?: number;
  volume: number;
  flags?: number;
}

export interface OHLCData {
  symbol: string;
  timestamp: Date;
  timeframe: string; // e.g., '1m', '5m', '1h', '1d'
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  spread?: number;
}

export interface MarketDepth {
  symbol: string;
  timestamp: Date;
  bids: Array<[price: number, volume: number]>;
  asks: Array<[price: number, volume: number]>;
}

export interface OrderBookEntry {
  price: number;
  volume: number;
  orders?: number; // number of orders at this price
}

export interface OrderBook {
  symbol: string;
  timestamp: Date;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
}

export interface CurrencyPair {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  description: string;
  category: 'major' | 'minor' | 'exotic';
  pipValue: number;
  pipLocation: number; // decimal places for pips
  minVolume: number;
  maxVolume: number;
  volumeStep: number;
  marginRequired: number;
  swapLong: number;
  swapShort: number;
  tradingHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export interface MarketDataRequest {
  symbol: string;
  timeframe?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

export interface MarketDataResponse {
  symbol: string;
  data: PriceTick[] | OHLCData[] | MarketDepth[];
  timestamp: Date;
  count: number;
}

export interface PriceSubscription {
  id: string;
  symbol: string;
  callback: (price: PriceTick) => void;
  active: boolean;
}

export interface MarketAnalysis {
  symbol: string;
  timestamp: Date;
  indicators: {
    sma?: number; // Simple Moving Average
    ema?: number; // Exponential Moving Average
    rsi?: number; // Relative Strength Index
    macd?: {
      line: number;
      signal: number;
      histogram: number;
    };
    bollingerBands?: {
      upper: number;
      middle: number;
      lower: number;
    };
  };
  volatility: {
    atr?: number; // Average True Range
    standardDeviation?: number;
  };
  trend: {
    direction: 'up' | 'down' | 'sideways';
    strength: number; // 0-100
  };
  liquidity: {
    score: number; // 0-100
    volume24h: number;
    spreadAverage: number;
  };
}

export interface MarketDataCache {
  ticks: Map<string, PriceTick>;
  ohlc: Map<string, Map<string, OHLCData[]>>; // symbol -> timeframe -> data
  depth: Map<string, MarketDepth>;
  lastUpdated: Map<string, Date>;
}

export interface WebSocketConnection {
  id: string;
  url: string;
  connected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  subscriptions: Set<string>;
  lastHeartbeat?: Date;
  error?: string;
}

// Live Trading Types & Interfaces

export interface TradingSignal {
  id: string;
  strategy_id: string;
  symbol: string;
  type: 'entry' | 'exit' | 'modify';
  side: 'buy' | 'sell';
  price?: number;
  volume: number;
  confidence: number; // 0-100
  timestamp: Date;
  expiry?: Date;
  metadata?: Record<string, any>;
}

export interface PositionRisk {
  position_id: string;
  symbol: string;
  exposure: number;
  unrealized_pnl: number;
  risk_percentage: number; // percentage of total equity
  max_drawdown: number;
  stop_loss_distance: number;
  take_profit_distance: number;
  correlation_risk: number; // 0-100
}

export interface RiskLimits {
  max_position_size: number; // percentage of equity
  max_total_exposure: number; // percentage of equity
  max_drawdown: number; // percentage
  max_correlation_risk: number; // 0-100
  max_daily_loss: number; // absolute amount
  max_single_trade_loss: number; // percentage
}

export interface LiveTradeExecution {
  id: string;
  user_id: string;
  strategy_id?: string;
  mt5_order_id?: number;
  mt5_deal_id?: number;
  symbol: string;
  side: 'buy' | 'sell';
  volume: number;
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  status: 'pending' | 'executed' | 'cancelled' | 'rejected';
  executed_at?: Date;
  risk_assessment: PositionRisk;
  commission?: number;
  swap?: number;
}

export interface TradingStrategyExecution {
  id: string;
  strategy_id: string;
  user_id: string;
  is_active: boolean;
  parameters: Record<string, any>;
  position_sizing: {
    method: 'fixed' | 'percentage' | 'kelly' | 'martingale';
    base_amount: number;
    max_amount: number;
    risk_per_trade: number; // percentage
  };
  entry_conditions: Record<string, any>;
  exit_conditions: Record<string, any>;
  risk_limits: RiskLimits;
  last_execution?: Date;
}

// AI Strategy Types & Interfaces

export interface AIGeneratedStrategy extends TradingStrategy {
  ai_model_version: string;
  generation_params: AIModelConfig;
  confidence_score: number; // 0-100
  backtest_results?: BacktestResult;
  performance_prediction?: StrategyPerformancePrediction;
  generation_timestamp: Date;
  version: number;
  parent_strategy_id?: string; // for evolved strategies
}

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'trend_following' | 'mean_reversion' | 'breakout' | 'scalping' | 'swing' | 'arbitrage';
  complexity: 'simple' | 'moderate' | 'complex';
  required_indicators: string[];
  parameters_schema: Record<string, any>; // JSON schema for parameters
  default_parameters: Record<string, any>;
  performance_expectations: {
    expected_return: number;
    expected_drawdown: number;
    win_rate: number;
  };
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AIModelConfig {
  model_type: 'neural_network' | 'random_forest' | 'svm' | 'ensemble' | 'reinforcement_learning' | 'openrouter' | 'fallback';
  hyperparameters: Record<string, any>;
  training_data_period: {
    start: Date;
    end: Date;
  };
  market_conditions: string[]; // e.g., ['trending', 'ranging', 'volatile']
  risk_parameters: {
    max_drawdown: number;
    target_return: number;
    position_size_limit: number;
  };
  feature_engineering: string[]; // list of features used
}

export interface StrategyPerformancePrediction {
  strategy_id: string;
  predicted_return: number;
  predicted_drawdown: number;
  predicted_win_rate: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  risk_metrics: {
    sharpe_ratio: number;
    sortino_ratio: number;
    max_drawdown: number;
    value_at_risk: number;
  };
  prediction_date: Date;
  prediction_horizon: string; // e.g., '1M', '3M', '1Y'
  market_conditions_assumed: Record<string, any>;
}

export interface LearningFeedback {
  strategy_id: string;
  feedback_type: 'performance' | 'market_condition' | 'user_override';
  feedback_data: Record<string, any>; // actual vs predicted performance, etc.
  timestamp: Date;
  weight: number; // importance of this feedback
  market_context: {
    volatility: number;
    trend_strength: number;
    liquidity_score: number;
  };
}

export interface AIOptimizationRequest {
  strategy_id: string;
  optimization_goal: 'max_return' | 'min_drawdown' | 'max_sharpe' | 'balanced';
  constraints: {
    max_drawdown_limit?: number;
    min_return_target?: number;
    max_position_size?: number;
    allowed_indicators?: string[];
  };
  search_space: Record<string, any>; // parameter ranges to optimize
  max_iterations: number;
  cross_validation_folds: number;
}

export interface MarketAnalysisForAI {
  symbol: string;
  timestamp: Date;
  technical_patterns: {
    pattern_type: string;
    confidence: number;
    direction: 'bullish' | 'bearish' | 'neutral';
    timeframe: string;
  }[];
  sentiment_score: number; // -1 to 1
  volatility_index: number;
  trend_analysis: {
    primary_trend: 'up' | 'down' | 'sideways';
    trend_strength: number;
    cycle_position: number; // position in market cycle 0-1
  };
  correlation_matrix: Record<string, number>; // correlation with other assets
  liquidity_assessment: {
    volume_profile: number[];
    spread_cost: number;
    market_depth: number;
  };
}

export interface AITradeSignal {
  id: string;
  strategy_id: string;
  symbol: string;
  signal_type: 'entry' | 'exit' | 'adjust';
  direction: 'buy' | 'sell';
  strength: number; // 0-100
  price_target?: number;
  stop_loss?: number;
  take_profit?: number;
  position_size: number;
  confidence_score: number;
  timestamp: Date;
  expiry: Date;
  reasoning: string; // AI explanation
  supporting_data: Record<string, any>;
}

export interface BacktestResult {
  strategy_id: string;
  period: {
    start: Date;
    end: Date;
  };
  performance_metrics: {
    total_return: number;
    annualized_return: number;
    max_drawdown: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    win_rate: number;
    profit_factor: number;
    calmar_ratio: number;
    recovery_factor: number;
    value_at_risk: number;
  };
  trade_log: {
    entry_time: Date;
    exit_time: Date;
    symbol: string;
    side: 'buy' | 'sell';
    entry_price: number;
    exit_price: number;
    profit_loss: number;
    commission: number;
  }[];
  equity_curve: Array<{
    timestamp: Date;
    equity: number;
  }>;
  drawdown_analysis: {
    max_drawdown: number;
    average_drawdown: number;
    drawdown_duration: number;
    recovery_time: number;
  };
  risk_analysis: {
    value_at_risk: number;
    expected_shortfall: number;
    stress_test_results?: Record<string, any>;
  };
}

// API Request/Response types for AI endpoints
export interface GenerateStrategyRequest {
  template_id?: string;
  market_conditions: string[];
  risk_profile: 'conservative' | 'moderate' | 'aggressive';
  target_instruments: string[];
  timeframe: string;
  initial_balance: number;
  custom_parameters?: Record<string, any>;
}

export interface GenerateStrategyResponse {
  strategy: AIGeneratedStrategy;
  performance_prediction: StrategyPerformancePrediction;
  backtest_results: BacktestResult;
  confidence_score: number;
}

export interface OptimizeStrategyRequest {
  strategy_id: string;
  optimization_config: AIOptimizationRequest;
  market_data_override?: MarketAnalysisForAI;
}

export interface OptimizeStrategyResponse {
  optimized_strategy: AIGeneratedStrategy;
  optimization_results: {
    best_parameters: Record<string, any>;
    improvement_metrics: Record<string, number>;
    convergence_info: any;
  };
  backtest_comparison: {
    original: BacktestResult;
    optimized: BacktestResult;
  };
}

export interface AnalyzeMarketRequest {
  symbols: string[];
  timeframe: string;
  analysis_depth: 'basic' | 'detailed' | 'comprehensive';
  include_patterns: boolean;
  include_sentiment: boolean;
}

export interface AnalyzeMarketResponse {
  analyses: MarketAnalysisForAI[];
  market_regime: string;
  opportunities_score: number; // 0-100
  risk_assessment: any;
}

export interface GetStrategyTemplatesResponse {
  templates: StrategyTemplate[];
  categories: string[];
  total_count: number;
}

// Advanced Algorithm Types & Interfaces

export type AlgorithmType =
  | 'statistical_arbitrage'
  | 'momentum'
  | 'mean_reversion'
  | 'pairs_trading'
  | 'market_making';

export interface AlgorithmConfig {
  id: string;
  user_id: string;
  name: string;
  type: AlgorithmType;
  is_active: boolean;
  parameters: Record<string, any>; // algorithm-specific parameters
  risk_limits: AlgorithmRiskLimits;
  market_conditions: {
    symbols: string[];
    timeframes: string[];
    min_volume?: number;
    max_spread?: number;
  };
  execution_settings: {
    max_concurrent_positions: number;
    position_size_method: 'fixed' | 'percentage' | 'kelly';
    max_position_size: number;
    min_position_size: number;
  };
  created_at: string;
  updated_at: string;
}

export interface AlgorithmRiskLimits {
  max_drawdown: number; // percentage
  max_daily_loss: number; // absolute amount
  max_single_trade_loss: number; // percentage
  max_correlation_exposure: number; // 0-100
  circuit_breaker_threshold: number; // percentage
  var_limit: number; // Value at Risk limit
  stress_test_threshold: number;
}

export interface StatisticalArbitrageConfig extends AlgorithmConfig {
  type: 'statistical_arbitrage';
  parameters: {
    lookback_period: number; // days
    entry_threshold: number; // standard deviations
    exit_threshold: number; // standard deviations
    max_holding_period: number; // minutes
    cointegration_test: 'adf' | 'johansen';
    hedge_ratio_calculation: 'ols' | 'tls';
    z_score_smoothing: number; // periods for moving average
  };
}

export interface MomentumConfig extends AlgorithmConfig {
  type: 'momentum';
  parameters: {
    momentum_period: number; // days
    entry_signal_strength: number; // percentage change threshold
    exit_signal_strength: number; // percentage change threshold
    trend_filter_period: number; // days
    volume_confirmation: boolean;
    rsi_filter: {
      enabled: boolean;
      overbought_level: number;
      oversold_level: number;
    };
  };
}

export interface MeanReversionConfig extends AlgorithmConfig {
  type: 'mean_reversion';
  parameters: {
    lookback_period: number; // days
    entry_deviation: number; // standard deviations from mean
    exit_deviation: number; // standard deviations from mean
    bollinger_bands: {
      enabled: boolean;
      period: number;
      deviation: number;
    };
    mean_calculation: 'sma' | 'ema' | 'wma';
    speed_filter: boolean; // filter for mean reversion speed
  };
}

export interface PairsTradingConfig extends AlgorithmConfig {
  type: 'pairs_trading';
  parameters: {
    pair_symbols: [string, string]; // [base, quote]
    cointegration_period: number; // days
    entry_threshold: number; // standard deviations
    exit_threshold: number; // standard deviations
    hedge_ratio_update_frequency: number; // minutes
    correlation_minimum: number; // -1 to 1
    spread_calculation: 'price' | 'returns' | 'normalized';
  };
}

export interface MarketMakingConfig extends AlgorithmConfig {
  type: 'market_making';
  parameters: {
    spread_target: number; // pips
    inventory_target: number; // target position size
    max_inventory_skew: number; // max deviation from target
    quote_refresh_interval: number; // milliseconds
    order_size_algorithm: 'fixed' | 'adaptive' | 'inventory_based';
    volatility_adjustment: boolean;
    adverse_selection_filter: {
      enabled: boolean;
      threshold: number; // volume imbalance threshold
    };
  };
}

export interface AlgorithmPerformance {
  id: string;
  algorithm_id: string;
  user_id: string;
  period_start: Date;
  period_end: Date;
  metrics: {
    total_return: number;
    annualized_return: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    max_drawdown: number;
    win_rate: number;
    profit_factor: number;
    total_trades: number;
    avg_trade_duration: number; // minutes
    avg_profit_per_trade: number;
    avg_loss_per_trade: number;
  };
  risk_metrics: {
    value_at_risk: number;
    expected_shortfall: number;
    beta_to_market: number;
    correlation_matrix: Record<string, number>;
    stress_test_results: Record<string, number>;
  };
  execution_stats: {
    signals_generated: number;
    signals_executed: number;
    execution_rate: number;
    slippage_avg: number;
    commission_total: number;
  };
  created_at: Date;
}

export interface AlgorithmExecution {
  id: string;
  algorithm_id: string;
  user_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  volume: number;
  entry_price?: number;
  exit_price?: number;
  status: 'pending' | 'executed' | 'cancelled' | 'failed';
  execution_time?: Date;
  exit_time?: Date;
  profit_loss?: number;
  commission: number;
  slippage: number;
  metadata: Record<string, any>; // algorithm-specific data
  risk_assessment: AlgorithmRiskAssessment;
  created_at: Date;
  updated_at: Date;
}

export interface AlgorithmRiskAssessment {
  position_value: number;
  exposure_percentage: number;
  drawdown_current: number;
  correlation_risk: number;
  liquidity_risk: number;
  market_impact: number;
  var_contribution: number;
  stress_test_score: number;
  circuit_breaker_triggered: boolean;
}

export interface AlgorithmState {
  id: string;
  algorithm_id: string;
  user_id: string;
  status: 'idle' | 'analyzing' | 'signaling' | 'executing' | 'paused' | 'error';
  last_analysis_time?: Date;
  last_signal_time?: Date;
  last_execution_time?: Date;
  current_positions: number;
  pending_orders: number;
  performance_snapshot: Partial<AlgorithmPerformance>;
  error_message?: string;
  health_score: number; // 0-100
  metadata: Record<string, any>;
  updated_at: Date;
}

// Algorithm API Request/Response Types

export interface CreateAlgorithmRequest {
  name: string;
  type: AlgorithmType;
  parameters: Record<string, any>;
  risk_limits?: Partial<AlgorithmRiskLimits>;
  market_conditions: {
    symbols: string[];
    timeframes: string[];
    min_volume?: number;
    max_spread?: number;
  };
  execution_settings?: Partial<AlgorithmConfig['execution_settings']>;
}

export interface UpdateAlgorithmRequest {
  name?: string;
  parameters?: Record<string, any>;
  risk_limits?: Partial<AlgorithmRiskLimits>;
  market_conditions?: Partial<AlgorithmConfig['market_conditions']>;
  execution_settings?: Partial<AlgorithmConfig['execution_settings']>;
  is_active?: boolean;
}

export interface AlgorithmExecutionRequest {
  algorithm_id: string;
  symbol?: string;
  force_execution?: boolean;
  override_parameters?: Record<string, any>;
}

export interface AlgorithmExecutionResponse {
  execution_id: string;
  status: 'queued' | 'executing' | 'completed' | 'failed';
  message: string;
  estimated_completion?: Date;
}

export interface AlgorithmPerformanceRequest {
  algorithm_id: string;
  period?: '1d' | '7d' | '30d' | '90d' | '1y';
  start_date?: string;
  end_date?: string;
}

export interface AlgorithmPerformanceResponse {
  algorithm: AlgorithmConfig;
  performance: AlgorithmPerformance[];
  comparative_analysis?: {
    benchmark_return: number;
    algorithm_vs_benchmark: number;
    risk_adjusted_performance: number;
  };
}

export interface AlgorithmRiskReport {
  algorithm_id: string;
  timestamp: Date;
  overall_risk_score: number; // 0-100
  risk_factors: {
    market_risk: number;
    liquidity_risk: number;
    operational_risk: number;
    model_risk: number;
  };
  var_analysis: {
    daily_var: number;
    weekly_var: number;
    monthly_var: number;
    confidence_level: number;
  };
  stress_test_results: Record<string, {
    scenario: string;
    loss_percentage: number;
    probability: number;
  }>;
  recommendations: string[];
}

export interface AlgorithmOptimizationRequest {
  algorithm_id: string;
  optimization_target: 'return' | 'sharpe_ratio' | 'win_rate' | 'drawdown_minimization';
  parameter_ranges: Record<string, { min: number; max: number; step?: number }>;
  constraints: {
    max_drawdown_limit?: number;
    min_return_target?: number;
    max_positions?: number;
  };
  backtest_period: {
    start: string;
    end: string;
  };
}

export interface AlgorithmOptimizationResponse {
  optimized_parameters: Record<string, any>;
  performance_improvement: {
    original_metrics: Partial<AlgorithmPerformance['metrics']>;
    optimized_metrics: Partial<AlgorithmPerformance['metrics']>;
    improvement_percentage: Record<string, number>;
  };
  optimization_metadata: {
    iterations: number;
    convergence_score: number;
    computation_time: number;
  };
}

// OpenRouter AI Types & Interfaces

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  repetition_penalty?: number;
  logit_bias?: Record<string, number>;
  seed?: number;
  stop?: string[];
  tools?: any[];
  tool_choice?: any;
  response_format?: {
    type: 'text' | 'json_object';
  };
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
      tool_calls?: any[];
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code?: number;
  };
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
    request?: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: any;
}