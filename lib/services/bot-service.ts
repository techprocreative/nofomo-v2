import { MT5Bot, CreateMT5BotRequest, UpdateMT5BotRequest } from '@/lib/types';
import { BotRepository } from '@/lib/repositories/bot-repository';
import { Cache } from '@/lib/cache';
import { mt5Service } from './mt5-service';

export interface IBotService {
  getBotsByUser(userId: string): Promise<MT5Bot[]>;
  getActiveBotsByUser(userId: string): Promise<MT5Bot[]>;
  getBotById(id: string): Promise<MT5Bot | null>;
  createBot(userId: string, data: CreateMT5BotRequest): Promise<MT5Bot>;
  updateBot(id: string, data: UpdateMT5BotRequest): Promise<MT5Bot | null>;
  activateBot(id: string): Promise<MT5Bot | null>;
  deactivateBot(id: string): Promise<MT5Bot | null>;
  updateLastRun(id: string, lastRun?: string): Promise<MT5Bot | null>;
  updatePerformanceMetrics(id: string, metrics: Record<string, any>): Promise<MT5Bot | null>;
  validateBotConnection(bot: MT5Bot): Promise<boolean>;
  getBotStats(userId: string): Promise<{ total: number; active: number; inactive: number }>;
  executeBotTrades(botId: string): Promise<{ executed: number; failed: number }>;
  startAutomatedTrading(userId: string): Promise<void>;
  stopAutomatedTrading(userId: string): Promise<void>;
}

export class BotService implements IBotService {
  constructor(
    private botRepository: BotRepository,
    private cache: Cache
  ) {}

  async getBotsByUser(userId: string): Promise<MT5Bot[]> {
    const cacheKey = `bots:user:${userId}`;
    const cached = this.cache.get<MT5Bot[]>(cacheKey);
    if (cached) return cached;

    const bots = await this.botRepository.findByUserId(userId);
    this.cache.set(cacheKey, bots, 300000); // 5 minutes
    return bots;
  }

  async getActiveBotsByUser(userId: string): Promise<MT5Bot[]> {
    const cacheKey = `bots:active:user:${userId}`;
    const cached = this.cache.get<MT5Bot[]>(cacheKey);
    if (cached) return cached;

    const bots = await this.botRepository.findActiveBotsByUserId(userId);
    this.cache.set(cacheKey, bots, 60000); // 1 minute for active bots
    return bots;
  }

  async getBotById(id: string): Promise<MT5Bot | null> {
    const cacheKey = `bot:${id}`;
    const cached = this.cache.get<MT5Bot>(cacheKey);
    if (cached) return cached;

    const bot = await this.botRepository.findById(id);
    if (bot) {
      this.cache.set(cacheKey, bot, 300000);
    }
    return bot;
  }

  async createBot(userId: string, data: CreateMT5BotRequest): Promise<MT5Bot> {
    // Validate MT5 credentials format
    if (!this.validateMT5Credentials(data.mt5_account_id, data.api_key)) {
      throw new Error('Invalid MT5 credentials format');
    }

    const bot = await this.botRepository.create({
      ...data,
      user_id: userId,
      is_active: data.is_active || false,
      performance_metrics: data.performance_metrics || {},
    });

    // Invalidate caches
    this.invalidateUserCache(userId);

    return bot;
  }

  async updateBot(id: string, data: UpdateMT5BotRequest): Promise<MT5Bot | null> {
    // Validate credentials if provided
    if (data.mt5_account_id && data.api_key && !this.validateMT5Credentials(data.mt5_account_id, data.api_key)) {
      throw new Error('Invalid MT5 credentials format');
    }

    const bot = await this.botRepository.update(id, data);

    if (bot) {
      this.cache.delete(`bot:${id}`);
      this.invalidateUserCache(bot.user_id);
    }

    return bot;
  }

  async activateBot(id: string): Promise<MT5Bot | null> {
    const bot = await this.botRepository.update(id, { is_active: true });

    if (bot) {
      this.cache.delete(`bot:${id}`);
      this.invalidateUserCache(bot.user_id);
    }

    return bot;
  }

  async deactivateBot(id: string): Promise<MT5Bot | null> {
    const bot = await this.botRepository.update(id, { is_active: false });

    if (bot) {
      this.cache.delete(`bot:${id}`);
      this.invalidateUserCache(bot.user_id);
    }

    return bot;
  }

