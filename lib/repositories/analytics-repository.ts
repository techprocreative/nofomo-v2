import { SupabaseClient } from '@supabase/supabase-js';
import { PerformanceAnalytics } from '@/lib/types';
import { BaseSupabaseRepository, BaseRepository } from './base-repository';

export interface AnalyticsRepository extends BaseRepository<PerformanceAnalytics> {
  findByUserId(userId: string): Promise<PerformanceAnalytics[]>;
  findByStrategyId(strategyId: string): Promise<PerformanceAnalytics[]>;
  findByBotId(botId: string): Promise<PerformanceAnalytics[]>;
  findByDateRange(userId: string, startDate: string, endDate: string): Promise<PerformanceAnalytics[]>;
  aggregateMetrics(userId: string, metricName: string, period: 'daily' | 'weekly' | 'monthly'): Promise<number>;
  batchCreate(analytics: Partial<PerformanceAnalytics>[]): Promise<PerformanceAnalytics[]>;
}

export class SupabaseAnalyticsRepository extends BaseSupabaseRepository<PerformanceAnalytics> implements AnalyticsRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'performance_analytics');
  }

  async findByUserId(userId: string): Promise<PerformanceAnalytics[]> {
    const { data, error } = await this.supabase
      .from('performance_analytics')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findByStrategyId(strategyId: string): Promise<PerformanceAnalytics[]> {
    const { data, error } = await this.supabase
      .from('performance_analytics')
      .select('*')
      .eq('strategy_id', strategyId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findByBotId(botId: string): Promise<PerformanceAnalytics[]> {
    const { data, error } = await this.supabase
      .from('performance_analytics')
      .select('*')
      .eq('bot_id', botId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findByDateRange(userId: string, startDate: string, endDate: string): Promise<PerformanceAnalytics[]> {
    const { data, error } = await this.supabase
      .from('performance_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async aggregateMetrics(userId: string, metricName: string, period: 'daily' | 'weekly' | 'monthly'): Promise<number> {
    const { data, error } = await this.supabase
      .from('performance_analytics')
      .select('metric_value')
      .eq('user_id', userId)
      .eq('metric_name', metricName)
      .eq('period', period);

    if (error) throw error;

    if (!data || data.length === 0) return 0;

    return data.reduce((sum, item) => sum + item.metric_value, 0) / data.length;
  }

  async batchCreate(analytics: Partial<PerformanceAnalytics>[]): Promise<PerformanceAnalytics[]> {
    const now = new Date().toISOString();
    const dataWithTimestamps = analytics.map(item => ({
      ...item,
      created_at: now
    }));

    const { data, error } = await this.supabase
      .from('performance_analytics')
      .insert(dataWithTimestamps)
      .select();

    if (error) throw error;
    return data || [];
  }
}