import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // This would typically fetch from a database or user preferences
    // For now, return default layout configuration

    const defaultLayout = {
      success: true,
      data: {
        widgets: [
          {
            id: 'signals-1',
            type: 'signals',
            position: { x: 0, y: 0, w: 6, h: 3 },
            visible: true,
            config: { refreshRate: 5000 }
          },
          {
            id: 'miniLiveMonitor-1',
            type: 'miniLiveMonitor',
            position: { x: 6, y: 0, w: 3, h: 2 },
            visible: true,
            config: {}
          },
          {
            id: 'charts-1',
            type: 'charts',
            position: { x: 0, y: 3, w: 9, h: 4 },
            visible: true,
            config: { symbol: 'EURUSD' }
          },
          {
            id: 'performance-1',
            type: 'performance',
            position: { x: 9, y: 0, w: 3, h: 3 },
            visible: true,
            config: {}
          }
        ],
        layout: {
          breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
          cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
          rowHeight: 30,
          margin: [10, 10]
        }
      }
    };

    return NextResponse.json(defaultLayout);
  } catch (error) {
    console.error('Failed to fetch dashboard layout:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard layout' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // This would typically save to a database
    // For now, just validate and return success

    if (!body.widgets || !Array.isArray(body.widgets)) {
      return NextResponse.json(
        { success: false, error: 'Invalid layout data' },
        { status: 400 }
      );
    }

    // Validate widget structure
    for (const widget of body.widgets) {
      if (!widget.id || !widget.type || !widget.position) {
        return NextResponse.json(
          { success: false, error: 'Invalid widget structure' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Dashboard layout saved successfully'
    });
  } catch (error) {
    console.error('Failed to save dashboard layout:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save dashboard layout' },
      { status: 500 }
    );
  }
}