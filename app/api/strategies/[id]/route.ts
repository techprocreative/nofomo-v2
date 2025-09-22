import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { updateTradingStrategySchema, uuidParamSchema } from '@/lib/schemas';
import { TradingStrategy } from '@/lib/types';

// GET /api/strategies/[id] - Get single strategy
export const GET = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    const { data: strategy, error } = await (supabase
      .from('trading_strategies') as any)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching strategy:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Strategy not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to fetch strategy' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: strategy,
    });
  } catch (error) {
    console.error('GET /api/strategies/[id] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// PUT /api/strategies/[id] - Update strategy
export const PUT = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    const body = await request.json();
    const validatedData = updateTradingStrategySchema.parse(body);

    const { data: strategy, error } = await (supabase
      .from('trading_strategies') as any)
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating strategy:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Strategy not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to update strategy' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: strategy,
      message: 'Strategy updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/strategies/[id] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// DELETE /api/strategies/[id] - Delete strategy
export const DELETE = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    const { error } = await (supabase
      .from('trading_strategies') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting strategy:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete strategy' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Strategy deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/strategies/[id] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});