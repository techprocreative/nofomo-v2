import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { updatePerformanceAnalyticsSchema, uuidParamSchema } from '@/lib/schemas';

// GET /api/analytics/[id] - Get single analytics entry
export const GET = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    const { data: analytics, error } = await (supabase
      .from('performance_analytics') as any)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching analytics:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Analytics entry not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to fetch analytics entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('GET /api/analytics/[id] error:', error);
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

// PUT /api/analytics/[id] - Update analytics entry
export const PUT = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    const body = await request.json();
    const validatedData = updatePerformanceAnalyticsSchema.parse(body);

    const { data: analytics, error } = await (supabase
      .from('performance_analytics') as any)
      .update(validatedData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating analytics:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Analytics entry not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to update analytics entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: analytics,
      message: 'Analytics entry updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/analytics/[id] error:', error);
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

// DELETE /api/analytics/[id] - Delete analytics entry
export const DELETE = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    const { error } = await (supabase
      .from('performance_analytics') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting analytics:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete analytics entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Analytics entry deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/analytics/[id] error:', error);
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