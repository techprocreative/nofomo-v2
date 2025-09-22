import { SupabaseClient } from '@supabase/supabase-js';
import { Trade } from '@/lib/types';
import { BaseSupabaseRepository, BaseRepository } from './base-repository';

export interface TradeRepository extends BaseRepository<Trade> {
  findByUserId(userId: string): Promise<Trade[]>;
  findOpenTradesByUserId(userId: string): Promise<Trade[]>;
  findByStrategyId(strategyId: string): Promise<Trade[]>;
  closeTrade(id: string, exitPrice: number, exitTime?: string): Promise<Trade | null>;
  calculateProfitLoss(trade: Trade): number;
  batchCreate(trades: Partial<Trade>[]): Promise<Trade[]>;
}

export class SupabaseTradeRepository extends BaseSupabaseRepository<Trade> implements TradeRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'trades');
  }

  async findByUserId(userId: string): Promise<Trade[]> {
    const { data, error } = await this.supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('entry_time', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findOpenTradesByUserId(userId: string): Promise<Trade[]> {
    const { data, error } = await this.supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open')
      .order('entry_time', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findByStrategyId(strategyId: string): Promise<Trade[]> {
    const { data, error } = await this.supabase
      .from('trades')
      .select('*')
      .eq('strategy_id', strategyId)
      .order('entry_time', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async closeTrade(id: string, exitPrice: number, exitTime?: string): Promise<Trade | null> {
    const trade = await this.findById(id);
    if (!trade) return null;

    const profitLoss = this.calculateProfitLoss({ ...trade, exit_price: exitPrice });
    const updateData = {
      exit_price: exitPrice,
      exit_time: exitTime || new Date().toISOString(),
      profit_loss: profitLoss,
      status: 'closed' as const,
      updated_at: new Date().toISOString()
    };

    return this.update(id, updateData);
  }

  calculateProfitLoss(trade: Trade): number {
    if (!trade.exit_price) return 0;

    const pnl = (trade.exit_price - trade.entry_price) * trade.quantity;
    return trade.side === 'sell' ? -pnl : pnl; // For sell, it's negative if price goes up
  }

  async batchCreate(trades: Partial<Trade>[]): Promise<Trade[]> {
    const now = new Date().toISOString();
    const dataWithTimestamps = trades.map(trade => ({
      ...trade,
      created_at: now,
      updated_at: now
    }));

    const { data, error } = await this.supabase
      .from('trades')
      .insert(dataWithTimestamps)
      .select();

    if (error) throw error;
    return data || [];
  }
}