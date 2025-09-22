import { NextRequest, NextResponse } from 'next/server';
import { BotService } from '@/lib/services/bot-service';
import { withAuth, getUserId } from '@/lib/auth-middleware';

async function handleExecuteBotTrades(request: NextRequest) {
  const { container } = await import('@/lib/di');

  try {
    const userId = getUserId(request as any);
    const body = await request.json();
    const { bot_id, action } = body;

    const botService = container.resolve('BotService') as BotService;

    if (action === 'execute') {
      if (!bot_id) {
        return NextResponse.json(
          { success: false, error: 'Bot ID required' },
          { status: 400 }
        );
      }

      const result = await botService.executeBotTrades(bot_id);

      return NextResponse.json({
        success: true,
        data: result,
        message: `Executed ${result.executed} trades, ${result.failed} failed`,
      });

    } else if (action === 'start_automated') {
      await botService.startAutomatedTrading(userId);

      return NextResponse.json({
        success: true,
        message: 'Automated trading started for all active bots',
      });

    } else if (action === 'stop_automated') {
      await botService.stopAutomatedTrading(userId);

      return NextResponse.json({
        success: true,
        message: 'Automated trading stopped for all bots',
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "execute", "start_automated", or "stop_automated"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Bot trade execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Bot trade execution failed',
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handleExecuteBotTrades);