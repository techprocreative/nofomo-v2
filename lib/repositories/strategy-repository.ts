import { SupabaseClient } from '@supabase/supabase-js';
import { TradingStrategy } from '@/lib/types';
import { BaseSupabaseRepository, BaseRepository } from './base-repository';

export interface StrategyRepository extends BaseRepository<TradingStrategy> {
  findByUserId(userId: string): Promise<TradingStrategy[]>;
  findActiveByUserId(userId: string): Promise<TradingStrategy[]>;
  updateStatus(id: string, status: 'draft' | 'active' | 'archived'): Promise<TradingStrategy | null>;
}

export class SupabaseStrategyRepository extends BaseSupabaseRepository<TradingStrategy> implements StrategyRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'trading_strategies');
  }

  async findByUserId(userId: string): Promise<TradingStrategy[]> {
    const { data, error } = await this.supabase
      .from('trading_strategies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findActiveByUserId(userId: string): Promise<TradingStrategy[]> {
    const { data, error } = await this.supabase
      .from('trading_strategies')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateStatus(id: string, status: 'draft' | 'active' | 'archived'): Promise<TradingStrategy | null> {
    return this.update(id, { status });
  }
}