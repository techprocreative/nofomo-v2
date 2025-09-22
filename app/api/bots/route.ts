import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createMT5BotSchema, paginationSchema, mt5BotQuerySchema } from '@/lib/schemas';
import { MT5Bot, PaginatedResponse } from '@/lib/types';

// GET /api/bots - List MT5 bots
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const is_active = searchParams.get('is_active') === 'true';

    const parsedPagination = paginationSchema.parse({ page, limit });
    const parsedQuery = mt5BotQuerySchema.parse({ is_active });

    let query = (supabase
      .from('mt5_bots') as any)
      .eq('user_id', userId);

    if (parsedQuery.is_active !== undefined) {
      query = query.eq('is_active', parsedQuery.is_active);
    }

    const from = (parsedPagination.page - 1) * parsedPagination.limit;
    const to = from + parsedPagination.limit - 1;

    const { data: bots, error, count } = await query
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching bots:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch bots' },
        { status: 500 }
      );
    }

    const response: PaginatedResponse<MT5Bot> = {
      success: true,
      data: bots || [],
      pagination: {
        page: parsedPagination.page,
        limit: parsedPagination.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parsedPagination.limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/bots error:', error);
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

// POST /api/bots - Create MT5 bot
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const supabase = createServerSupabaseClient();
    const userId = request.user.id;

    const body = await request.json();
    const validatedData = createMT5BotSchema.parse(body);

    const { data: bot, error } = await supabase
      .from('mt5_bots')
      .insert({
        ...validatedData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bot:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create bot' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bot,
      message: 'Bot created successfully',
    });
  } catch (error) {
    console.error('POST /api/bots error:', error);
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