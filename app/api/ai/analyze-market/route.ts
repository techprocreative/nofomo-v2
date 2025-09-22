export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { AnalyzeMarketRequest, ApiResponse } from '@/lib/types';
import type { AIStrategyGenerationService } from '@/lib/services/ai-strategy-generation-service';

// POST /api/ai/analyze-market - Market analysis for strategy creation
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  const { container } = await import('@/lib/di');

  try {
    const body: AnalyzeMarketRequest = await request.json();

    let aiService: AIStrategyGenerationService;
    try {
      aiService = container.resolve('AIStrategyGenerationService') as AIStrategyGenerationService;
    } catch (serviceError) {
      console.error('AI service initialization failed during build:', serviceError);
      return NextResponse.json(
        { success: false, error: 'AI service not available during build initialization' },
        { status: 503 }
      );
    }

    const result = await aiService.analyzeMarket(body);

    const response: ApiResponse<any> = {
      success: true,
      data: result,
      message: 'Market analysis completed successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/ai/analyze-market error:', error);
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