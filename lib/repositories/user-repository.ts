import { SupabaseClient } from '@supabase/supabase-js';
import { Profile } from '@/lib/types';
import { BaseSupabaseRepository, BaseRepository } from './base-repository';

export interface UserRepository extends BaseRepository<Profile> {
  findByUserId(userId: string): Promise<Profile | null>;
  updatePreferences(userId: string, preferences: Record<string, any>): Promise<Profile | null>;
}

export class SupabaseUserRepository extends BaseSupabaseRepository<Profile> implements UserRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'profiles');
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async updatePreferences(userId: string, preferences: Record<string, any>): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({
        trading_preferences: preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
}