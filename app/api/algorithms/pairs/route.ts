import { NextRequest, NextResponse } from 'next/server';
import { CreateAlgorithmRequest } from '@/lib/types';
import { AlgorithmExecutionService } from '@/lib/services/algorithm-execution-service';
import { withAuth, getUserId } from '@/lib/auth-middleware';

// GET /api/algorithms/pairs - Pairs trading algorithm management
export const dynamic = 'force-dynamic';

async function handleCreatePairsAlgorithm(request: NextRequest) {
  const { container } = await import('@/lib/di');

  try {
    const algorithmExecutionService = await container.resolve('AlgorithmExecutionService') as AlgorithmExecutionService;

    const userId = getUserId(request as any);
    const body: Partial<CreateAlgorithmRequest> = await request.json();

    const pairsRequest: CreateAlgorithmRequest = {
      name: body.name || 'Pairs Trading Algorithm',
      type: 'pairs_trading',
      parameters: body.parameters || {
        pair_symbols: ['EURUSD', 'GBPUSD'],
        cointegration_period: 30,
        entry_threshold: 2.0,
        exit_threshold: 0.5,
        hedge_ratio_update_frequency: 60,
        correlation_minimum: 0.7,
        spread_calculation: 'price'
      },
      risk_limits: body.risk_limits || {
        max_drawdown: 7,
        max_daily_loss: 700,
        max_single_trade_loss: 3,
        max_correlation_exposure: 45,
        circuit_breaker_threshold: 11,
        var_limit: 1100,
        stress_test_threshold: 18
      },
      market_conditions: body.market_conditions || {
        symbols: ['EURUSD', 'GBPUSD'],
        timeframes: ['1h', '4h'],
        min_volume: 60000,
        max_spread: 3
      },
      execution_settings: body.execution_settings || {
        max_concurrent_positions: 2,
        position_size_method: 'percentage',
        max_position_size: 7,
        min_position_size: 0.025
      }
    };

    const algorithm = await algorithmExecutionService.createAlgorithm(userId, pairsRequest);
    return NextResponse.json({
      success: true,
      data: algorithm,
      message: 'Pairs trading algorithm created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating pairs algorithm:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleExecutePairs(request: NextRequest) {
  const { container } = await import('@/lib/di');

  try {
    const algorithmExecutionService = container.resolve('AlgorithmExecutionService') as AlgorithmExecutionService;

    const userId = getUserId(request as any);
    const { algorithm_id, symbol } = await request.json();

    if (!algorithm_id) {
      return NextResponse.json(
        { success: false, error: 'Algorithm ID is required' },
        { status: 400 }
      );
    }

    const algorithm = await algorithmExecutionService.getAlgorithm(algorithm_id);
    if (!algorithm || algorithm.type !== 'pairs_trading' || algorithm.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid algorithm' },
        { status: 400 }
      );
    }

    const executionRequest = {
      algorithm_id,
      symbol: symbol || algorithm.market_conditions.symbols[0],
      force_execution: false
    };

    const response = await algorithmExecutionService.executeAlgorithm(executionRequest);
    return NextResponse.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error executing pairs algorithm:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handleCreatePairsAlgorithm);
export const PUT = withAuth(handleExecutePairs);