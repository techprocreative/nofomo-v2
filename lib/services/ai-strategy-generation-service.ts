import {
  AIGeneratedStrategy,
  StrategyTemplate,
  AIModelConfig,
  StrategyPerformancePrediction,
  GenerateStrategyRequest,
  GenerateStrategyResponse,
  OptimizeStrategyRequest,
  OptimizeStrategyResponse,
  AnalyzeMarketRequest,
  AnalyzeMarketResponse,
  GetStrategyTemplatesResponse,
  MarketAnalysisForAI,
  TradingStrategy,
  BacktestResult,
  LearningFeedback
} from '@/lib/types';
import { MarketDataService } from '@/lib/services/market-data-service';
import { StrategyService } from '@/lib/services/strategy-service';
import { OpenRouterService } from '@/lib/services/openrouter-service';
import { Cache } from '@/lib/cache';

export interface IAIStrategyGenerationService {
  generateStrategy(userId: string, request: GenerateStrategyRequest): Promise<GenerateStrategyResponse>;
  optimizeStrategy(userId: string, request: OptimizeStrategyRequest): Promise<OptimizeStrategyResponse>;
  analyzeMarket(request: AnalyzeMarketRequest): Promise<AnalyzeMarketResponse>;
  getStrategyTemplates(): Promise<GetStrategyTemplatesResponse>;
  provideFeedback(strategyId: string, feedback: LearningFeedback): Promise<void>;
}

// Mock ML Components - In production, these would use actual ML libraries
class PatternRecognitionModel {
  async recognizePatterns(marketData: any[], symbol: string): Promise<any[]> {
    // Simple pattern recognition using technical indicators
    const patterns = [];

    // Moving average crossover detection
    const sma20 = this.calculateSMA(marketData, 20);
    const sma50 = this.calculateSMA(marketData, 50);

    const last20 = sma20[sma20.length - 1];
    const last50 = sma50[sma50.length - 1];
    const prev20 = sma20[sma20.length - 2];
    const prev50 = sma50[sma50.length - 2];

    if (prev20 <= prev50 && last20 > last50) {
      patterns.push({
        pattern_type: 'golden_cross',
        confidence: 0.8,
        direction: 'bullish',
        timeframe: 'daily'
      });
    } else if (prev20 >= prev50 && last20 < last50) {
      patterns.push({
        pattern_type: 'death_cross',
        confidence: 0.8,
        direction: 'bearish',
        timeframe: 'daily'
      });
    }

    // RSI divergence (simplified)
    const rsi = this.calculateRSI(marketData, 14);
    // Add more pattern recognition logic here

    return patterns;
  }

  private calculateSMA(data: any[], period: number): number[] {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private calculateRSI(data: any[], period: number): number[] {
    const rsi = [];
    const gains = [];
    const losses = [];

    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }

    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }

    return rsi;
  }
}

class StrategyOptimizationModel {
  async optimizeParameters(strategy: TradingStrategy, marketData: any[], constraints: any): Promise<any> {
    // Simple parameter optimization using grid search
    const paramRanges = constraints.search_space || {};
    const combinations = this.generateParameterCombinations(paramRanges);

    let bestCombination = null;
    let bestScore = -Infinity;

    for (const params of combinations) {
      const score = await this.evaluateStrategyPerformance(strategy, params, marketData);
      if (score > bestScore) {
        bestScore = score;
        bestCombination = params;
      }
    }

    return {
      best_parameters: bestCombination,
      improvement_metrics: { score: bestScore },
      convergence_info: { iterations: combinations.length }
    };
  }

  private generateParameterCombinations(ranges: Record<string, any>): any[] {
    // Simple grid search implementation
    const keys = Object.keys(ranges);
    if (keys.length === 0) return [{}];

    const values = keys.map(key => {
      const range = ranges[key];
      if (Array.isArray(range)) return range;
      if (typeof range === 'object' && 'min' in range && 'max' in range) {
        const { min, max, step = 1 } = range;
        const count = Math.floor((max - min) / step) + 1;
        return Array.from({ length: count }, (_, i) => min + i * step);
      }
      return [range];
    });

    return this.cartesianProduct(values).map(combination =>
      keys.reduce((obj, key, index) => ({ ...obj, [key]: combination[index] }), {})
    );
  }

  private cartesianProduct(arrays: any[][]): any[] {
    return arrays.reduce((acc, curr) =>
      acc.flatMap(x => curr.map(y => [...x, y])), [[]]
    );
  }

  private async evaluateStrategyPerformance(strategy: TradingStrategy, params: any, marketData: any[]): Promise<number> {
    // Mock performance evaluation - in production, this would run backtests
    const riskAdjustedReturn = Math.random() * 2 - 0.5; // -0.5 to 1.5
    const drawdownPenalty = Math.random() * 0.3;
    return riskAdjustedReturn - drawdownPenalty;
  }
}

