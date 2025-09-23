import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { MarketDataService } from '@/lib/services/market-data-service';
import { cacheService } from '@/lib/services/cacheService';
import { PriceTick } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getPricesHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols')?.split(',') || ['EURUSD'];
    const includeRealtime = searchParams.get('realtime') === 'true';
    const correlationData = searchParams.get('correlation') === 'true';

    const marketDataService = new MarketDataService();
    const prices = [];

    // Process all symbols in parallel for better performance
    const symbolPromises = symbols.map(async (symbol) => {
      try {
        const trimmedSymbol = symbol.trim();
        // Try to get from cache first
        let tick = await cacheService.get(`price:${trimmedSymbol}`);

        if (!tick) {
          // Fallback to market data service
          tick = await marketDataService.getPriceTick(trimmedSymbol);
          // Cache the result
          await cacheService.set(`price:${trimmedSymbol}`, tick, 300000); // 5 minutes
        }

        return tick;
      } catch (error) {
        console.error(`Failed to get price for ${symbol}:`, error);
        return null; // Will be filtered out
      }
    });

    const results = await Promise.allSettled(symbolPromises);
    prices.push(...results
      .filter((result): result is PromiseFulfilledResult<PriceTick> => result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value));

    let response: any = {
      success: true,
      data: prices,
      timestamp: new Date().toISOString(),
    };

    // Add real-time subscription info if requested
    if (includeRealtime) {
      response.realtime = {
        connected: false,
        subscriptions: 0,
        data: [],
        lastUpdate: null,
      };
    }

    // Add correlation data if requested
    if (correlationData && prices.length > 1) {
      const correlations = calculateCorrelations(prices);
      response.correlation = correlations;
    }

    return NextResponse.json(response);
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

// Calculate correlation matrix for symbols
function calculateCorrelations(prices: any[]): any {
  if (prices.length < 2) return {};

  const correlations: any = {};

  for (let i = 0; i < prices.length; i++) {
    for (let j = i + 1; j < prices.length; j++) {
      const symbol1 = prices[i].symbol;
      const symbol2 = prices[j].symbol;

      // Simple correlation based on recent price changes
      // In a real implementation, this would use historical data
      const correlation = Math.random() * 2 - 1; // Placeholder
      correlations[`${symbol1}_${symbol2}`] = correlation;
    }
  }

  return correlations;
}

export const GET = getPricesHandler;