import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { useRealtimeDataStore } from '../lib/stores/realtimeDataStore';
import { useWidgetState } from '../hooks/useWidgetState';

interface PerformanceMetricsWidgetProps {
  id: string;
  config?: any;
}

export const PerformanceMetricsWidget: React.FC<PerformanceMetricsWidgetProps> = ({ id, config }) => {
  const { positions } = useRealtimeDataStore();
  const { isLoading, error, lastUpdated, refreshData } = useWidgetState({
    id,
    type: 'performance',
    refreshRate: config?.refreshRate || 10000,
    dataFilters: config?.dataFilters || {},
    visible: true,
    size: { w: 6, h: 3 },
  });

  // Calculate performance metrics
  const totalPnL = positions.reduce((sum, pos) => sum + (pos.profit || 0), 0);
  const totalOpenPositions = positions.filter(pos => pos.type === 'buy' || pos.type === 'sell').length;
  const winRate = positions.length > 0 ? (positions.filter(pos => (pos.profit || 0) > 0).length / positions.length) * 100 : 0;

  const metrics = [
    {
      label: 'Total P&L',
      value: `$${totalPnL.toFixed(2)}`,
      icon: totalPnL >= 0 ? TrendingUp : TrendingDown,
      color: totalPnL >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: 'Open Positions',
      value: totalOpenPositions.toString(),
      icon: Target,
      color: 'text-blue-600',
    },
    {
      label: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      icon: DollarSign,
      color: winRate >= 50 ? 'text-green-600' : 'text-yellow-600',
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          Performance Metrics
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
          <div className="grid grid-cols-1 gap-4">
            {metrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                  <span className="text-sm font-medium">{metric.label}</span>
                </div>
                <span className={`text-sm font-bold ${metric.color}`}>
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};