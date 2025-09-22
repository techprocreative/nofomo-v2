import { PerformanceAnalytics, CreatePerformanceAnalyticsRequest } from '@/lib/types';
import { AnalyticsRepository } from '@/lib/repositories/analytics-repository';
import { Cache } from '@/lib/cache';

export interface IAnalyticsService {
  getAnalyticsByUser(userId: string): Promise<PerformanceAnalytics[]>;
  getAnalyticsByStrategy(strategyId: string): Promise<PerformanceAnalytics[]>;
  getAnalyticsByBot(botId: string): Promise<PerformanceAnalytics[]>;
  getAnalyticsByDateRange(userId: string, startDate: string, endDate: string): Promise<PerformanceAnalytics[]>;
  createAnalytics(userId: string, data: CreatePerformanceAnalyticsRequest): Promise<PerformanceAnalytics>;
  batchCreateAnalytics(analytics: CreatePerformanceAnalyticsRequest[]): Promise<PerformanceAnalytics[]>;
  calculateTotalReturn(userId: string, period?: 'daily' | 'weekly' | 'monthly'): Promise<number>;
  calculateSharpeRatio(userId: string, period?: 'daily' | 'weekly' | 'monthly'): Promise<number>;
  calculateMaxDrawdown(userId: string): Promise<number>;
  calculateWinRate(userId: string): Promise<number>;
  generatePerformanceReport(userId: string, startDate: string, endDate: string): Promise<{
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
    avgTradeSize: number;
  }>;
}

export class AnalyticsService implements IAnalyticsService {
  constructor(
    private analyticsRepository: AnalyticsRepository,
    private cache: Cache
  ) {}

  async getAnalyticsByUser(userId: string): Promise<PerformanceAnalytics[]> {
    const cacheKey = `analytics:user:${userId}`;
    const cached = this.cache.get<PerformanceAnalytics[]>(cacheKey);
    if (cached) return cached;

    const analytics = await this.analyticsRepository.findByUserId(userId);
    this.cache.set(cacheKey, analytics, 300000); // 5 minutes
    return analytics;
  }

  async getAnalyticsByStrategy(strategyId: string): Promise<PerformanceAnalytics[]> {
    const cacheKey = `analytics:strategy:${strategyId}`;
    const cached = this.cache.get<PerformanceAnalytics[]>(cacheKey);
    if (cached) return cached;

    const analytics = await this.analyticsRepository.findByStrategyId(strategyId);
    this.cache.set(cacheKey, analytics, 300000);
    return analytics;
  }

  async getAnalyticsByBot(botId: string): Promise<PerformanceAnalytics[]> {
    const cacheKey = `analytics:bot:${botId}`;
    const cached = this.cache.get<PerformanceAnalytics[]>(cacheKey);
    if (cached) return cached;

    const analytics = await this.analyticsRepository.findByBotId(botId);
    this.cache.set(cacheKey, analytics, 300000);
    return analytics;
  }

  async getAnalyticsByDateRange(userId: string, startDate: string, endDate: string): Promise<PerformanceAnalytics[]> {
    const cacheKey = `analytics:user:${userId}:${startDate}:${endDate}`;
    const cached = this.cache.get<PerformanceAnalytics[]>(cacheKey);
    if (cached) return cached;

    const analytics = await this.analyticsRepository.findByDateRange(userId, startDate, endDate);
    this.cache.set(cacheKey, analytics, 300000);
    return analytics;
  }

  async createAnalytics(userId: string, data: CreatePerformanceAnalyticsRequest): Promise<PerformanceAnalytics> {
    const analytics = await this.analyticsRepository.create({
      ...data,
      user_id: userId,
      date: data.date || new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    });

    // Invalidate caches
    this.invalidateUserCache(userId);

    return analytics;
  }

