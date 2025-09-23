import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { MarketDataService } from '@/lib/services/market-data-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAnalysisHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'EURUSD';
    const timeframe = searchParams.get('timeframe') || '1h';

    const marketDataService = new MarketDataService();
    const analysis = await marketDataService.getMarketAnalysis(symbol, timeframe);

    return NextResponse.json({
      success: true,
      data: analysis,
      symbol,
      timeframe,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching market analysis:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch market analysis',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAnalysisHandler);