import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { MarketDataService } from '@/lib/services/market-data-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getSymbolsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // major, minor, exotic

    const marketDataService = new MarketDataService();
    const allSymbols = await marketDataService.getAvailableSymbols();

    let filteredSymbols = allSymbols;
    if (category) {
      filteredSymbols = allSymbols.filter(symbol => symbol.category === category);
    }

    return NextResponse.json({
      success: true,
      data: filteredSymbols,
      count: filteredSymbols.length,
      category: category || 'all',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching trading symbols:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch trading symbols',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getSymbolsHandler);