  async batchCreateAnalytics(analytics: CreatePerformanceAnalyticsRequest[]): Promise<PerformanceAnalytics[]> {
    const analyticsWithDefaults = analytics.map(item => ({
      ...item,
      date: item.date || new Date().toISOString().split('T')[0],
    }));

    const createdAnalytics = await this.analyticsRepository.batchCreate(analyticsWithDefaults);

    // Invalidate caches for affected users
    const userIds = [...new Set(createdAnalytics.map(a => a.user_id))];
    userIds.forEach(userId => this.invalidateUserCache(userId));

    return createdAnalytics;
  }

  async calculateTotalReturn(userId: string, period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<number> {
    const cacheKey = `analytics:return:${userId}:${period}`;
    const cached = this.cache.get<number>(cacheKey);
    if (cached !== undefined) return cached;

    const returnValue = await this.analyticsRepository.aggregateMetrics(userId, 'total_return', period);
    this.cache.set(cacheKey, returnValue, 600000); // 10 minutes
    return returnValue;
  }

  async calculateSharpeRatio(userId: string, period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<number> {
    const cacheKey = `analytics:sharpe:${userId}:${period}`;
    const cached = this.cache.get<number>(cacheKey);
    if (cached !== undefined) return cached;

    const sharpeRatio = await this.analyticsRepository.aggregateMetrics(userId, 'sharpe_ratio', period);
    this.cache.set(cacheKey, sharpeRatio, 600000);
    return sharpeRatio;
  }

  async calculateMaxDrawdown(userId: string): Promise<number> {
    const cacheKey = `analytics:drawdown:${userId}`;
    const cached = this.cache.get<number>(cacheKey);
    if (cached !== undefined) return cached;

    const analytics = await this.getAnalyticsByUser(userId);
    const drawdownValues = analytics
      .filter(a => a.metric_name === 'max_drawdown')
      .map(a => a.metric_value);

    const maxDrawdown = drawdownValues.length > 0 ? Math.max(...drawdownValues) : 0;
    this.cache.set(cacheKey, maxDrawdown, 600000);
    return maxDrawdown;
  }

  async calculateWinRate(userId: string): Promise<number> {
    const cacheKey = `analytics:winrate:${userId}`;
    const cached = this.cache.get<number>(cacheKey);
    if (cached !== undefined) return cached;

    const analytics = await this.getAnalyticsByUser(userId);
    const winRateMetrics = analytics
      .filter(a => a.metric_name === 'win_rate')
      .map(a => a.metric_value);

    const winRate = winRateMetrics.length > 0
      ? winRateMetrics.reduce((sum, rate) => sum + rate, 0) / winRateMetrics.length
      : 0;

    this.cache.set(cacheKey, winRate, 600000);
    return winRate;
  }

  async generatePerformanceReport(userId: string, startDate: string, endDate: string): Promise<{
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
    avgTradeSize: number;
  }> {
    const cacheKey = `report:${userId}:${startDate}:${endDate}`;
    const cached = this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const [analytics, totalReturn, sharpeRatio, maxDrawdown, winRate] = await Promise.all([
      this.getAnalyticsByDateRange(userId, startDate, endDate),
      this.calculateTotalReturn(userId),
      this.calculateSharpeRatio(userId),
      this.calculateMaxDrawdown(userId),
      this.calculateWinRate(userId),
    ]);

    const tradeMetrics = analytics.filter(a => a.metric_name === 'total_trades');
    const totalTrades = tradeMetrics.length > 0
      ? tradeMetrics.reduce((sum, metric) => sum + metric.metric_value, 0)
      : 0;

    const tradeSizeMetrics = analytics.filter(a => a.metric_name === 'avg_trade_size');
    const avgTradeSize = tradeSizeMetrics.length > 0
      ? tradeSizeMetrics.reduce((sum, metric) => sum + metric.metric_value, 0) / tradeSizeMetrics.length
      : 0;

    const report = {
      totalReturn,
      sharpeRatio,
      maxDrawdown,
      winRate,
      totalTrades,
      avgTradeSize,
    };

    this.cache.set(cacheKey, report, 600000);
    return report;
  }

  private invalidateUserCache(userId: string): void {
    this.cache.delete(`analytics:user:${userId}`);
  }
}