import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { MarketDataService } from '@/lib/services/market-data-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getPricesHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols')?.split(',') || ['EURUSD'];

    const marketDataService = new MarketDataService();
    const prices = [];

    for (const symbol of symbols) {
      try {
        const tick = await marketDataService.getPriceTick(symbol.trim());
        prices.push(tick);
      } catch (error) {
        console.error(`Failed to get price for ${symbol}:`, error);
        // Continue with other symbols
      }
    }

    return NextResponse.json({
      success: true,
      data: prices,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching market prices:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch market prices',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getPricesHandler);