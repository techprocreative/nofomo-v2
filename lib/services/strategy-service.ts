import { TradingStrategy, CreateTradingStrategyRequest, UpdateTradingStrategyRequest } from '@/lib/types';
import { StrategyRepository } from '@/lib/repositories/strategy-repository';
import { Cache } from '@/lib/cache';

export interface IStrategyService {
  getStrategiesByUser(userId: string): Promise<TradingStrategy[]>;
  getActiveStrategiesByUser(userId: string): Promise<TradingStrategy[]>;
  getStrategyById(id: string): Promise<TradingStrategy | null>;
  createStrategy(userId: string, data: CreateTradingStrategyRequest): Promise<TradingStrategy>;
  updateStrategy(id: string, data: UpdateTradingStrategyRequest): Promise<TradingStrategy | null>;
  activateStrategy(id: string): Promise<TradingStrategy | null>;
  archiveStrategy(id: string): Promise<TradingStrategy | null>;
  validateStrategyData(data: Record<string, any>): boolean;
  aggregateStrategiesByUser(userId: string): Promise<{ total: number; active: number; draft: number; archived: number }>;
}

export class StrategyService implements IStrategyService {
  constructor(
    private strategyRepository: StrategyRepository,
    private cache: Cache
  ) {}

  async getStrategiesByUser(userId: string): Promise<TradingStrategy[]> {
    const cacheKey = `strategies:user:${userId}`;
    const cached = this.cache.get<TradingStrategy[]>(cacheKey);
    if (cached) return cached;

    const strategies = await this.strategyRepository.findByUserId(userId);
    this.cache.set(cacheKey, strategies, 300000); // 5 minutes
    return strategies;
  }

  async getActiveStrategiesByUser(userId: string): Promise<TradingStrategy[]> {
    const cacheKey = `strategies:active:user:${userId}`;
    const cached = this.cache.get<TradingStrategy[]>(cacheKey);
    if (cached) return cached;

    const strategies = await this.strategyRepository.findActiveByUserId(userId);
    this.cache.set(cacheKey, strategies, 300000);
    return strategies;
  }

  async getStrategyById(id: string): Promise<TradingStrategy | null> {
    const cacheKey = `strategy:${id}`;
    const cached = this.cache.get<TradingStrategy>(cacheKey);
    if (cached) return cached;

    const strategy = await this.strategyRepository.findById(id);
    if (strategy) {
      this.cache.set(cacheKey, strategy, 300000);
    }
    return strategy;
  }

  async createStrategy(userId: string, data: CreateTradingStrategyRequest): Promise<TradingStrategy> {
    // Validate strategy data
    if (!this.validateStrategyData(data.strategy_data || {})) {
      throw new Error('Invalid strategy data format');
    }

    const strategy = await this.strategyRepository.create({
      ...data,
      user_id: userId,
      status: data.status || 'draft',
      is_ai_generated: data.is_ai_generated || false,
    });

    // Invalidate cache
    this.invalidateUserCache(userId);

    return strategy;
  }

  async updateStrategy(id: string, data: UpdateTradingStrategyRequest): Promise<TradingStrategy | null> {
    // Validate strategy data if provided
    if (data.strategy_data && !this.validateStrategyData(data.strategy_data)) {
      throw new Error('Invalid strategy data format');
    }

    const strategy = await this.strategyRepository.update(id, data);

    if (strategy) {
      // Invalidate caches
      this.cache.delete(`strategy:${id}`);
      this.invalidateUserCache(strategy.user_id);
    }

    return strategy;
  }

  async activateStrategy(id: string): Promise<TradingStrategy | null> {
    const strategy = await this.strategyRepository.updateStatus(id, 'active');

    if (strategy) {
      this.cache.delete(`strategy:${id}`);
      this.invalidateUserCache(strategy.user_id);
    }

    return strategy;
  }

  async archiveStrategy(id: string): Promise<TradingStrategy | null> {
    const strategy = await this.strategyRepository.updateStatus(id, 'archived');

    if (strategy) {
      this.cache.delete(`strategy:${id}`);
      this.invalidateUserCache(strategy.user_id);
    }

    return strategy;
  }

  validateStrategyData(data: Record<string, any>): boolean {
    // Basic validation - can be extended based on strategy format
    if (typeof data !== 'object' || data === null) return false;

    // Check for required fields (example)
    const requiredFields = ['indicators', 'conditions'];
    return requiredFields.every(field => field in data);
  }

  async aggregateStrategiesByUser(userId: string): Promise<{ total: number; active: number; draft: number; archived: number }> {
    const strategies = await this.getStrategiesByUser(userId);

    return strategies.reduce(
      (acc, strategy) => {
        acc.total++;
        acc[strategy.status]++;
        return acc;
      },
      { total: 0, active: 0, draft: 0, archived: 0 }
    );
  }

  private invalidateUserCache(userId: string): void {
    this.cache.delete(`strategies:user:${userId}`);
    this.cache.delete(`strategies:active:user:${userId}`);
  }
}