import { NextRequest, NextResponse } from 'next/server';

// Mock position data for development
function generateMockPositions() {
  const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF'];
  const positions = [];

  for (let i = 0; i < Math.floor(Math.random() * 4) + 1; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const isBuy = Math.random() > 0.5;
    const volume = Math.floor(Math.random() * 10000) + 1000;
    const openPrice = symbol.includes('JPY') ? 150 + (Math.random() - 0.5) * 10 : 1.05 + (Math.random() - 0.5) * 0.1;
    const currentPrice = openPrice + (isBuy ? 1 : -1) * (Math.random() * 0.01);
    const profit = (currentPrice - openPrice) * volume * (isBuy ? 1 : -1);

    positions.push({
      id: `pos_${i + 1}`,
      symbol,
      type: isBuy ? 'BUY' : 'SELL',
      volume,
      openPrice,
      currentPrice,
      profit,
      openTime: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random time within last 24h
      swap: (Math.random() - 0.5) * 2,
      commission: -2.5,
    });
  }

  return positions;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleGetPositions(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCorrelation = searchParams.get('correlation') === 'true';
    const includeRealtime = searchParams.get('realtime') === 'true';

    // Generate mock positions for development
    const positions = generateMockPositions();

    let response: any = {
      success: true,
      data: positions,
      timestamp: new Date().toISOString(),
    };

    // Add real-time data if requested (mock data)
    if (includeRealtime) {
      response.realtime = {
        positions: positions.map(p => ({
          ...p,
          lastUpdate: new Date().toISOString(),
        })),
        lastUpdate: new Date().toISOString(),
      };
    }

    // Add correlation data if requested
    if (includeCorrelation && positions.length > 0) {
      const correlationData = calculatePositionCorrelations(positions);
      response.correlation = correlationData;
    }

    return NextResponse.json(response);

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

// Calculate correlation between positions and market data
function calculatePositionCorrelations(positions: any[]): any {
  const correlations: any = {};

  // Calculate position correlations (simplified)
  const totalVolume = positions.reduce((sum, p) => sum + p.volume, 0);

  for (let i = 0; i < positions.length; i++) {
    const position = positions[i];
    correlations[position.symbol] = {
      market_correlation: Math.random() * 2 - 1, // Placeholder correlation
      volatility_correlation: Math.random() * 2 - 1, // Placeholder volatility
      exposure_percentage: (position.volume / totalVolume) * 100,
    };
  }

  return correlations;
}

export const GET = handleGetPositions;