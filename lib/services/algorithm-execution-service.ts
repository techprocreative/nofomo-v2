import {
  AlgorithmConfig,
  AlgorithmExecution,
  AlgorithmState,
  AlgorithmPerformance,
  AlgorithmType,
  CreateAlgorithmRequest,
  UpdateAlgorithmRequest,
  AlgorithmExecutionRequest,
  AlgorithmExecutionResponse,
  AlgorithmPerformanceRequest,
  AlgorithmPerformanceResponse,
  AlgorithmRiskReport,
  AlgorithmOptimizationRequest,
  AlgorithmOptimizationResponse
} from '../types';
import { AlgorithmFactory, BaseAlgorithm } from './algorithm-engine';
import { MarketDataService } from './market-data-service';
import { RiskManagementService } from './risk-management-service';
import { LiveTradingService } from './live-trading-service';
import { cache } from '../cache';

export interface IAlgorithmExecutionService {
  createAlgorithm(userId: string, request: CreateAlgorithmRequest): Promise<AlgorithmConfig>;
  getAlgorithm(id: string): Promise<AlgorithmConfig | null>;
  getAlgorithmsByUser(userId: string): Promise<AlgorithmConfig[]>;
  updateAlgorithm(id: string, updates: UpdateAlgorithmRequest): Promise<AlgorithmConfig | null>;
  deleteAlgorithm(id: string): Promise<boolean>;
  executeAlgorithm(request: AlgorithmExecutionRequest): Promise<AlgorithmExecutionResponse>;
  getAlgorithmState(algorithmId: string): Promise<AlgorithmState | null>;
  stopAlgorithm(algorithmId: string): Promise<boolean>;
  getAlgorithmPerformance(request: AlgorithmPerformanceRequest): Promise<AlgorithmPerformanceResponse>;
  generateRiskReport(algorithmId: string): Promise<AlgorithmRiskReport>;
  optimizeAlgorithm(request: AlgorithmOptimizationRequest): Promise<AlgorithmOptimizationResponse>;
}

export class AlgorithmExecutionService implements IAlgorithmExecutionService {
  private algorithmInstances: Map<string, BaseAlgorithm> = new Map();
  private marketDataService: MarketDataService;
  private riskService: RiskManagementService;
  private liveTradingService: LiveTradingService;
  private algorithmFactory: AlgorithmFactory;

  constructor(
    marketDataService: MarketDataService,
    riskService: RiskManagementService,
    liveTradingService: LiveTradingService
  ) {
    this.marketDataService = marketDataService;
    this.riskService = riskService;
    this.liveTradingService = liveTradingService;
    this.algorithmFactory = new AlgorithmFactory(marketDataService, riskService);
  }

