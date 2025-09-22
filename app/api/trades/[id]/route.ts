import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { updateTradeSchema, uuidParamSchema } from '@/lib/schemas';
import { Trade } from '@/lib/types';

// GET /api/trades/[id] - Get single trade
export const GET = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    const { data: trade, error } = await (supabase
      .from('trades') as any)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching trade:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Trade not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to fetch trade' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: trade,
    });
  } catch (error) {
    console.error('GET /api/trades/[id] error:', error);
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

// PUT /api/trades/[id] - Update trade
export const PUT = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    const body = await request.json();
    const validatedData = updateTradeSchema.parse(body);

    const { data: trade, error } = await (supabase
      .from('trades') as any)
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating trade:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Trade not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to update trade' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: trade,
      message: 'Trade updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/trades/[id] error:', error);
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

// DELETE /api/trades/[id] - Delete trade
export const DELETE = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    const { error } = await (supabase
      .from('trades') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting trade:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete trade' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Trade deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/trades/[id] error:', error);
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