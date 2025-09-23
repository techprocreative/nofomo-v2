import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useRealtimeDataStore } from '../lib/stores/realtimeDataStore';
import { useWidgetState } from '../hooks/useWidgetState';
import { useEventBus } from '../hooks/useEventBus';
import { Brain, TrendingUp, BarChart3, Zap, Settings, ExternalLink, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SignalsWidgetProps {
  id: string;
  config?: any;
}

export const SignalsWidget: React.FC<SignalsWidgetProps> = ({ id, config }) => {
  const { signals } = useRealtimeDataStore();
  const { isLoading, error, lastUpdated, refreshData } = useWidgetState({
    id,
    type: 'signals',
    refreshRate: config?.refreshRate || 5000,
    dataFilters: config?.dataFilters || {},
    visible: true,
    size: { w: 4, h: 3 },
  });
  const router = useRouter();
  const { emitTradingData, emitUIEvent } = useEventBus();

  const recentSignals = signals.slice(0, 10); // Show last 10 signals

  const handleTradeExecution = async (signal: any) => {
    try {
      const response = await fetch('/api/trading/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: signal.symbol,
          side: signal.side,
          type: 'market',
          quantity: 0.01, // Default quantity, could be configurable
          signalId: signal.id,
        }),
      });

      if (response.ok) {
        emitTradingData('order_executed', { signal, success: true });
      } else {
        throw new Error('Trade execution failed');
      }
    } catch (error) {
      console.error('Trade execution error:', error);
      emitTradingData('order_failed', { signal, error });
    }
  };

  const handleNavigateStrategy = (signal: any) => {
    router.push(`/strategy-builder?symbol=${signal.symbol}&signal=${signal.type}`);
  };

  const handleNavigateBacktesting = (signal: any) => {
    router.push(`/backtesting?symbol=${signal.symbol}&strategy=${signal.type}`);
  };

  const handleShowChart = (signal: any) => {
    emitUIEvent('open_chart_modal', { symbol: signal.symbol, timeframe: '5m' });
  };

  const handleOptimizeStrategy = (signal: any) => {
    router.push(`/strategy-builder?symbol=${signal.symbol}&optimize=true&signalId=${signal.id}`);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          Trading Signals
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm">{error}</div>
        ) : (
          <div className="space-y-3">
            {recentSignals.length === 0 ? (
              <p className="text-muted-foreground text-sm">No signals available</p>
            ) : (
              recentSignals.map((signal, index) => (
                <Card key={index} className="p-3 bg-card/50 border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={signal.side === 'buy' ? 'default' : signal.side === 'sell' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {signal.type} {signal.side}
                      </Badge>
                      <span className="text-sm font-medium">{signal.symbol}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {signal.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleTradeExecution(signal)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Execute
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleNavigateStrategy(signal)}
                    >
                      <Brain className="w-3 h-3 mr-1" />
                      Strategy
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleNavigateBacktesting(signal)}
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Backtest
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleShowChart(signal)}
                    >
                      <BarChart3 className="w-3 h-3 mr-1" />
                      Chart
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleOptimizeStrategy(signal)}
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Optimize
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};