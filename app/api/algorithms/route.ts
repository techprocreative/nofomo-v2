import { NextRequest, NextResponse } from 'next/server';
import { CreateAlgorithmRequest } from '@/lib/types';
import { AlgorithmExecutionService } from '@/lib/services/algorithm-execution-service';
import { withAuth, getUserId } from '@/lib/auth-middleware';

async function handleGetAlgorithms(request: NextRequest) {
  const { container } = await import('@/lib/di');

  try {
    const userId = getUserId(request as any);
    const algorithmExecutionService = container.resolve('AlgorithmExecutionService') as AlgorithmExecutionService;
    const algorithms = await algorithmExecutionService.getAlgorithmsByUser(userId);
    return NextResponse.json({
      success: true,
      data: algorithms
    });
  } catch (error) {
    console.error('Error fetching algorithms:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleCreateAlgorithm(request: NextRequest) {
  const { container } = await import('@/lib/di');

  try {
    const userId = getUserId(request as any);
    const body: CreateAlgorithmRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.type || !body.parameters || !body.market_conditions) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, type, parameters, market_conditions' },
        { status: 400 }
      );
    }

    const algorithmExecutionService = container.resolve('AlgorithmExecutionService') as AlgorithmExecutionService;
    const algorithm = await algorithmExecutionService.createAlgorithm(userId, body);
    return NextResponse.json({
      success: true,
      data: algorithm
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating algorithm:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGetAlgorithms);
export const POST = withAuth(handleCreateAlgorithm);