class SentimentAnalysisModel {
  async analyzeSentiment(symbol: string): Promise<number> {
    // Mock sentiment analysis - in production, this would analyze news, social media, etc.
    return Math.random() * 2 - 1; // -1 to 1
  }
}

export class AIStrategyGenerationService implements IAIStrategyGenerationService {
  private patternModel = new PatternRecognitionModel();
  private optimizationModel = new StrategyOptimizationModel();
  private sentimentModel = new SentimentAnalysisModel();
  private openRouterService: OpenRouterService | null = null;
  private openRouterInitialized = false;

  constructor(
    private marketDataService?: MarketDataService,
    private strategyService?: StrategyService,
    private cache?: Cache
  ) {
    // Initialize OpenRouter service lazily to avoid DI container issues
    this.initializeOpenRouter();
    console.log('AIStrategyGenerationService initialized with OpenRouter');
  }

  private initializeOpenRouter() {
    try {
      if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your_openrouter_api_key_here') {
        this.openRouterService = new OpenRouterService();
        this.openRouterInitialized = true;
        console.log('OpenRouter service initialized successfully');
      } else {
        console.log('OpenRouter API key not configured, using mock implementations');
        this.openRouterService = null;
        this.openRouterInitialized = false;
      }
    } catch (error) {
      console.warn('OpenRouter service initialization failed, falling back to mock implementations:', error);
      this.openRouterService = null;
      this.openRouterInitialized = false;
    }
  }

  private getOpenRouterService(): OpenRouterService | null {
    if (!this.openRouterInitialized) {
      this.initializeOpenRouter();
    }
    return this.openRouterService;
  }

  async generateStrategy(userId: string, request: GenerateStrategyRequest): Promise<GenerateStrategyResponse> {
    if (!this.marketDataService || !this.strategyService || !this.cache) {
      throw new Error('AI Strategy Generation Service not properly initialized');
    }
    try {
      // Get market data for analysis
      const marketData = await this.marketDataService.getHistoricalData(
        request.target_instruments[0],
        request.timeframe,
        1000
      );

      // Analyze market conditions
      const marketAnalysis = await this.analyzeMarketConditions(request.target_instruments[0], marketData);

      // Get custom parameters
      const customParams = request.custom_parameters || {};
      const aiPrompt = customParams.ai_prompt || 'Generate a profitable trading strategy';

      // Generate strategy using OpenRouter AI
      let generatedStrategy: AIGeneratedStrategy;
      let performancePrediction: StrategyPerformancePrediction;
      let backtestResults: BacktestResult;

      const openRouter = this.getOpenRouterService();
      if (openRouter) {
        // Use OpenRouter for strategy generation
        try {
          const strategyJson = await openRouter.generateTradingStrategy(
            aiPrompt,
            {
              marketData,
              marketAnalysis,
              riskProfile: request.risk_profile,
              timeframe: request.timeframe,
              instruments: request.target_instruments
            },
            request.risk_profile
          );

          const parsedStrategy = JSON.parse(strategyJson);

          // Create strategy from AI response
          generatedStrategy = await this.createStrategyFromAIPrompt(
            userId,
            parsedStrategy,
            request
          );

          // Run backtest
          backtestResults = await this.runMockBacktest(generatedStrategy, marketData);

          // Generate performance prediction
          performancePrediction = this.predictStrategyPerformance(generatedStrategy, backtestResults);
        } catch (aiError) {
          console.warn('AI strategy generation failed, falling back to template-based generation:', aiError);
          // Fallback to template-based generation
          generatedStrategy = await this.createFallbackStrategy(userId, request);
          backtestResults = await this.runMockBacktest(generatedStrategy, marketData);
          performancePrediction = this.predictStrategyPerformance(generatedStrategy, backtestResults);
        }
      } else {
        // Fallback to template-based generation if OpenRouter is not available
        console.warn('OpenRouter not available, using template-based generation');

        // Get strategy template if specified
        let strategyTemplate: StrategyTemplate | null = null;
        if (request.template_id) {
          strategyTemplate = await this.getStrategyTemplateById(request.template_id);
        }

        generatedStrategy = await this.createStrategyFromAnalysis(
          userId,
          marketAnalysis,
          strategyTemplate,
          request
        );

        // Run backtest
        backtestResults = await this.runMockBacktest(generatedStrategy, marketData);

        // Generate performance prediction
        performancePrediction = this.predictStrategyPerformance(generatedStrategy, backtestResults);
      }

      return {
        strategy: generatedStrategy,
        performance_prediction: performancePrediction,
        backtest_results: backtestResults,
        confidence_score: this.openRouterService ? Math.floor(Math.random() * 20 + 80) : Math.floor(Math.random() * 30 + 70)
      };
    } catch (error) {
      throw new Error(`Failed to generate strategy: ${error}`);
    }
  }

  async optimizeStrategy(userId: string, request: OptimizeStrategyRequest): Promise<OptimizeStrategyResponse> {
    if (!this.marketDataService || !this.strategyService || !this.cache) {
      throw new Error('AI Strategy Generation Service not properly initialized');
    }
    try {
      const originalStrategy = await this.strategyService.getStrategyById(request.strategy_id);
      if (!originalStrategy) {
        throw new Error('Strategy not found');
      }

      // Get market data
      const marketData = await this.marketDataService.getHistoricalData(
        'EURUSD', // Default symbol
        '1h',
        1000
      );

      let optimizationResults: any;
      let optimizedStrategy: AIGeneratedStrategy;

      const openRouter = this.getOpenRouterService();
      if (openRouter) {
        // Use OpenRouter for AI-powered optimization
        const optimizationGoals = ['max_return', 'min_drawdown', 'balanced']; // Default goals

        try {
          const aiOptimizationJson = await openRouter.optimizeStrategy(
            originalStrategy,
            await this.runMockBacktest(originalStrategy, marketData),
            optimizationGoals
          );

          const parsedOptimization = JSON.parse(aiOptimizationJson);
          optimizationResults = {
            best_parameters: parsedOptimization.parameter_optimizations || {},
            improvement_metrics: {
              score: parsedOptimization.expected_overall_improvement || 0.15
            },
            convergence_info: {
              iterations: 1,
              method: 'ai_optimization'
            }
          };

          // Create optimized strategy from AI recommendations
          optimizedStrategy = await this.createOptimizedStrategy(userId, originalStrategy, optimizationResults);
        } catch (aiError) {
          console.warn('AI optimization failed, falling back to traditional optimization:', aiError);
          // Fallback to traditional optimization
          optimizationResults = await this.optimizationModel.optimizeParameters(
            originalStrategy,
            marketData,
            request.optimization_config
          );
          optimizedStrategy = await this.createOptimizedStrategy(userId, originalStrategy, optimizationResults);
        }
      } else {
        // Use traditional optimization
        optimizationResults = await this.optimizationModel.optimizeParameters(
          originalStrategy,
          marketData,
          request.optimization_config
        );
        optimizedStrategy = await this.createOptimizedStrategy(userId, originalStrategy, optimizationResults);
      }

      // Compare backtests
      const originalBacktest = await this.runMockBacktest(originalStrategy, marketData);
      const optimizedBacktest = await this.runMockBacktest(optimizedStrategy, marketData);

      return {
        optimized_strategy: optimizedStrategy,
        optimization_results: optimizationResults,
        backtest_comparison: {
          original: originalBacktest,
          optimized: optimizedBacktest
        }
      };
    } catch (error) {
      throw new Error(`Failed to optimize strategy: ${error}`);
    }
  }

  async analyzeMarket(request: AnalyzeMarketRequest): Promise<AnalyzeMarketResponse> {
    if (!this.marketDataService) {
      throw new Error('AI Strategy Generation Service not properly initialized');
    }
    const analyses: MarketAnalysisForAI[] = [];

    for (const symbol of request.symbols) {
      const marketData = await this.marketDataService.getHistoricalData(
        symbol,
        request.timeframe,
        500
      );

      let analysis: MarketAnalysisForAI;

      const openRouter = this.getOpenRouterService();
      if (openRouter && request.analysis_depth !== 'basic') {
        // Use OpenRouter for detailed analysis
        const aiAnalysisType = request.analysis_depth === 'detailed' ? 'technical' : request.analysis_depth as 'comprehensive';

        try {
          const aiAnalysisJson = await openRouter.analyzeMarket(
            {
              symbol,
              marketData,
              timeframe: request.timeframe,
              analysis_depth: aiAnalysisType
            },
            request.timeframe,
            aiAnalysisType
          );

          const parsedAnalysis = JSON.parse(aiAnalysisJson);
          analysis = {
            symbol,
            timestamp: new Date(),
            technical_patterns: parsedAnalysis.technical_patterns || [],
            sentiment_score: parsedAnalysis.sentiment_score || 0,
            volatility_index: parsedAnalysis.volatility_index || 0,
            trend_analysis: parsedAnalysis.trend_analysis || { primary_trend: 'sideways', trend_strength: 0, cycle_position: 0.5 },
            correlation_matrix: parsedAnalysis.correlation_matrix || {},
            liquidity_assessment: parsedAnalysis.liquidity_assessment || {
              volume_profile: [],
              spread_cost: 0.0001,
              market_depth: 100
            }
          };
        } catch (aiError) {
          console.warn(`AI market analysis failed for ${symbol}, falling back to technical analysis:`, aiError);
          analysis = await this.analyzeMarketConditions(symbol, marketData);
        }
      } else {
        // Use traditional technical analysis
        analysis = await this.analyzeMarketConditions(symbol, marketData);
      }

      analyses.push(analysis);
    }

    // Determine market regime
    const marketRegime = this.determineMarketRegime(analyses);

    return {
      analyses,
      market_regime: marketRegime,
      opportunities_score: Math.floor(Math.random() * 40 + (this.getOpenRouterService() ? 70 : 60)), // Higher score with AI
      risk_assessment: {
        overall_volatility: analyses.reduce((sum, a) => sum + a.volatility_index, 0) / analyses.length,
        trend_consensus: this.calculateTrendConsensus(analyses)
      }
    };
  }

  async getStrategyTemplates(): Promise<GetStrategyTemplatesResponse> {
    // Mock templates - in production, these would come from a database
    const templates: StrategyTemplate[] = [
      {
        id: 'trend-following-1',
        name: 'Moving Average Crossover',
        description: 'Simple trend-following strategy using SMA crossovers',
        category: 'trend_following',
        complexity: 'simple',
        required_indicators: ['SMA'],
        parameters_schema: {
          fast_period: { type: 'number', minimum: 5, maximum: 50 },
          slow_period: { type: 'number', minimum: 20, maximum: 200 }
        },
        default_parameters: { fast_period: 10, slow_period: 20 },
        performance_expectations: {
          expected_return: 0.15,
          expected_drawdown: 0.10,
          win_rate: 0.55
        },
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'mean-reversion-1',
        name: 'RSI Mean Reversion',
        description: 'Mean reversion strategy using RSI oscillator',
        category: 'mean_reversion',
        complexity: 'simple',
        required_indicators: ['RSI'],
        parameters_schema: {
          rsi_period: { type: 'number', minimum: 7, maximum: 21 },
          overbought_level: { type: 'number', minimum: 65, maximum: 80 },
          oversold_level: { type: 'number', minimum: 20, maximum: 35 }
        },
        default_parameters: { rsi_period: 14, overbought_level: 70, oversold_level: 30 },
        performance_expectations: {
          expected_return: 0.12,
          expected_drawdown: 0.08,
          win_rate: 0.60
        },
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    const categories = [...new Set(templates.map(t => t.category))];

    const response = {
      templates,
      categories,
      total_count: templates.length
    };

    // Cache if available
    if (this.cache) {
      this.cache.set('strategy_templates', response, 3600000); // 1 hour
    }

    return response;
  }

  async provideFeedback(strategyId: string, feedback: LearningFeedback): Promise<void> {
    // Store feedback for model improvement
    // In production, this would update ML models
    console.log(`Received feedback for strategy ${strategyId}:`, feedback);
  }

  private async analyzeMarketConditions(symbol: string, marketData: any[]): Promise<MarketAnalysisForAI> {
    const patterns = await this.patternModel.recognizePatterns(marketData, symbol);
    const sentiment = await this.sentimentModel.analyzeSentiment(symbol);

    // Calculate volatility
    const returns = marketData.slice(1).map((d, i) => (d.close - marketData[i].close) / marketData[i].close);
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252); // Annualized

    // Simple trend analysis
    const sma20 = this.calculateSMA(marketData.map(d => d.close), 20);
    const sma50 = this.calculateSMA(marketData.map(d => d.close), 50);
    const trendStrength = Math.abs(sma20[sma20.length - 1] - sma50[sma50.length - 1]) / sma50[sma50.length - 1];

    return {
      symbol,
      timestamp: new Date(),
      technical_patterns: patterns,
      sentiment_score: sentiment,
      volatility_index: volatility,
      trend_analysis: {
        primary_trend: sma20[sma20.length - 1] > sma50[sma50.length - 1] ? 'up' : 'down',
        trend_strength: trendStrength,
        cycle_position: 0.5 // Simplified
      },
      correlation_matrix: {}, // Would calculate correlations with other assets
      liquidity_assessment: {
        volume_profile: marketData.slice(-20).map(d => d.volume || 1),
        spread_cost: 0.0001, // Mock spread
        market_depth: 100 // Mock depth
      }
    };
  }

  private async createStrategyFromAnalysis(
    userId: string,
    marketAnalysis: MarketAnalysisForAI,
    template: StrategyTemplate | null,
    request: GenerateStrategyRequest
  ): Promise<AIGeneratedStrategy> {
    const strategyId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate strategy parameters based on market analysis
    const strategyData = template ?
      { ...template.default_parameters, ...this.adaptParametersToMarket(template.default_parameters, marketAnalysis) } :
      this.generateStrategyParameters(marketAnalysis, request.risk_profile);

    const strategy: AIGeneratedStrategy = {
      id: strategyId,
      user_id: userId,
      name: template ? `${template.name} - AI Adapted` : 'AI Generated Strategy',
      description: 'Automatically generated trading strategy based on market analysis',
      strategy_data: strategyData,
      is_ai_generated: true,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ai_model_version: this.getOpenRouterService() ? 'openrouter-1.0.0' : 'fallback-1.0.0',
      generation_params: {
        model_type: this.getOpenRouterService() ? 'openrouter' : 'fallback',
        hyperparameters: {},
        training_data_period: {
          start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        market_conditions: request.market_conditions,
        risk_parameters: {
          max_drawdown: 0.1,
          target_return: 0.2,
          position_size_limit: 0.02
        },
        feature_engineering: ['technical_indicators', 'price_action', 'volume_analysis']
      },
      confidence_score: this.openRouterService ? Math.floor(Math.random() * 20 + 80) : Math.floor(Math.random() * 30 + 70),
      generation_timestamp: new Date(),
      version: 1
    };

    return strategy;
  }

  private async createStrategyFromAIPrompt(
    userId: string,
    aiStrategyData: any,
    request: GenerateStrategyRequest
  ): Promise<AIGeneratedStrategy> {
    const strategyId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Convert AI response to strategy data format
    const strategyData = {
      indicators: aiStrategyData.indicators || ['SMA', 'RSI'],
      entry_conditions: aiStrategyData.entry_conditions || 'AI-generated entry conditions',
      exit_conditions: aiStrategyData.exit_conditions || 'AI-generated exit conditions',
      risk_management: aiStrategyData.risk_management || 'AI-generated risk management',
      position_sizing: aiStrategyData.position_sizing || 'AI-generated position sizing',
      timeframe: aiStrategyData.timeframe || request.timeframe,
      market_conditions: aiStrategyData.market_conditions || 'AI-generated market conditions'
    };

    const strategy: AIGeneratedStrategy = {
      id: strategyId,
      user_id: userId,
      name: aiStrategyData.name || 'AI Generated Strategy',
      description: aiStrategyData.description || 'Strategy generated by AI based on your requirements',
      strategy_data: strategyData,
      is_ai_generated: true,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ai_model_version: 'openrouter-1.0.0',
      generation_params: {
        model_type: 'openrouter',
        hyperparameters: {},
        training_data_period: {
          start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        market_conditions: request.market_conditions,
        risk_parameters: {
          max_drawdown: 0.1,
          target_return: 0.2,
          position_size_limit: 0.02
        },
        feature_engineering: ['ai_generated', 'custom_prompt']
      },
      confidence_score: Math.floor(Math.random() * 20 + 80),
      generation_timestamp: new Date(),
      version: 1
    };

    return strategy;
  }

  private async createFallbackStrategy(
    userId: string,
    request: GenerateStrategyRequest
  ): Promise<AIGeneratedStrategy> {
    const strategyId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create a basic strategy as fallback
    const strategyData = {
      indicators: ['SMA', 'RSI'],
      entry_conditions: 'Price above 20 SMA and RSI < 30',
      exit_conditions: 'RSI > 70 or 2% profit target',
      risk_management: 'Stop loss at 1% below entry',
      position_sizing: 'Fixed position size with max 2% account risk',
      timeframe: request.timeframe,
      market_conditions: 'General market conditions'
    };

    const strategy: AIGeneratedStrategy = {
      id: strategyId,
      user_id: userId,
      name: 'Fallback Trading Strategy',
      description: 'Basic trading strategy created due to AI service unavailability',
      strategy_data: strategyData,
      is_ai_generated: false,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ai_model_version: 'fallback-1.0.0',
      generation_params: {
        model_type: 'fallback',
        hyperparameters: {},
        training_data_period: {
          start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        market_conditions: request.market_conditions || [],
        risk_parameters: {
          max_drawdown: 0.1,
          target_return: 0.2,
          position_size_limit: 0.02
        },
        feature_engineering: ['basic_strategy']
      },
      confidence_score: Math.floor(Math.random() * 30 + 50),
      generation_timestamp: new Date(),
      version: 1
    };

    return strategy;
  }

  private adaptParametersToMarket(baseParams: any, marketAnalysis: MarketAnalysisForAI): any {
    // Adapt parameters based on market conditions
    const adapted = { ...baseParams };

    if (marketAnalysis.volatility_index > 0.02) {
      // High volatility - use wider stops
      adapted.stop_loss_multiplier = 2.0;
    }

    return adapted;
  }

  private generateStrategyParameters(marketAnalysis: MarketAnalysisForAI, riskProfile: string): any {
    // Generate parameters based on market analysis and risk profile
    const baseParams = {
      indicators: ['SMA', 'RSI'],
      entry_conditions: {
        sma_crossover: marketAnalysis.trend_analysis.primary_trend === 'up'
      },
      exit_conditions: {
        take_profit: 0.02,
        stop_loss: 0.01
      }
    };

    // Adjust based on risk profile
    if (riskProfile === 'conservative') {
      baseParams.exit_conditions.take_profit = 0.015;
      baseParams.exit_conditions.stop_loss = 0.005;
    } else if (riskProfile === 'aggressive') {
      baseParams.exit_conditions.take_profit = 0.03;
      baseParams.exit_conditions.stop_loss = 0.02;
    }

    return baseParams;
  }

  private async runMockBacktest(strategy: TradingStrategy, marketData: any[]): Promise<BacktestResult> {
    // Mock backtest - in production, this would use a proper backtesting engine
    const trades = [];
    let equity = 10000;
    let peakEquity = 10000;
    let maxDrawdown = 0;
    const equityCurve = [{ timestamp: new Date(marketData[0].timestamp), equity: 10000 }];

    // Simple mock trading logic
    for (let i = 50; i < marketData.length - 1; i++) {
      const entryPrice = marketData[i].close;
      const exitPrice = marketData[i + 5]?.close || entryPrice * 1.01; // Mock exit after 5 periods
      const pnl = (exitPrice - entryPrice) / entryPrice * 1000; // Position size 1000

      equity += pnl;
      equityCurve.push({ timestamp: new Date(marketData[i].timestamp), equity });

      if (equity > peakEquity) peakEquity = equity;
      const drawdown = (peakEquity - equity) / peakEquity;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      trades.push({
        entry_time: new Date(marketData[i].timestamp),
        exit_time: new Date(marketData[i + 5]?.timestamp || marketData[i].timestamp),
        symbol: 'EURUSD',
        side: pnl > 0 ? 'buy' as const : 'sell' as const,
        entry_price: entryPrice,
        exit_price: exitPrice,
        profit_loss: pnl,
        commission: 0.1
      });
    }

    const totalReturn = (equity - 10000) / 10000;
    const winningTrades = trades.filter(t => t.profit_loss > 0);
    const winRate = winningTrades.length / trades.length;

    return {
      strategy_id: strategy.id,
      period: {
        start: new Date(marketData[0].timestamp),
        end: new Date(marketData[marketData.length - 1].timestamp)
      },
      performance_metrics: {
        total_return: totalReturn,
        annualized_return: totalReturn * 2, // Approximate
        max_drawdown: maxDrawdown,
        sharpe_ratio: totalReturn / Math.sqrt(maxDrawdown) || 0.5,
        sortino_ratio: totalReturn / Math.sqrt(maxDrawdown) || 0.4,
        win_rate: winRate,
        profit_factor: winningTrades.reduce((sum, t) => sum + t.profit_loss, 0) /
                      Math.abs(trades.filter(t => t.profit_loss < 0).reduce((sum, t) => sum + t.profit_loss, 0)) || 1,
        calmar_ratio: totalReturn / maxDrawdown || 0.5,
        recovery_factor: 1.2,
        value_at_risk: -maxDrawdown * 10000
      },
      trade_log: trades,
      equity_curve: equityCurve,
      drawdown_analysis: {
        max_drawdown: maxDrawdown,
        average_drawdown: maxDrawdown * 0.7,
        drawdown_duration: 30,
        recovery_time: 15
      },
      risk_analysis: {
        value_at_risk: -maxDrawdown * 10000,
        expected_shortfall: -maxDrawdown * 12000
      }
    };
  }

  private predictStrategyPerformance(strategy: AIGeneratedStrategy, backtest: BacktestResult): StrategyPerformancePrediction {
    const baseReturn = backtest.performance_metrics.total_return;
    const baseDrawdown = backtest.performance_metrics.max_drawdown;
    const winRate = backtest.performance_metrics.win_rate;
    const totalTrades = backtest.trade_log.length;

    // Advanced statistical calculations
    const trades = backtest.trade_log;
    const winningTrades = trades.filter(t => t.profit_loss > 0);
    const losingTrades = trades.filter(t => t.profit_loss < 0);

    // Calculate advanced metrics
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.profit_loss, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.profit_loss, 0) / losingTrades.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * winRate) / (avgLoss * (1 - winRate)) : 0;

    // Kelly Criterion calculation
    const kellyPercentage = winRate > 0 && avgLoss > 0 ? ((winRate * avgWin / avgLoss) - (1 - winRate)) / (avgWin / avgLoss) : 0;

    // Risk-adjusted return calculations
    const riskAdjustedReturn = baseDrawdown > 0 ? baseReturn / baseDrawdown : baseReturn;
    const ulcerIndex = this.calculateUlcerIndex(backtest.equity_curve);
    const sterlingRatio = baseDrawdown > 0 ? baseReturn / ulcerIndex : baseReturn;

    // Out-of-sample adjustment (assume 70-90% of in-sample performance)
    const outOfSampleAdjustment = 0.75 + Math.random() * 0.15;
    const predictedReturn = baseReturn * outOfSampleAdjustment;

    // Advanced drawdown prediction based on volatility
    const historicalVolatility = this.calculateHistoricalVolatility(trades);
    const predictedDrawdown = Math.max(baseDrawdown, baseDrawdown * (1 + historicalVolatility * 0.5));

    // Win rate prediction with regression to mean
    const predictedWinRate = Math.max(0.45, Math.min(0.65, winRate + (0.5 - winRate) * 0.3));

    // Confidence interval based on sample size
    const standardError = totalTrades > 0 ? Math.sqrt((winRate * (1 - winRate)) / totalTrades) : 0;
    const confidenceMultiplier = totalTrades > 30 ? 1.96 : 2.58; // 95% or 99% confidence
    const marginOfError = confidenceMultiplier * standardError;

    // Determine market conditions based on strategy and backtest
    const marketConditions = this.analyzeMarketConditionsForStrategy(strategy, backtest);

    return {
      strategy_id: strategy.id,
      predicted_return: Math.max(-0.5, Math.min(1.0, predictedReturn)), // Cap between -50% and +100%
      predicted_drawdown: Math.min(0.5, predictedDrawdown), // Cap at 50%
      predicted_win_rate: predictedWinRate,
      confidence_interval: {
        lower: Math.max(-0.3, baseReturn - marginOfError * baseReturn),
        upper: Math.min(0.8, baseReturn + marginOfError * baseReturn)
      },
      risk_metrics: {
        sharpe_ratio: baseReturn / (baseDrawdown || 0.01), // Avoid division by zero
        sortino_ratio: baseReturn / (this.calculateDownsideDeviation(trades) || 0.01),
        max_drawdown: predictedDrawdown,
        value_at_risk: this.calculateValueAtRisk(trades, 0.95),
        ulcer_index: ulcerIndex,
        sterling_ratio: sterlingRatio,
        kelly_percentage: Math.max(0, Math.min(0.25, kellyPercentage)), // Cap Kelly at 25%
        profit_factor: profitFactor,
        risk_adjusted_return: riskAdjustedReturn,
        calmar_ratio: baseDrawdown > 0 ? baseReturn / baseDrawdown : 0,
        information_ratio: this.calculateInformationRatio(trades)
      },
      prediction_date: new Date(),
      prediction_horizon: totalTrades > 100 ? '6M' : '3M',
      market_conditions_assumed: marketConditions
    };
  }

  private calculateUlcerIndex(equityCurve: Array<{ timestamp: Date; equity: number }>): number {
    if (equityCurve.length < 2) return 0;

    let maxEquity = equityCurve[0].equity;
    let ulcerSum = 0;

    for (const point of equityCurve) {
      maxEquity = Math.max(maxEquity, point.equity);
      const drawdown = (maxEquity - point.equity) / maxEquity;
      ulcerSum += drawdown * drawdown;
    }

    return Math.sqrt(ulcerSum / equityCurve.length);
  }

  private calculateHistoricalVolatility(trades: any[]): number {
    if (trades.length < 2) return 0.1;

    const returns = [];
    for (let i = 1; i < trades.length; i++) {
      const prevEquity = 10000 + trades.slice(0, i).reduce((sum, t) => sum + t.profit_loss, 0);
      const currentEquity = 10000 + trades.slice(0, i + 1).reduce((sum, t) => sum + t.profit_loss, 0);
      returns.push((currentEquity - prevEquity) / prevEquity);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance * 252); // Annualized
  }

  private calculateDownsideDeviation(trades: any[]): number {
    if (trades.length < 2) return 0.1;

    const returns = [];
    for (let i = 1; i < trades.length; i++) {
      const prevEquity = 10000 + trades.slice(0, i).reduce((sum, t) => sum + t.profit_loss, 0);
      const currentEquity = 10000 + trades.slice(0, i + 1).reduce((sum, t) => sum + t.profit_loss, 0);
      returns.push((currentEquity - prevEquity) / prevEquity);
    }

    const downsideReturns = returns.filter(r => r < 0);
    if (downsideReturns.length === 0) return 0.01;

    const downsideVariance = downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length;
    return Math.sqrt(downsideVariance);
  }

  private calculateValueAtRisk(trades: any[], confidence: number): number {
    if (trades.length < 2) return -0.05;

    const returns = [];
    for (let i = 1; i < trades.length; i++) {
      const prevEquity = 10000 + trades.slice(0, i).reduce((sum, t) => sum + t.profit_loss, 0);
      const currentEquity = 10000 + trades.slice(0, i + 1).reduce((sum, t) => sum + t.profit_loss, 0);
      returns.push((currentEquity - prevEquity) / prevEquity);
    }

    returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * returns.length);
    return returns[index] || -0.05;
  }

  private calculateInformationRatio(trades: any[]): number {
    if (trades.length < 10) return 0;

    // Simplified information ratio (active return / tracking error)
    const returns = [];
    for (let i = 1; i < trades.length; i++) {
      const prevEquity = 10000 + trades.slice(0, i).reduce((sum, t) => sum + t.profit_loss, 0);
      const currentEquity = 10000 + trades.slice(0, i + 1).reduce((sum, t) => sum + t.profit_loss, 0);
      returns.push((currentEquity - prevEquity) / prevEquity);
    }

    const benchmarkReturn = 0.0001; // Assume 0.01% daily benchmark
    const activeReturns = returns.map(r => r - benchmarkReturn);
    const avgActiveReturn = activeReturns.reduce((sum, r) => sum + r, 0) / activeReturns.length;
    const trackingError = Math.sqrt(activeReturns.reduce((sum, r) => sum + Math.pow(r - avgActiveReturn, 2), 0) / activeReturns.length);

    return trackingError > 0 ? avgActiveReturn / trackingError : 0;
  }

  private analyzeMarketConditionsForStrategy(strategy: AIGeneratedStrategy, backtest: BacktestResult): Record<string, any> {
    const totalReturn = backtest.performance_metrics.total_return;
    const maxDrawdown = backtest.performance_metrics.max_drawdown;
    const winRate = backtest.performance_metrics.win_rate;
    const volatility = this.calculateHistoricalVolatility(backtest.trade_log);

    let volatilityLevel = 'low';
    if (volatility > 0.3) volatilityLevel = 'high';
    else if (volatility > 0.15) volatilityLevel = 'moderate';

    let trendCondition = 'mixed';
    if (totalReturn > 0.1) trendCondition = 'bullish';
    else if (totalReturn < -0.05) trendCondition = 'bearish';

    let riskLevel = 'moderate';
    if (maxDrawdown > 0.15) riskLevel = 'high';
    else if (maxDrawdown < 0.05) riskLevel = 'low';

    return {
      volatility: volatilityLevel,
      trend: trendCondition,
      risk_level: riskLevel,
      market_regime: winRate > 0.6 ? 'trending' : winRate < 0.4 ? 'ranging' : 'mixed',
      expected_confidence: winRate > 0.55 ? 'high' : winRate > 0.45 ? 'moderate' : 'low'
    };
  }

  private determineMarketRegime(analyses: MarketAnalysisForAI[]): string {
    const avgVolatility = analyses.reduce((sum, a) => sum + a.volatility_index, 0) / analyses.length;
    const trendingCount = analyses.filter(a => a.trend_analysis.trend_strength > 0.02).length;

    if (avgVolatility > 0.025 && trendingCount > analyses.length * 0.6) return 'trending_volatile';
    if (avgVolatility > 0.025) return 'ranging_volatile';
    if (trendingCount > analyses.length * 0.6) return 'trending_calm';
    return 'ranging_calm';
  }

  private calculateTrendConsensus(analyses: MarketAnalysisForAI[]): number {
    const upTrends = analyses.filter(a => a.trend_analysis.primary_trend === 'up').length;
    return upTrends / analyses.length;
  }

  private async getStrategyTemplateById(id: string): Promise<StrategyTemplate | null> {
    const templates = await this.getStrategyTemplates();
    return templates.templates.find(t => t.id === id) || null;
  }

  private calculateSMA(prices: number[], period: number): number[] {
    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private async createOptimizedStrategy(userId: string, original: TradingStrategy, optimizationResults: any): Promise<AIGeneratedStrategy> {
    const optimized: AIGeneratedStrategy = {
      ...original,
      id: `ai_opt_${Date.now()}`,
      name: `${original.name} (Optimized)`,
      strategy_data: {
        ...original.strategy_data,
        ...optimizationResults.best_parameters
      },
      version: (original as any).version ? (original as any).version + 1 : 1,
      parent_strategy_id: original.id,
      generation_timestamp: new Date(),
      ai_model_version: '1.0.0',
      generation_params: {
        model_type: 'ensemble',
        hyperparameters: {},
        training_data_period: {
          start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        market_conditions: [],
        risk_parameters: {
          max_drawdown: 0.1,
          target_return: 0.2,
          position_size_limit: 0.02
        },
        feature_engineering: ['parameter_optimization']
      },
      confidence_score: Math.floor(Math.random() * 20 + 80) // Higher confidence for optimized strategies
    };

    return optimized;
  }
}