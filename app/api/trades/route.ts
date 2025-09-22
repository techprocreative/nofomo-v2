import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createTradeSchema, paginationSchema, tradeQuerySchema } from '@/lib/schemas';
import { Trade, PaginatedResponse } from '@/lib/types';

// GET /api/trades - List trades
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const symbol = searchParams.get('symbol');
    const side = searchParams.get('side');
    const status = searchParams.get('status');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    const parsedPagination = paginationSchema.parse({ page, limit });
    const parsedQuery = tradeQuerySchema.parse({ symbol, side, status, start_date, end_date });

    let query = (supabase
      .from('trades') as any)
      .eq('user_id', userId);

    if (parsedQuery.symbol) {
      query = query.ilike('symbol', `%${parsedQuery.symbol}%`);
    }
    if (parsedQuery.side) {
      query = query.eq('side', parsedQuery.side);
    }
    if (parsedQuery.status) {
      query = query.eq('status', parsedQuery.status);
    }
    if (parsedQuery.start_date) {
      query = query.gte('entry_time', parsedQuery.start_date);
    }
    if (parsedQuery.end_date) {
      query = query.lte('entry_time', parsedQuery.end_date);
    }

    const from = (parsedPagination.page - 1) * parsedPagination.limit;
    const to = from + parsedPagination.limit - 1;

    const { data: trades, error, count } = await query
      .select('*', { count: 'exact' })
      .order('entry_time', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching trades:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch trades' },
        { status: 500 }
      );
    }

    const response: PaginatedResponse<Trade> = {
      success: true,
      data: trades || [],
      pagination: {
        page: parsedPagination.page,
        limit: parsedPagination.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parsedPagination.limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/trades error:', error);
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

// POST /api/trades - Create trade
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const body = await request.json();
    const validatedData = createTradeSchema.parse(body);

    const { data: trade, error } = await supabase
      .from('trades')
      .insert({
        ...validatedData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trade:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create trade' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: trade,
      message: 'Trade created successfully',
    });
  } catch (error) {
    console.error('POST /api/trades error:', error);
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