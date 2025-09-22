import { Trade, CreateTradeRequest, UpdateTradeRequest } from '@/lib/types';
import { TradeRepository } from '@/lib/repositories/trade-repository';
import { Cache } from '@/lib/cache';

export interface ITradeService {
  getTradesByUser(userId: string): Promise<Trade[]>;
  getOpenTradesByUser(userId: string): Promise<Trade[]>;
  getTradeById(id: string): Promise<Trade | null>;
  createTrade(userId: string, data: CreateTradeRequest): Promise<Trade>;
  updateTrade(id: string, data: UpdateTradeRequest): Promise<Trade | null>;
  closeTrade(id: string, exitPrice: number, exitTime?: string): Promise<Trade | null>;
  batchCreateTrades(userId: string, trades: CreateTradeRequest[]): Promise<Trade[]>;
  calculateTotalPnL(userId: string): Promise<number>;
  calculateRiskExposure(userId: string): Promise<{ totalExposure: number; maxDrawdown: number }>;
  assessRiskTolerance(userId: string, trade: Partial<CreateTradeRequest>): Promise<{ approved: boolean; reason?: string }>;
}

export class TradeService implements ITradeService {
  constructor(
    private tradeRepository: TradeRepository,
    private cache: Cache
  ) {}

  async getTradesByUser(userId: string): Promise<Trade[]> {
    const cacheKey = `trades:user:${userId}`;
    const cached = this.cache.get<Trade[]>(cacheKey);
    if (cached) return cached;

    const trades = await this.tradeRepository.findByUserId(userId);
    this.cache.set(cacheKey, trades, 300000); // 5 minutes
    return trades;
  }

  async getOpenTradesByUser(userId: string): Promise<Trade[]> {
    const cacheKey = `trades:open:user:${userId}`;
    const cached = this.cache.get<Trade[]>(cacheKey);
    if (cached) return cached;

    const trades = await this.tradeRepository.findOpenTradesByUserId(userId);
    this.cache.set(cacheKey, trades, 60000); // 1 minute for open trades
    return trades;
  }

  async getTradeById(id: string): Promise<Trade | null> {
    const cacheKey = `trade:${id}`;
    const cached = this.cache.get<Trade>(cacheKey);
    if (cached) return cached;

    const trade = await this.tradeRepository.findById(id);
    if (trade) {
      this.cache.set(cacheKey, trade, 300000);
    }
    return trade;
  }

  async createTrade(userId: string, data: CreateTradeRequest): Promise<Trade> {
    // Risk assessment
    const riskAssessment = await this.assessRiskTolerance(userId, data);
    if (!riskAssessment.approved) {
      throw new Error(`Risk assessment failed: ${riskAssessment.reason}`);
    }

    const trade = await this.tradeRepository.create({
      ...data,
      user_id: userId,
      status: data.status || 'open',
      entry_time: data.entry_time || new Date().toISOString(),
    });

    // Invalidate caches
    this.invalidateUserCache(userId);

    return trade;
  }

  async updateTrade(id: string, data: UpdateTradeRequest): Promise<Trade | null> {
    const trade = await this.tradeRepository.update(id, data);

    if (trade) {
      this.cache.delete(`trade:${id}`);
      this.invalidateUserCache(trade.user_id);

      // If status changed to closed, update P&L
      if (data.status === 'closed' && trade.exit_price && !trade.profit_loss) {
        const pnl = this.tradeRepository.calculateProfitLoss(trade);
        await this.tradeRepository.update(id, { profit_loss: pnl });
      }
    }

    return trade;
  }

  async closeTrade(id: string, exitPrice: number, exitTime?: string): Promise<Trade | null> {
    const trade = await this.tradeRepository.closeTrade(id, exitPrice, exitTime);

    if (trade) {
      this.cache.delete(`trade:${id}`);
      this.invalidateUserCache(trade.user_id);
    }

    return trade;
  }

  async batchCreateTrades(userId: string, trades: CreateTradeRequest[]): Promise<Trade[]> {
    // Risk assessment for each trade
    for (const trade of trades) {
      const riskAssessment = await this.assessRiskTolerance(userId, trade);
      if (!riskAssessment.approved) {
        throw new Error(`Risk assessment failed for trade: ${riskAssessment.reason}`);
      }
    }

    const now = new Date().toISOString();
    const tradesWithUserId = trades.map(trade => ({
      ...trade,
      user_id: userId,
      status: trade.status || 'open',
      entry_time: trade.entry_time || now,
    }));

    const createdTrades = await this.tradeRepository.batchCreate(tradesWithUserId);

    // Invalidate caches
    this.invalidateUserCache(userId);

    return createdTrades;
  }

  async calculateTotalPnL(userId: string): Promise<number> {
    const trades = await this.getTradesByUser(userId);
    return trades
      .filter(trade => trade.status === 'closed' && trade.profit_loss !== null)
      .reduce((total, trade) => total + (trade.profit_loss || 0), 0);
  }

  async calculateRiskExposure(userId: string): Promise<{ totalExposure: number; maxDrawdown: number }> {
    const openTrades = await this.getOpenTradesByUser(userId);

    let totalExposure = 0;
    let maxDrawdown = 0;

    for (const trade of openTrades) {
      const exposure = trade.quantity * trade.entry_price;
      totalExposure += exposure;

      // Calculate potential drawdown based on stop loss (simplified)
      // In real app, this would consider actual stop loss levels
      const potentialLoss = exposure * 0.02; // Assume 2% risk per trade
      maxDrawdown += potentialLoss;
    }

    return { totalExposure, maxDrawdown };
  }

  async assessRiskTolerance(userId: string, trade: Partial<CreateTradeRequest>): Promise<{ approved: boolean; reason?: string }> {
    // Get user risk tolerance from profile (assuming we have access to user service)
    // For now, we'll implement basic checks

    if (!trade.symbol || !trade.quantity || !trade.entry_price) {
      return { approved: false, reason: 'Missing required trade data' };
    }

    const tradeValue = trade.quantity * trade.entry_price;

    // Basic risk checks
    if (tradeValue < 100) {
      return { approved: false, reason: 'Trade value too small' };
    }

    if (tradeValue > 100000) {
      return { approved: false, reason: 'Trade value exceeds maximum limit' };
    }

    // Check current exposure
    const exposure = await this.calculateRiskExposure(userId);
    if (exposure.totalExposure + tradeValue > 500000) {
      return { approved: false, reason: 'Total exposure would exceed risk limits' };
    }

    return { approved: true };
  }

  private invalidateUserCache(userId: string): void {
    this.cache.delete(`trades:user:${userId}`);
    this.cache.delete(`trades:open:user:${userId}`);
  }
}