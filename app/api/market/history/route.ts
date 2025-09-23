import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Generate mock historical data for development
function generateMockHistoricalData(symbol: string, limit: number) {
  const data = [];
  const now = new Date();

  for (let i = limit; i > 0; i--) {
    const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000); // 5-minute intervals
    const basePrice = symbol.includes('JPY') ? 150 : 1.05; // Different base prices for different currencies
    const price = basePrice + (Math.random() - 0.5) * 0.1; // Random price variation

    data.push({
      timestamp: timestamp.toISOString(),
      open: price,
      high: price + Math.random() * 0.01,
      low: price - Math.random() * 0.01,
      close: price + (Math.random() - 0.5) * 0.02,
      volume: Math.floor(Math.random() * 1000) + 100,
    });
  }

  return data;
}

async function getHistoryHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'EURUSD';
    const timeframe = searchParams.get('timeframe') || '5m';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Limit to prevent large responses

    // Generate mock historical data for development
    const historicalData = generateMockHistoricalData(symbol, limit);

    return NextResponse.json({
      success: true,
      data: historicalData,
      symbol,
      timeframe,
      count: historicalData.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating historical data:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to generate historical data',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = getHistoryHandler;