  async updateLastRun(id: string, lastRun?: string): Promise<MT5Bot | null> {
    const bot = await this.botRepository.updateLastRun(id, lastRun);

    if (bot) {
      this.cache.delete(`bot:${id}`);
      // Don't invalidate user cache for last run updates as they're frequent
    }

    return bot;
  }

  async updatePerformanceMetrics(id: string, metrics: Record<string, any>): Promise<MT5Bot | null> {
    const bot = await this.botRepository.updatePerformanceMetrics(id, metrics);

    if (bot) {
      this.cache.delete(`bot:${id}`);
      // Don't invalidate user cache for metrics updates as they're frequent
    }

    return bot;
  }

  async validateBotConnection(bot: MT5Bot): Promise<boolean> {
    try {
      // First validate credentials format
      if (!this.validateMT5Credentials(bot.mt5_account_id, bot.api_key)) {
        return false;
      }

      // Test actual MT5 connection and basic operations
      const connectionResult = await mt5Service.connect();
      if (!connectionResult.success) {
        console.error('MT5 connection failed for bot validation:', connectionResult.error);
        return false;
      }

      // Test account info retrieval
      const accountResult = await mt5Service.getAccountInfo();
      if (!accountResult.success) {
        console.error('MT5 account info retrieval failed for bot validation:', accountResult.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Bot connection validation error:', error);
      return false;
    }
  }

  async getBotStats(userId: string): Promise<{ total: number; active: number; inactive: number }> {
    const bots = await this.getBotsByUser(userId);

    return bots.reduce(
      (acc, bot) => {
        acc.total++;
        bot.is_active ? acc.active++ : acc.inactive++;
        return acc;
      },
      { total: 0, active: 0, inactive: 0 }
    );
  }

  private validateMT5Credentials(accountId: string, apiKey?: string): boolean {
    // Basic validation - in real app, this would be more sophisticated
    if (!accountId || accountId.length < 5) return false;
    if (apiKey && apiKey.length < 10) return false;
    return true;
  }

  async executeBotTrades(botId: string): Promise<{ executed: number; failed: number }> {
    const bot = await this.getBotById(botId);
    if (!bot || !bot.is_active) {
      return { executed: 0, failed: 1 };
    }

    try {
      // Get strategy execution service and live trading service
      const { container } = await import('../di');
      const strategyExecutionService = container.resolve('StrategyExecutionService') as any;
      const liveTradingService = container.resolve('LiveTradingService') as any;

      // Execute strategy to get signals (assuming bot has strategy_id)
      const strategyId = bot.performance_metrics?.strategy_id;
      if (!strategyId) {
        return { executed: 0, failed: 1 };
      }

      const strategyService = container.resolve('StrategyService') as any;
      const strategy = await strategyService.getStrategyById(strategyId);

      if (!strategy) {
        return { executed: 0, failed: 1 };
      }

      // Get signals for the bot's symbol (assuming EURUSD as default)
      const symbol = 'EURUSD'; // In real implementation, this would be configurable per bot
      const signals = await strategyExecutionService.executeStrategy(strategy, bot.user_id, symbol);

      let executed = 0;
      let failed = 0;

      // Execute each signal
      for (const signal of signals) {
        try {
          await liveTradingService.executeSignal(signal, bot.user_id);
          executed++;
        } catch (error) {
          console.error(`Failed to execute signal for bot ${botId}:`, error);
          failed++;
        }
      }

      // Update bot last run time
      await this.updateLastRun(botId, new Date().toISOString());

      return { executed, failed };
    } catch (error) {
      console.error(`Error executing trades for bot ${botId}:`, error);
      return { executed: 0, failed: 1 };
    }
  }

  async startAutomatedTrading(userId: string): Promise<void> {
    const activeBots = await this.getActiveBotsByUser(userId);

    // Start automated execution for each active bot
    for (const bot of activeBots) {
      // In a real implementation, this would start background jobs or cron tasks
      console.log(`Starting automated trading for bot: ${bot.id}`);

      // For demonstration, execute immediately
      await this.executeBotTrades(bot.id);
    }
  }

  async stopAutomatedTrading(userId: string): Promise<void> {
    const activeBots = await this.getActiveBotsByUser(userId);

    // Deactivate all bots for the user
    for (const bot of activeBots) {
      await this.deactivateBot(bot.id);
    }

    console.log(`Stopped automated trading for user: ${userId}`);
  }

  private invalidateUserCache(userId: string): void {
    this.cache.delete(`bots:user:${userId}`);
    this.cache.delete(`bots:active:user:${userId}`);
  }
}