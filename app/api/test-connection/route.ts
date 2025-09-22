export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase';

export async function GET() {
  try {
    // Test database connectivity using admin client
    const supabase = createServerSupabaseAdminClient();

    // Simple query to test connection - count users
    const result = await supabase
      .from('users')
      .select('*', { count: 'exact' }) as any;

    const { data, error, count } = result;

    if (error) {
      console.error('Database connectivity test failed:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Database connection failed',
          error: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        userCount: count || 0
      }
    });
  } catch (error) {
    console.error('Unexpected error in test connection:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Unexpected error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}