  async createAlgorithm(userId: string, request: CreateAlgorithmRequest): Promise<AlgorithmConfig> {
    const algorithmId = `alg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const algorithm: AlgorithmConfig = {
      id: algorithmId,
      user_id: userId,
      name: request.name,
      type: request.type,
      is_active: false,
      parameters: request.parameters,
      risk_limits: request.risk_limits ? {
        max_drawdown: request.risk_limits.max_drawdown ?? 10,
        max_daily_loss: request.risk_limits.max_daily_loss ?? 1000,
        max_single_trade_loss: request.risk_limits.max_single_trade_loss ?? 5,
        max_correlation_exposure: request.risk_limits.max_correlation_exposure ?? 50,
        circuit_breaker_threshold: request.risk_limits.circuit_breaker_threshold ?? 15,
        var_limit: request.risk_limits.var_limit ?? 1000,
        stress_test_threshold: request.risk_limits.stress_test_threshold ?? 20
      } : {
        max_drawdown: 10,
        max_daily_loss: 1000,
        max_single_trade_loss: 5,
        max_correlation_exposure: 50,
        circuit_breaker_threshold: 15,
        var_limit: 1000,
        stress_test_threshold: 20
      },
      market_conditions: request.market_conditions,
      execution_settings: request.execution_settings ? {
        max_concurrent_positions: request.execution_settings.max_concurrent_positions ?? 5,
        position_size_method: request.execution_settings.position_size_method ?? 'percentage',
        max_position_size: request.execution_settings.max_position_size ?? 10,
        min_position_size: request.execution_settings.min_position_size ?? 0.01
      } : {
        max_concurrent_positions: 5,
        position_size_method: 'percentage',
        max_position_size: 10,
        min_position_size: 0.01
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Cache the algorithm configuration
    const cacheKey = `algorithm:${algorithmId}`;
    cache.set(cacheKey, algorithm, 3600000); // Cache for 1 hour

    // Create algorithm instance
    const instance = this.algorithmFactory.createAlgorithm(algorithm);
    this.algorithmInstances.set(algorithmId, instance);

    return algorithm;
  }

  async getAlgorithm(id: string): Promise<AlgorithmConfig | null> {
    const cacheKey = `algorithm:${id}`;
    const cached = cache.get<AlgorithmConfig>(cacheKey);
    if (cached) return cached;

    // In a real implementation, this would fetch from database
    // For now, return null as we don't have persistence
    return null;
  }

  async getAlgorithmsByUser(userId: string): Promise<AlgorithmConfig[]> {
    // In a real implementation, this would query database by user_id
    // For now, return empty array
    return [];
  }

  async updateAlgorithm(id: string, updates: UpdateAlgorithmRequest): Promise<AlgorithmConfig | null> {
    const existing = await this.getAlgorithm(id);
    if (!existing) return null;

    const updated: AlgorithmConfig = {
      ...existing,
      ...updates,
      risk_limits: updates.risk_limits ? {
        max_drawdown: updates.risk_limits.max_drawdown ?? existing.risk_limits.max_drawdown,
        max_daily_loss: updates.risk_limits.max_daily_loss ?? existing.risk_limits.max_daily_loss,
        max_single_trade_loss: updates.risk_limits.max_single_trade_loss ?? existing.risk_limits.max_single_trade_loss,
        max_correlation_exposure: updates.risk_limits.max_correlation_exposure ?? existing.risk_limits.max_correlation_exposure,
        circuit_breaker_threshold: updates.risk_limits.circuit_breaker_threshold ?? existing.risk_limits.circuit_breaker_threshold,
        var_limit: updates.risk_limits.var_limit ?? existing.risk_limits.var_limit,
        stress_test_threshold: updates.risk_limits.stress_test_threshold ?? existing.risk_limits.stress_test_threshold
      } : existing.risk_limits,
      market_conditions: updates.market_conditions ? {
        ...existing.market_conditions,
        ...updates.market_conditions
      } : existing.market_conditions,
      execution_settings: updates.execution_settings ? {
        max_concurrent_positions: updates.execution_settings.max_concurrent_positions ?? existing.execution_settings.max_concurrent_positions,
        position_size_method: updates.execution_settings.position_size_method ?? existing.execution_settings.position_size_method,
        max_position_size: updates.execution_settings.max_position_size ?? existing.execution_settings.max_position_size,
        min_position_size: updates.execution_settings.min_position_size ?? existing.execution_settings.min_position_size
      } : existing.execution_settings,
      updated_at: new Date().toISOString()
    };

    const cacheKey = `algorithm:${id}`;
    cache.set(cacheKey, updated, 3600000);

    // Update algorithm instance if it exists
    if (this.algorithmInstances.has(id)) {
      const instance = this.algorithmInstances.get(id)!;
      instance.updateConfig(updated);
    }

    return updated;
  }

  async deleteAlgorithm(id: string): Promise<boolean> {
    const cacheKey = `algorithm:${id}`;
    cache.delete(cacheKey);

    // Remove algorithm instance
    this.algorithmInstances.delete(id);

    return true;
  }

  async executeAlgorithm(request: AlgorithmExecutionRequest): Promise<AlgorithmExecutionResponse> {
    const algorithm = await this.getAlgorithm(request.algorithm_id);
    if (!algorithm) {
      throw new Error('Algorithm not found');
    }

    if (!algorithm.is_active) {
      throw new Error('Algorithm is not active');
    }

    // Get algorithm instance
    let instance = this.algorithmInstances.get(request.algorithm_id);
    if (!instance) {
      instance = this.algorithmFactory.createAlgorithm(algorithm);
      this.algorithmInstances.set(request.algorithm_id, instance);
    }

    // Start execution in background
    this.executeAlgorithmAsync(instance, request).catch(error => {
      console.error(`Error executing algorithm ${request.algorithm_id}:`, error);
    });

    return {
      execution_id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'queued',
      message: 'Algorithm execution started',
      estimated_completion: new Date(Date.now() + 60000) // Estimate 1 minute
    };
  }

  private async executeAlgorithmAsync(instance: BaseAlgorithm, request: AlgorithmExecutionRequest): Promise<void> {
    const algorithm = await this.getAlgorithm(request.algorithm_id);
    if (!algorithm) return;

    // Update algorithm state to analyzing
    const state = instance.getState();
    state.status = 'analyzing';
    state.last_analysis_time = new Date();

    try {
      // Get market data for analysis
      const marketData = [];
      for (const symbol of algorithm.market_conditions.symbols) {
        const data = await this.marketDataService.getHistoricalData(
          symbol,
          algorithm.market_conditions.timeframes[0],
          100
        );
        marketData.push(...data);
      }

      // Get market analysis
      const analysis = await this.marketDataService.getMarketAnalysis(
        algorithm.market_conditions.symbols[0],
        algorithm.market_conditions.timeframes[0]
      );

      state.status = 'analyzing';
      state.last_analysis_time = new Date();

      // Analyze market conditions
      const analysisResult = await instance.analyze(marketData, analysis);

      // Check if we should generate a signal
      if (this.shouldGenerateSignal(analysisResult, algorithm.type)) {
        state.status = 'signaling';
        state.last_signal_time = new Date();

        // Generate signal
        const signal = await instance.generateSignal(analysisResult);
        if (signal) {
          // Validate signal
          const isValid = await instance.validateSignal(signal);
          if (isValid) {
            state.status = 'executing';
            state.last_execution_time = new Date();

            // Calculate position size
            signal.volume = await instance.calculatePositionSize(signal);

            // Assess risk
            signal.risk_assessment = await instance.assessRisk(signal);

            // Execute trade via live trading service
            await this.executeTrade(signal);

            state.current_positions += 1;
          }
        }
      }

      state.status = 'idle';
      state.health_score = Math.max(0, state.health_score - 1); // Gradually reduce health if no activity

    } catch (error) {
      console.error(`Algorithm execution error for ${request.algorithm_id}:`, error);
      state.status = 'error';
      state.error_message = error instanceof Error ? error.message : 'Unknown error';
      state.health_score = Math.max(0, state.health_score - 10);
    }
  }

  async getAlgorithmState(algorithmId: string): Promise<AlgorithmState | null> {
    const instance = this.algorithmInstances.get(algorithmId);
    if (instance) {
      return instance.getState();
    }

    // Try to get from cache
    const cacheKey = `algorithm_state:${algorithmId}`;
    const cached = cache.get<AlgorithmState>(cacheKey);
    return cached || null;
  }

  async stopAlgorithm(algorithmId: string): Promise<boolean> {
    const instance = this.algorithmInstances.get(algorithmId);
    if (instance) {
      const state = instance.getState();
      state.status = 'paused';
      return true;
    }
    return false;
  }

  async getAlgorithmPerformance(request: AlgorithmPerformanceRequest): Promise<AlgorithmPerformanceResponse> {
    // Mock performance data - in real implementation, would calculate from execution history
    const algorithm = await this.getAlgorithm(request.algorithm_id);
    if (!algorithm) {
      throw new Error('Algorithm not found');
    }

    const mockPerformance: AlgorithmPerformance = {
      id: `perf_${request.algorithm_id}_${Date.now()}`,
      algorithm_id: request.algorithm_id,
      user_id: algorithm.user_id,
      period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      period_end: new Date(),
      metrics: {
        total_return: Math.random() * 20 - 5, // -5% to 15%
        annualized_return: Math.random() * 30 - 5,
        sharpe_ratio: Math.random() * 4 + 0.5,
        sortino_ratio: Math.random() * 4 + 0.3,
        max_drawdown: Math.random() * 15,
        win_rate: Math.random() * 0.4 + 0.5, // 50-90%
        profit_factor: Math.random() * 2 + 1.2,
        total_trades: Math.floor(Math.random() * 100) + 10,
        avg_trade_duration: Math.random() * 3600 + 1800, // 30min to 1.5h
        avg_profit_per_trade: Math.random() * 50 - 10,
        avg_loss_per_trade: Math.random() * -30
      },
      risk_metrics: {
        value_at_risk: Math.random() * 1000,
        expected_shortfall: Math.random() * 1500,
        beta_to_market: Math.random() * 2 - 0.5,
        correlation_matrix: {
          'EURUSD': Math.random(),
          'GBPUSD': Math.random(),
          'USDJPY': Math.random()
        },
        stress_test_results: {
          '2023-03-13': Math.random() * -2000,
          '2020-03-16': Math.random() * -3000,
          '2011-08-04': Math.random() * -1500
        }
      },
      execution_stats: {
        signals_generated: Math.floor(Math.random() * 200) + 50,
        signals_executed: Math.floor(Math.random() * 150) + 30,
        execution_rate: Math.random() * 0.3 + 0.6,
        slippage_avg: Math.random() * 0.001,
        commission_total: Math.random() * 100
      },
      created_at: new Date()
    };

    return {
      algorithm,
      performance: [mockPerformance],
      comparative_analysis: {
        benchmark_return: Math.random() * 10,
        algorithm_vs_benchmark: mockPerformance.metrics.total_return - Math.random() * 10,
        risk_adjusted_performance: mockPerformance.metrics.sharpe_ratio
      }
    };
  }

  async generateRiskReport(algorithmId: string): Promise<AlgorithmRiskReport> {
    const algorithm = await this.getAlgorithm(algorithmId);
    if (!algorithm) {
      throw new Error('Algorithm not found');
    }

    // Mock risk report - in real implementation, would analyze historical performance
    return {
      algorithm_id: algorithmId,
      timestamp: new Date(),
      overall_risk_score: Math.random() * 100,
      risk_factors: {
        market_risk: Math.random() * 100,
        liquidity_risk: Math.random() * 100,
        operational_risk: Math.random() * 100,
        model_risk: Math.random() * 100
      },
      var_analysis: {
        daily_var: Math.random() * 1000,
        weekly_var: Math.random() * 2000,
        monthly_var: Math.random() * 4000,
        confidence_level: 0.95
      },
      stress_test_results: {
        'high_volatility': {
          scenario: 'High Volatility Environment',
          loss_percentage: Math.random() * 20,
          probability: 0.1
        },
        'flash_crash': {
          scenario: 'Flash Crash Event',
          loss_percentage: Math.random() * 50,
          probability: 0.01
        },
        'liquidity_dry_up': {
          scenario: 'Liquidity Dry-up',
          loss_percentage: Math.random() * 15,
          probability: 0.05
        }
      },
      recommendations: [
        'Reduce position sizes during high volatility periods',
        'Implement additional stop-loss mechanisms',
        'Monitor correlation risk more closely',
        'Consider diversifying across more uncorrelated assets'
      ]
    };
  }

  async optimizeAlgorithm(request: AlgorithmOptimizationRequest): Promise<AlgorithmOptimizationResponse> {
    const algorithm = await this.getAlgorithm(request.algorithm_id);
    if (!algorithm) {
      throw new Error('Algorithm not found');
    }

    // Mock optimization - in real implementation, would run parameter optimization
    const originalMetrics = {
      total_return: Math.random() * 15,
      sharpe_ratio: Math.random() * 3,
      win_rate: Math.random() * 0.3 + 0.5,
      drawdown: Math.random() * 20
    };

    const optimizedMetrics = {
      total_return: originalMetrics.total_return * (1 + Math.random() * 0.5),
      sharpe_ratio: originalMetrics.sharpe_ratio * (1 + Math.random() * 0.3),
      win_rate: Math.min(0.95, originalMetrics.win_rate + Math.random() * 0.2),
      drawdown: originalMetrics.drawdown * (1 - Math.random() * 0.4)
    };

    return {
      optimized_parameters: {
        ...algorithm.parameters,
        entry_threshold: algorithm.parameters.entry_threshold * (1 + Math.random() * 0.2 - 0.1),
        exit_threshold: algorithm.parameters.exit_threshold * (1 + Math.random() * 0.2 - 0.1)
      },
      performance_improvement: {
        original_metrics: originalMetrics,
        optimized_metrics: optimizedMetrics,
        improvement_percentage: {
          total_return: ((optimizedMetrics.total_return - originalMetrics.total_return) / originalMetrics.total_return) * 100,
          sharpe_ratio: ((optimizedMetrics.sharpe_ratio - originalMetrics.sharpe_ratio) / originalMetrics.sharpe_ratio) * 100,
          win_rate: ((optimizedMetrics.win_rate - originalMetrics.win_rate) / originalMetrics.win_rate) * 100,
          drawdown: ((originalMetrics.drawdown - optimizedMetrics.drawdown) / originalMetrics.drawdown) * 100
        }
      },
      optimization_metadata: {
        iterations: Math.floor(Math.random() * 1000) + 100,
        convergence_score: Math.random() * 0.9 + 0.1,
        computation_time: Math.random() * 300 + 60
      }
    };
  }

  private shouldGenerateSignal(analysisResult: any, algorithmType: AlgorithmType): boolean {
    switch (algorithmType) {
      case 'statistical_arbitrage':
      case 'pairs_trading':
        return analysisResult.isEntrySignal === true;
      case 'momentum':
        return analysisResult.isEntrySignal === true && analysisResult.momentum > 0;
      case 'mean_reversion':
        return analysisResult.isEntrySignal === true;
      case 'market_making':
        return analysisResult.shouldQuote === true;
      default:
        return false;
    }
  }

  private async executeTrade(signal: AlgorithmExecution): Promise<void> {
    // Create trade execution request
    const tradeRequest = {
      symbol: signal.symbol,
      volume: signal.volume,
      price: signal.entry_price,
      side: signal.side,
      type: 'market' as const,
      sl: signal.metadata.stop_loss,
      tp: signal.metadata.take_profit,
      comment: `Algorithm: ${signal.algorithm_id}`
    };

    // Execute via live trading service
    await this.liveTradingService.executeSignal({
      id: signal.id,
      strategy_id: signal.algorithm_id,
      symbol: signal.symbol,
      type: 'entry',
      side: signal.side,
      price: signal.entry_price,
      volume: signal.volume,
      confidence: 0.8,
      timestamp: new Date(),
      metadata: signal.metadata
    }, signal.user_id);
  }

  /**
   * Cleanup method to stop all algorithm instances
   */
  cleanup(): void {
    for (const instance of this.algorithmInstances.values()) {
      const state = instance.getState();
      state.status = 'paused';
    }
    this.algorithmInstances.clear();
  }
}