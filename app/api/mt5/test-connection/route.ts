import { NextRequest, NextResponse } from 'next/server';
import { mt5Service } from '@/lib/services/mt5-service';
import { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Test MT5 connection
    const connectionResult = await mt5Service.connect();

    if (!connectionResult.success) {
      return NextResponse.json({
        success: false,
        error: 'MT5 connection failed',
        details: connectionResult.error,
      }, { status: 500 });
    }

    // Test account info retrieval
    const accountResult = await mt5Service.getAccountInfo();

    if (!accountResult.success) {
      return NextResponse.json({
        success: false,
        error: 'MT5 account info retrieval failed',
        details: accountResult.error,
      }, { status: 500 });
    }

    // Test symbol info retrieval
    const symbolResult = await mt5Service.getSymbolInfo('EURUSD');

    if (!symbolResult.success) {
      return NextResponse.json({
        success: false,
        error: 'MT5 symbol info retrieval failed',
        details: symbolResult.error,
      }, { status: 500 });
    }

    // Return successful test results
    const response: ApiResponse<{
      connection: typeof connectionResult.data;
      account: typeof accountResult.data;
      symbol: typeof symbolResult.data;
    }> = {
      success: true,
      data: {
        connection: connectionResult.data,
        account: accountResult.data,
        symbol: symbolResult.data,
      },
      message: 'MT5 connection test successful',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('MT5 test connection error:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal server error during MT5 connection test',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testType } = body;

    let result;

    switch (testType) {
      case 'connection':
        result = await mt5Service.connect();
        break;
      case 'account':
        result = await mt5Service.getAccountInfo();
        break;
      case 'symbol':
        const { symbol = 'EURUSD' } = body;
        result = await mt5Service.getSymbolInfo(symbol);
        break;
      case 'health':
        const isHealthy = await mt5Service.healthCheck();
        result = {
          success: true,
          data: { healthy: isHealthy },
          timestamp: new Date(),
        };
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid test type. Supported types: connection, account, symbol, health',
        }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('MT5 test error:', error);

    return NextResponse.json({
      success: false,
      error: 'Test execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}