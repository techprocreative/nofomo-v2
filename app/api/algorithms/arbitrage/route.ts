import { NextRequest, NextResponse } from 'next/server';
import { CreateAlgorithmRequest } from '@/lib/types';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import type { AlgorithmExecutionService } from '@/lib/services/algorithm-execution-service';

async function handleCreateArbitrageAlgorithm(request: NextRequest) {
  const { container } = await import('@/lib/di');

  try {
    const algorithmExecutionService = await container.resolve('AlgorithmExecutionService') as AlgorithmExecutionService;

    const userId = getUserId(request as any);
    const body: Partial<CreateAlgorithmRequest> = await request.json();

    // Set defaults for statistical arbitrage
    const arbitrageRequest: CreateAlgorithmRequest = {
      name: body.name || 'Statistical Arbitrage Algorithm',
      type: 'statistical_arbitrage',
      parameters: body.parameters || {
        lookback_period: 20,
        entry_threshold: 2.0,
        exit_threshold: 0.5,
        max_holding_period: 1440, // 24 hours in minutes
        cointegration_test: 'adf',
        hedge_ratio_calculation: 'ols',
        z_score_smoothing: 5
      },
      risk_limits: body.risk_limits || {
        max_drawdown: 5,
        max_daily_loss: 500,
        max_single_trade_loss: 2,
        max_correlation_exposure: 30,
        circuit_breaker_threshold: 8,
        var_limit: 800,
        stress_test_threshold: 10
      },
      market_conditions: body.market_conditions || {
        symbols: ['EURUSD'],
        timeframes: ['1h'],
        min_volume: 100000,
        max_spread: 2
      },
      execution_settings: body.execution_settings || {
        max_concurrent_positions: 3,
        position_size_method: 'percentage',
        max_position_size: 5,
        min_position_size: 0.01
      }
    };

    const algorithm = await algorithmExecutionService.createAlgorithm(userId, arbitrageRequest);
    return NextResponse.json({
      success: true,
      data: algorithm,
      message: 'Statistical arbitrage algorithm created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating arbitrage algorithm:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleExecuteArbitrage(request: NextRequest) {
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

    // Verify the algorithm exists and is arbitrage type
    const algorithm = await algorithmExecutionService.getAlgorithm(algorithm_id);
    if (!algorithm) {
      return NextResponse.json(
        { success: false, error: 'Algorithm not found' },
        { status: 404 }
      );
    }

    if (algorithm.type !== 'statistical_arbitrage') {
      return NextResponse.json(
        { success: false, error: 'Algorithm is not a statistical arbitrage type' },
        { status: 400 }
      );
    }

    if (algorithm.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
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
    console.error('Error executing arbitrage algorithm:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handleCreateArbitrageAlgorithm);
export const PUT = withAuth(handleExecuteArbitrage);