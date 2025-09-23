import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useRealtimeDataStore } from '../lib/stores/realtimeDataStore';
import { useRouter } from 'next/navigation';
import { Activity, TrendingUp, TrendingDown, Play, ExternalLink } from 'lucide-react';
import { useEventBus } from '../hooks/useEventBus';

interface MiniLiveMonitorProps {
  id: string;
  config?: any;
}

export const MiniLiveMonitor: React.FC<MiniLiveMonitorProps> = ({ id, config }) => {
  const { signals, positions } = useRealtimeDataStore();
  const router = useRouter();
  const { emitTradingData } = useEventBus();
  const [recentSignals, setRecentSignals] = useState<any[]>([]);

  useEffect(() => {
    // Get recent signals and limit to 3 for mini view
    const recent = signals.slice(0, 3);
    setRecentSignals(recent);
  }, [signals]);

  const activeTrades = positions.length;
  const todaysPnL = useMemo(() =>
    positions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0),
    [positions]
  );
  const recentSignalsMemo = useMemo(() => signals.slice(0, 3), [signals]);

  const handleQuickExecute = async (signal: any) => {
    try {
      const response = await fetch('/api/trading/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: signal.symbol,
          side: signal.side,
          type: 'market',
          quantity: 0.01,
          signalId: signal.id,
        }),
      });

      if (response.ok) {
        emitTradingData('order_executed', { signal, success: true });
      }
    } catch (error) {
      console.error('Quick trade execution error:', error);
    }
  };

  const handleViewFull = () => {
    router.push('/live-monitor');
  };

  return (
    <Card className="h-full bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-600" />
            Live Monitor
          </div>
          <Button variant="ghost" size="sm" onClick={handleViewFull} className="h-6 px-2">
            <ExternalLink className="w-3 h-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="text-lg font-bold">{activeTrades}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div>
            <div className={`text-lg font-bold ${todaysPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${todaysPnL.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">P&L</div>
          </div>
        </div>

        {/* Recent Signals */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Recent Signals</div>
          {recentSignalsMemo.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-2">
              No recent signals
            </div>
          ) : (
            recentSignalsMemo.map((signal, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={signal.side === 'buy' ? 'default' : signal.side === 'sell' ? 'destructive' : 'secondary'}
                    className="text-xs px-1 py-0"
                  >
                    {signal.side}
                  </Badge>
                  <span className="text-sm font-medium">{signal.symbol}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => handleQuickExecute(signal)}
                >
                  <Play className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};