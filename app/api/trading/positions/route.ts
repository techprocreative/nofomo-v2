import { NextRequest, NextResponse } from 'next/server';
import { LiveTradingService } from '@/lib/services/live-trading-service';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import { PositionRisk } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleGetPositions(request: NextRequest) {
  try {
    const userId = getUserId(request as any);

    const { container } = await import('@/lib/di');

    const liveTradingService = container.resolve('LiveTradingService') as LiveTradingService;

    const positions = await liveTradingService.monitorPositions(userId);

    return NextResponse.json({
      success: true,
      data: positions,
    });

  } catch (error) {
    console.error('Get positions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get positions',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGetPositions);