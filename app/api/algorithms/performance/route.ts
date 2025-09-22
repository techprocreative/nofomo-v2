import { NextRequest, NextResponse } from 'next/server';
import { AlgorithmPerformanceRequest } from '@/lib/types';
import { AlgorithmExecutionService } from '@/lib/services/algorithm-execution-service';
import { withAuth, getUserId } from '@/lib/auth-middleware';

// GET /api/algorithms/performance - Performance analytics
export const dynamic = 'force-dynamic';

async function handleGetPerformance(request: NextRequest) {
  const { container } = await import('@/lib/di');

  try {
    const algorithmExecutionService = container.resolve('AlgorithmExecutionService') as AlgorithmExecutionService;

    const userId = getUserId(request as any);
    const { searchParams } = new URL(request.url);
    const algorithmId = searchParams.get('algorithm_id');
    const period = searchParams.get('period') as any;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!algorithmId) {
      return NextResponse.json(
        { success: false, error: 'Algorithm ID is required' },
        { status: 400 }
      );
    }

    // Verify algorithm ownership
    const algorithm = await algorithmExecutionService.getAlgorithm(algorithmId);
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

    const performanceRequest: AlgorithmPerformanceRequest = {
      algorithm_id: algorithmId,
      period,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    };

    const performance = await algorithmExecutionService.getAlgorithmPerformance(performanceRequest);
    return NextResponse.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Error fetching algorithm performance:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGetPerformance);