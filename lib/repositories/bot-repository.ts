import { SupabaseClient } from '@supabase/supabase-js';
import { MT5Bot } from '@/lib/types';
import { BaseSupabaseRepository, BaseRepository } from './base-repository';

export interface BotRepository extends BaseRepository<MT5Bot> {
  findByUserId(userId: string): Promise<MT5Bot[]>;
  findActiveBotsByUserId(userId: string): Promise<MT5Bot[]>;
  updateLastRun(id: string, lastRun?: string): Promise<MT5Bot | null>;
  updatePerformanceMetrics(id: string, metrics: Record<string, any>): Promise<MT5Bot | null>;
}

export class SupabaseBotRepository extends BaseSupabaseRepository<MT5Bot> implements BotRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'mt5_bots');
  }

  async findByUserId(userId: string): Promise<MT5Bot[]> {
    const { data, error } = await this.supabase
      .from('mt5_bots')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findActiveBotsByUserId(userId: string): Promise<MT5Bot[]> {
    const { data, error } = await this.supabase
      .from('mt5_bots')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_run', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return data || [];
  }

  async updateLastRun(id: string, lastRun?: string): Promise<MT5Bot | null> {
    return this.update(id, { last_run: lastRun || new Date().toISOString() });
  }

  async updatePerformanceMetrics(id: string, metrics: Record<string, any>): Promise<MT5Bot | null> {
    return this.update(id, { performance_metrics: metrics });
  }
}