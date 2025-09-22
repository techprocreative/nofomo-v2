export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { CreateAlgorithmRequest } from '@/lib/types';
import { withAuth, getUserId } from '@/lib/auth-middleware';

async function handleCreateReversionAlgorithm(request: NextRequest) {
  const { container } = await import('@/lib/di');

  try {
    let algorithmExecutionService: import('@/lib/services/algorithm-execution-service').AlgorithmExecutionService;
    try {
      algorithmExecutionService = container.resolve('AlgorithmExecutionService') as import('@/lib/services/algorithm-execution-service').AlgorithmExecutionService;
    } catch (serviceError) {
      console.error('AlgorithmExecutionService initialization failed during build:', serviceError);
      return NextResponse.json(
        { success: false, error: 'Algorithm service not available during build initialization' },
        { status: 503 }
      );
    }

    const userId = getUserId(request as any);
    const body: Partial<CreateAlgorithmRequest> = await request.json();

    const reversionRequest: CreateAlgorithmRequest = {
      name: body.name || 'Mean Reversion Algorithm',
      type: 'mean_reversion',
      parameters: body.parameters || {
        lookback_period: 20,
        entry_deviation: 2.0,
        exit_deviation: 0.3,
        bollinger_bands: {
          enabled: true,
          period: 20,
          deviation: 2.0
        },
        mean_calculation: 'sma',
        speed_filter: true
      },
      risk_limits: body.risk_limits || {
        max_drawdown: 6,
        max_daily_loss: 600,
        max_single_trade_loss: 2.5,
        max_correlation_exposure: 35,
        circuit_breaker_threshold: 9,
        var_limit: 900,
        stress_test_threshold: 12
      },
      market_conditions: body.market_conditions || {
        symbols: ['EURUSD', 'USDJPY'],
        timeframes: ['1h', '4h'],
        min_volume: 75000,
        max_spread: 2.5
      },
      execution_settings: body.execution_settings || {
        max_concurrent_positions: 3,
        position_size_method: 'percentage',
        max_position_size: 6,
        min_position_size: 0.015
      }
    };

    const algorithm = await algorithmExecutionService.createAlgorithm(userId, reversionRequest);
    return NextResponse.json({
      success: true,
      data: algorithm,
      message: 'Mean reversion algorithm created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating reversion algorithm:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleExecuteReversion(request: NextRequest) {
  const { container } = await import('@/lib/di');

  try {
    let algorithmExecutionService: import('@/lib/services/algorithm-execution-service').AlgorithmExecutionService;
    try {
      algorithmExecutionService = container.resolve('AlgorithmExecutionService') as import('@/lib/services/algorithm-execution-service').AlgorithmExecutionService;
    } catch (serviceError) {
      console.error('AlgorithmExecutionService initialization failed during build:', serviceError);
      return NextResponse.json(
        { success: false, error: 'Algorithm service not available during build initialization' },
        { status: 503 }
      );
    }

    const userId = getUserId(request as any);
    const { algorithm_id, symbol } = await request.json();

    if (!algorithm_id) {
      return NextResponse.json(
        { success: false, error: 'Algorithm ID is required' },
        { status: 400 }
      );
    }

    const algorithm = await algorithmExecutionService.getAlgorithm(algorithm_id);
    if (!algorithm || algorithm.type !== 'mean_reversion' || algorithm.user_id !== userId) {
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
    console.error('Error executing reversion algorithm:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handleCreateReversionAlgorithm);
export const PUT = withAuth(handleExecuteReversion);