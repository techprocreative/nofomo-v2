import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createTradingStrategySchema, paginationSchema, tradingStrategyQuerySchema } from '@/lib/schemas';
import { TradingStrategy, PaginatedResponse } from '@/lib/types';

// GET /api/strategies - List trading strategies
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const parsedPagination = paginationSchema.parse({ page, limit });
    const parsedQuery = tradingStrategyQuerySchema.parse({ status });

    let query = (supabase
      .from('trading_strategies') as any)
      .eq('user_id', userId);

    if (parsedQuery.status) {
      query = query.eq('status', parsedQuery.status);
    }

    const from = (parsedPagination.page - 1) * parsedPagination.limit;
    const to = from + parsedPagination.limit - 1;

    const { data: strategies, error, count } = await query
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching strategies:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch strategies' },
        { status: 500 }
      );
    }

    const response: PaginatedResponse<TradingStrategy> = {
      success: true,
      data: strategies || [],
      pagination: {
        page: parsedPagination.page,
        limit: parsedPagination.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parsedPagination.limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/strategies error:', error);
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

// POST /api/strategies - Create trading strategy
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const body = await request.json();
    const validatedData = createTradingStrategySchema.parse(body);

    const { data: strategy, error } = await supabase
      .from('trading_strategies')
      .insert({
        ...validatedData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating strategy:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create strategy' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: strategy,
      message: 'Strategy created successfully',
    });
  } catch (error) {
    console.error('POST /api/strategies error:', error);
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