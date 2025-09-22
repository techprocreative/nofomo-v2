import { NextRequest, NextResponse } from 'next/server';
import { mt5Service } from '@/lib/services/mt5-service';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import { MT5Order } from '@/lib/types';

async function handleGetOrders(request: NextRequest) {
  try {
    const userId = getUserId(request as any);

    // Get pending orders from MT5
    const ordersResult = await mt5Service.getOrders();

    if (!ordersResult.success) {
      return NextResponse.json(
        { success: false, error: ordersResult.error?.message || 'Failed to get orders' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ordersResult.data || [],
    });

  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get orders',
      },
      { status: 500 }
    );
  }
}

async function handlePostOrder(request: NextRequest) {
  const { container } = await import('@/lib/di');

  try {
    const userId = getUserId(request as any);
    const body = await request.json();

    const { ticket, sl, tp } = body;

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Order ticket required' },
        { status: 400 }
      );
    }

    const liveTradingService = container.resolve('LiveTradingService') as any;

    // Modify order (stop loss and take profit)
    const result = await liveTradingService.modifyPosition(ticket, sl, tp);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Order modified successfully',
    });

  } catch (error) {
    console.error('Modify order error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to modify order',
      },
      { status: 500 }
    );
  }
}

async function handleDeleteOrder(request: NextRequest) {
  const { container } = await import('@/lib/di');

  try {
    const userId = getUserId(request as any);
    const url = new URL(request.url);
    const ticket = parseInt(url.pathname.split('/').pop() || '0');

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Order ticket required' },
        { status: 400 }
      );
    }

    const liveTradingService = container.resolve('LiveTradingService') as any;

    // Close/cancel order
    const result = await liveTradingService.closePosition(ticket);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Order closed successfully',
    });

  } catch (error) {
    console.error('Close order error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close order',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGetOrders);
export const POST = withAuth(handlePostOrder);
export const DELETE = withAuth(handleDeleteOrder);