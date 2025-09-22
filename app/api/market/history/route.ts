import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { MarketDataService } from '@/lib/services/market-data-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getHistoryHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'EURUSD';
    const timeframe = searchParams.get('timeframe') || '1h';
    const limit = parseInt(searchParams.get('limit') || '100');

    const marketDataService = new MarketDataService();
    const historicalData = await marketDataService.getHistoricalData(symbol, timeframe, limit);

    return NextResponse.json({
      success: true,
      data: historicalData,
      symbol,
      timeframe,
      count: historicalData.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch historical data',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHistoryHandler);