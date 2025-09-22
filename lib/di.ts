import { cache } from './cache';
import { createServerSupabaseClient } from './supabase';

// Repositories
import { SupabaseUserRepository } from './repositories/user-repository';
import { SupabaseStrategyRepository } from './repositories/strategy-repository';
import { SupabaseTradeRepository } from './repositories/trade-repository';
import { SupabaseBotRepository } from './repositories/bot-repository';
import { SupabaseAnalyticsRepository } from './repositories/analytics-repository';

// Services
import { UserService } from './services/user-service';
import { StrategyService } from './services/strategy-service';
import { TradeService } from './services/trade-service';
import { BotService } from './services/bot-service';
import { AnalyticsService } from './services/analytics-service';
import { LiveTradingService } from './services/live-trading-service';
import { StrategyExecutionService } from './services/strategy-execution-service';
import { AIStrategyGenerationService } from './services/ai-strategy-generation-service';
import { RiskManagementService } from './services/risk-management-service';
import { MarketDataService } from './services/market-data-service';
import { mt5Service } from './services/mt5-service';
import { AlgorithmExecutionService } from './services/algorithm-execution-service';

export interface IServiceContainer {
  register<T>(key: string, factory: () => T): void;
  resolve<T>(key: string): T;
}

export class ServiceContainer implements IServiceContainer {
  private services = new Map<string, () => any>();
  private initialized = false;

  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory);
  }

  resolve<T>(key: string): T {
    if (!this.initialized) {
      this.initialize();
      this.initialized = true;
    }
    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service not registered: ${key}`);
    }
    return factory();
  }

  private initialize() {
    // Build-time guard: Ensure we're in runtime environment
    if (typeof window !== 'undefined') {
      throw new Error('DI container should not be used on client-side');
    }

    // Register cache
    const cacheInstance = cache;
    this.register('Cache', () => cacheInstance);

    const supabaseClient = createServerSupabaseClient() as any;
    const userRepository = new SupabaseUserRepository(supabaseClient);
    const strategyRepository = new SupabaseStrategyRepository(supabaseClient);
    const tradeRepository = new SupabaseTradeRepository(supabaseClient);
    const botRepository = new SupabaseBotRepository(supabaseClient);
    const analyticsRepository = new SupabaseAnalyticsRepository(supabaseClient);

    this.register('UserRepository', () => userRepository);
    this.register('StrategyRepository', () => strategyRepository);
    this.register('TradeRepository', () => tradeRepository);
    this.register('BotRepository', () => botRepository);
    this.register('AnalyticsRepository', () => analyticsRepository);

    const userService = new UserService(userRepository, cacheInstance);
    const strategyService = new StrategyService(strategyRepository, cacheInstance);
    const tradeService = new TradeService(tradeRepository, cacheInstance);
    const botService = new BotService(botRepository, cacheInstance);
    const analyticsService = new AnalyticsService(analyticsRepository, cacheInstance);

    this.register('UserService', () => userService);
    this.register('StrategyService', () => strategyService);
    this.register('TradeService', () => tradeService);
    this.register('BotService', () => botService);
    this.register('AnalyticsService', () => analyticsService);

    const marketDataService = new MarketDataService();

    this.register('MT5Service', () => mt5Service);
    this.register('MarketDataService', () => marketDataService);

    const liveTradingService = new LiveTradingService(mt5Service, tradeService, marketDataService, cacheInstance);
    const strategyExecutionService = new StrategyExecutionService(strategyService, marketDataService, cacheInstance);
    const riskManagementService = new RiskManagementService(cacheInstance);
    const algorithmExecutionService = new AlgorithmExecutionService(marketDataService, riskManagementService, liveTradingService);

    this.register('LiveTradingService', () => liveTradingService);
    this.register('StrategyExecutionService', () => strategyExecutionService);
    this.register('RiskManagementService', () => riskManagementService);
    this.register('AlgorithmExecutionService', () => algorithmExecutionService);

    // Lazy initialization for AI service to avoid DI container issues
    this.register('AIStrategyGenerationService', () => {
      try {
        return new AIStrategyGenerationService(marketDataService, strategyService, cacheInstance);
      } catch (error) {
        console.error('Failed to initialize AI Strategy Generation Service:', error);
        // Return a minimal service instance
        return new AIStrategyGenerationService(undefined, undefined, cacheInstance);
      }
    });
  }
}

const container = new ServiceContainer();

export { container };