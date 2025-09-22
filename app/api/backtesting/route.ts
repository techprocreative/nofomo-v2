export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';
import { BacktestingService, BacktestConfiguration } from '@/lib/services/backtesting-service';
import { MarketDataService } from '@/lib/services/market-data-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { strategy, symbol, timeframe, startDate, endDate, initialBalance } = body;

    if (!strategy || !symbol || !timeframe || !startDate || !endDate || !initialBalance) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create backtesting service instance
    const marketDataService = new MarketDataService();
    const backtestingService = new BacktestingService(marketDataService);

    // Prepare configuration
    const configuration: BacktestConfiguration = {
      strategy,
      symbol,
      timeframe,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      initialBalance: Number(initialBalance),
      spread: body.spread || 1.5, // default 1.5 pips
      commission: body.commission || 7.0, // default $7 per lot
      leverage: body.leverage || 100
    };

    // Run backtest
    const result = await backtestingService.runBacktest(configuration);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        backtest_id: `bt_${Date.now()}`,
        configuration,
        results: result,
        execution_time: new Date().toISOString()
      },
      message: 'Backtest completed successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/backtesting error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}