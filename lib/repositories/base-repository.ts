import { SupabaseClient } from '@supabase/supabase-js';

export interface BaseRepository<T> {
  create(data: Partial<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(options?: { limit?: number; offset?: number }): Promise<T[]>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
}

export abstract class BaseSupabaseRepository<T extends { id: string; created_at: string }> implements BaseRepository<T> {
  protected constructor(
    protected supabase: SupabaseClient,
    protected tableName: string
  ) {}

  async create(data: Partial<T>): Promise<T> {
    const now = new Date().toISOString();
    const insertData: any = { ...data, created_at: now };
    // Only set updated_at if the entity has this field
    if ('updated_at' in ({} as T)) {
      insertData.updated_at = now;
    }

    const { data: result, error } = await this.supabase
      .from(this.tableName)
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<T[]> {
    let query = this.supabase.from(this.tableName).select('*');

    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const updateData: any = { ...data };
    // Only set updated_at if the entity has this field
    if ('updated_at' in ({} as T)) {
      updateData.updated_at = new Date().toISOString();
    }

    const { data: result, error } = await this.supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return result;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async count(): Promise<number> {
    const { count, error } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  }
}