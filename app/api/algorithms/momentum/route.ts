export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { CreateAlgorithmRequest } from '@/lib/types';
import { withAuth, getUserId } from '@/lib/auth-middleware';

async function handleCreateMomentumAlgorithm(request: NextRequest) {
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

    const momentumRequest: CreateAlgorithmRequest = {
      name: body.name || 'Momentum Trading Algorithm',
      type: 'momentum',
      parameters: body.parameters || {
        momentum_period: 20,
        entry_signal_strength: 2.5,
        exit_signal_strength: 1.0,
        trend_filter_period: 10,
        volume_confirmation: true,
        rsi_filter: {
          enabled: true,
          overbought_level: 70,
          oversold_level: 30
        }
      },
      risk_limits: body.risk_limits || {
        max_drawdown: 8,
        max_daily_loss: 800,
        max_single_trade_loss: 3,
        max_correlation_exposure: 40,
        circuit_breaker_threshold: 10,
        var_limit: 1000,
        stress_test_threshold: 15
      },
      market_conditions: body.market_conditions || {
        symbols: ['EURUSD', 'GBPUSD'],
        timeframes: ['4h', '1d'],
        min_volume: 50000,
        max_spread: 3
      },
      execution_settings: body.execution_settings || {
        max_concurrent_positions: 2,
        position_size_method: 'percentage',
        max_position_size: 8,
        min_position_size: 0.02
      }
    };

    const algorithm = await algorithmExecutionService.createAlgorithm(userId, momentumRequest);
    return NextResponse.json({
      success: true,
      data: algorithm,
      message: 'Momentum trading algorithm created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating momentum algorithm:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleExecuteMomentum(request: NextRequest) {
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
    if (!algorithm || algorithm.type !== 'momentum' || algorithm.user_id !== userId) {
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
    console.error('Error executing momentum algorithm:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handleCreateMomentumAlgorithm);
export const PUT = withAuth(handleExecuteMomentum);