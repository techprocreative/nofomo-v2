import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { OptimizeStrategyRequest, ApiResponse } from '@/lib/types';

// POST /api/ai/optimize-strategy - Optimize existing strategies
export const dynamic = 'force-dynamic';
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  const { container } = await import('@/lib/di');

  try {
    const userId = request.user.id;
    const body: OptimizeStrategyRequest = await request.json();

    let aiService: import('@/lib/services/ai-strategy-generation-service').AIStrategyGenerationService;
    try {
      aiService = container.resolve('AIStrategyGenerationService') as import('@/lib/services/ai-strategy-generation-service').AIStrategyGenerationService;
    } catch (serviceError) {
      console.error('AI service initialization failed during build:', serviceError);
      return NextResponse.json(
        { success: false, error: 'AI service not available during build initialization' },
        { status: 503 }
      );
    }

    const result = await aiService.optimizeStrategy(userId, body);

    const response: ApiResponse<any> = {
      success: true,
      data: result,
      message: 'Strategy optimized successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/ai/optimize-strategy error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
});