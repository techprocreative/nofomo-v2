import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { MarketDataService } from '@/lib/services/market-data-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getDepthHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'EURUSD';

    const marketDataService = new MarketDataService();
    const depth = await marketDataService.getMarketDepth(symbol);

    return NextResponse.json({
      success: true,
      data: depth,
      symbol,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching market depth:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch market depth',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getDepthHandler);