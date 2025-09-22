import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { updateMT5BotSchema, uuidParamSchema } from '@/lib/schemas';

// GET /api/bots/[id] - Get single bot
export const GET = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    const { data: bot, error } = await (supabase
      .from('mt5_bots') as any)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching bot:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Bot not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to fetch bot' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bot,
    });
  } catch (error) {
    console.error('GET /api/bots/[id] error:', error);
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

// PUT /api/bots/[id] - Update bot
export const PUT = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    const body = await request.json();
    const validatedData = updateMT5BotSchema.parse(body);

    const { data: bot, error } = await (supabase
      .from('mt5_bots') as any)
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating bot:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Bot not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to update bot' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bot,
      message: 'Bot updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/bots/[id] error:', error);
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

// DELETE /api/bots/[id] - Delete bot
export const DELETE = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    const { error } = await (supabase
      .from('mt5_bots') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting bot:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete bot' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bot deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/bots/[id] error:', error);
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