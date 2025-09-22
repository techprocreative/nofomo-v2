import { NextRequest, NextResponse } from 'next/server';
import { StrategyExecutionService } from '@/lib/services/strategy-execution-service';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import { TradingSignal } from '@/lib/types';

async function handleGetSignals(request: NextRequest) {
  const { container } = await import('@/lib/di');

  try {
    const userId = getUserId(request as any);
    const url = new URL(request.url);
    const strategyId = url.searchParams.get('strategy_id');
    const symbol = url.searchParams.get('symbol');

    if (!strategyId || !symbol) {
      return NextResponse.json(
        { success: false, error: 'Strategy ID and symbol required' },
        { status: 400 }
      );
    }

    const strategyExecutionService = container.resolve('StrategyExecutionService') as StrategyExecutionService;
    const strategyService = container.resolve('StrategyService') as any;

    // Get strategy
    const strategy = await strategyService.getStrategyById(strategyId);
    if (!strategy || strategy.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Strategy not found or access denied' },
        { status: 404 }
      );
    }

    // Execute strategy to get signals
    const signals = await strategyExecutionService.executeStrategy(strategy, userId, symbol);

    return NextResponse.json({
      success: true,
      data: signals,
    });

  } catch (error) {
    console.error('Get signals error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get signals',
      },
      { status: 500 }
    );
  }
}

async function handlePostSignal(request: NextRequest) {
  try {
    const userId = getUserId(request as any);
    const body = await request.json();

    const { strategy_id, symbol, type, side, price, volume, confidence } = body;

    if (!strategy_id || !symbol || !side) {
      return NextResponse.json(
        { success: false, error: 'Strategy ID, symbol, and side required' },
        { status: 400 }
      );
    }

    const signal: TradingSignal = {
      id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      strategy_id,
      symbol,
      type: type || 'entry',
      side,
      price,
      volume: volume || 0.1,
      confidence: confidence || 50,
      timestamp: new Date(),
    };

    // Store signal (in real app, would persist to database)
    // For now, just return it
    return NextResponse.json({
      success: true,
      data: signal,
      message: 'Signal created successfully',
    });

  } catch (error) {
    console.error('Create signal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create signal',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGetSignals);
export const POST = withAuth(handlePostSignal);