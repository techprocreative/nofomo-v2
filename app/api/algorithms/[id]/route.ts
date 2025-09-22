import { NextRequest, NextResponse } from 'next/server';
import { UpdateAlgorithmRequest, AlgorithmExecutionRequest } from '@/lib/types';
import { AlgorithmExecutionService } from '@/lib/services/algorithm-execution-service';
import { withAuth, getUserId } from '@/lib/auth-middleware';

// GET /api/algorithms/[id] - Individual algorithm management
export const dynamic = 'force-dynamic';

async function handleGetAlgorithm(request: NextRequest, { params }: { params: { id: string } }) {
  const { container } = await import('@/lib/di');

  try {
    const algorithmExecutionService = await container.resolve('AlgorithmExecutionService') as AlgorithmExecutionService;

    const userId = getUserId(request as any);
    const algorithm = await algorithmExecutionService.getAlgorithm(params.id);

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

    return NextResponse.json({
      success: true,
      data: algorithm
    });
  } catch (error) {
    console.error('Error fetching algorithm:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleUpdateAlgorithm(request: NextRequest, { params }: { params: { id: string } }) {
  const { container } = await import('@/lib/di');

  try {
    const algorithmExecutionService = container.resolve('AlgorithmExecutionService') as AlgorithmExecutionService;

    const userId = getUserId(request as any);
    const body: UpdateAlgorithmRequest = await request.json();

    const existing = await algorithmExecutionService.getAlgorithm(params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Algorithm not found' },
        { status: 404 }
      );
    }

    if (existing.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const updated = await algorithmExecutionService.updateAlgorithm(params.id, body);
    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating algorithm:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleDeleteAlgorithm(request: NextRequest, { params }: { params: { id: string } }) {
  const { container } = await import('@/lib/di');

  try {
    const algorithmExecutionService = await container.resolve('AlgorithmExecutionService') as AlgorithmExecutionService;

    const userId = getUserId(request as any);

    const existing = await algorithmExecutionService.getAlgorithm(params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Algorithm not found' },
        { status: 404 }
      );
    }

    if (existing.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const deleted = await algorithmExecutionService.deleteAlgorithm(params.id);
    return NextResponse.json({
      success: true,
      message: 'Algorithm deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting algorithm:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGetAlgorithm);
export const PUT = withAuth(handleUpdateAlgorithm);
export const DELETE = withAuth(handleDeleteAlgorithm);