import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createPerformanceAnalyticsSchema, paginationSchema, analyticsQuerySchema } from '@/lib/schemas';
import { PerformanceAnalytics, PaginatedResponse } from '@/lib/types';

// GET /api/analytics - List performance analytics
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const metric_name = searchParams.get('metric_name');
    const period = searchParams.get('period');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    const parsedPagination = paginationSchema.parse({ page, limit });
    const parsedQuery = analyticsQuerySchema.parse({ metric_name, period, start_date, end_date });

    let query = (supabase
      .from('performance_analytics') as any)
      .eq('user_id', userId);

    if (parsedQuery.metric_name) {
      query = query.ilike('metric_name', `%${parsedQuery.metric_name}%`);
    }
    if (parsedQuery.period) {
      query = query.eq('period', parsedQuery.period);
    }
    if (parsedQuery.start_date) {
      query = query.gte('date', parsedQuery.start_date);
    }
    if (parsedQuery.end_date) {
      query = query.lte('date', parsedQuery.end_date);
    }

    const from = (parsedPagination.page - 1) * parsedPagination.limit;
    const to = from + parsedPagination.limit - 1;

    const { data: analytics, error, count } = await query
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching analytics:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }

    const response: PaginatedResponse<PerformanceAnalytics> = {
      success: true,
      data: analytics || [],
      pagination: {
        page: parsedPagination.page,
        limit: parsedPagination.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parsedPagination.limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/analytics error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /api/analytics - Create performance analytics entry
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const body = await request.json();
    const validatedData = createPerformanceAnalyticsSchema.parse(body);

    const { data: analytics, error } = await supabase
      .from('performance_analytics')
      .insert({
        ...validatedData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating analytics:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create analytics entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: analytics,
      message: 'Analytics entry created successfully',
    });
  } catch (error) {
    console.error('POST /api/analytics error:', error);
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