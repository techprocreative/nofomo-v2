export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { AlgorithmExecutionRequest } from '@/lib/types';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import { IAlgorithmExecutionService } from '@/lib/services/algorithm-execution-service';

async function handleExecuteAlgorithm(request: NextRequest) {
  const { container } = await import('@/lib/di');
  const algorithmExecutionService = container.resolve('AlgorithmExecutionService') as IAlgorithmExecutionService;

  try {
    const userId = getUserId(request as any);
    const body: AlgorithmExecutionRequest = await request.json();

    if (!body.algorithm_id) {
      return NextResponse.json(
        { success: false, error: 'Algorithm ID is required' },
        { status: 400 }
      );
    }

    // Verify algorithm ownership
    const algorithm = await algorithmExecutionService.getAlgorithm(body.algorithm_id);
    if (!algorithm) {
      return NextResponse.json(
        { success: false, error: 'Algorithm not found' },
        { status: 404 }
      );
    }

    if (algorithm.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const response = await algorithmExecutionService.executeAlgorithm(body);
    return NextResponse.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error executing algorithm:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleGetAlgorithmState(request: NextRequest) {
  const { container } = await import('@/lib/di');
  const algorithmExecutionService = container.resolve('AlgorithmExecutionService') as IAlgorithmExecutionService;

  try {
    const userId = getUserId(request as any);
    const { searchParams } = new URL(request.url);
    const algorithmId = searchParams.get('algorithm_id');

    if (!algorithmId) {
      return NextResponse.json(
        { success: false, error: 'Algorithm ID is required' },
        { status: 400 }
      );
    }

    const algorithm = await algorithmExecutionService.getAlgorithm(algorithmId);
    if (!algorithm || algorithm.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Algorithm not found or access denied' },
        { status: 404 }
      );
    }

    const state = await algorithmExecutionService.getAlgorithmState(algorithmId);
    return NextResponse.json({
      success: true,
      data: state
    });
  } catch (error) {
    console.error('Error fetching algorithm state:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handleExecuteAlgorithm);
export const GET = withAuth(handleGetAlgorithmState);