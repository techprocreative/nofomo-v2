'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { BarChart3, TrendingUp, Activity, Settings } from 'lucide-react';
import { useRealtimeOHLC } from '../hooks/useRealtimeState';
import { useWebSocketConnection } from '../hooks/useWebSocketConnection';

// Chart plugin interface
interface ChartPlugin {
  name: string;
  render: (ctx: CanvasRenderingContext2D, data: any[], options: ChartOptions) => void;
  getBounds?: (data: any[]) => { min: number; max: number };
}

interface ChartOptions {
  width: number;
  height: number;
  timeframe: string;
  showVolume: boolean;
  theme: 'light' | 'dark';
}

// Basic candlestick plugin
const candlestickPlugin: ChartPlugin = {
  name: 'candlestick',
  render: (ctx, data, options) => {
    const { width, height } = options;
    if (!data.length) return;

    const candleWidth = Math.max(2, (width - 40) / data.length);
    const maxPrice = Math.max(...data.map(d => d.high));
    const minPrice = Math.min(...data.map(d => d.low));
    const priceRange = maxPrice - minPrice || 1;

    const priceToY = (price: number) => height - 20 - ((price - minPrice) / priceRange) * (height - 40);

    ctx.strokeStyle = options.theme === 'dark' ? '#fff' : '#000';
    ctx.lineWidth = 1;

    data.forEach((candle, i) => {
      const x = 20 + i * candleWidth;
      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);

      // Wick
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Body
      const isGreen = candle.close > candle.open;
      ctx.fillStyle = isGreen ? '#22c55e' : '#ef4444';
      ctx.strokeStyle = isGreen ? '#16a34a' : '#dc2626';

      const bodyTop = Math.min(openY, closeY);
      const bodyBottom = Math.max(openY, closeY);
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);

      ctx.fillRect(x, bodyTop, candleWidth * 0.8, bodyHeight);
      ctx.strokeRect(x, bodyTop, candleWidth * 0.8, bodyHeight);
    });
  },
  getBounds: (data) => {
    if (!data.length) return { min: 0, max: 0 };
    const prices = data.flatMap(d => [d.open, d.high, d.low, d.close]);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }
};

// Volume plugin
const volumePlugin: ChartPlugin = {
  name: 'volume',
  render: (ctx, data, options) => {
    const { width, height } = options;
    if (!data.length || !options.showVolume) return;

    const volumeHeight = height * 0.2;
    const volumeTop = height - volumeHeight;
    const maxVolume = Math.max(...data.map(d => d.volume || 0));

    ctx.fillStyle = options.theme === 'dark' ? '#374151' : '#e5e7eb';

    data.forEach((candle, i) => {
      const x = 20 + i * Math.max(2, (width - 40) / data.length);
      const volume = candle.volume || 0;
      const barHeight = (volume / maxVolume) * (volumeHeight - 10);
      const isGreen = candle.close > candle.open;

      ctx.fillStyle = isGreen ? '#22c55e' : '#ef4444';
      ctx.fillRect(x, volumeTop + volumeHeight - 10 - barHeight, Math.max(2, (width - 40) / data.length * 0.8), barHeight);
    });
  }
};

interface ChartWidgetProps {
  symbol: string;
  timeframe?: string;
  title?: string;
  height?: number;
  showVolume?: boolean;
  plugins?: ChartPlugin[];
}

export const ChartWidget = React.memo(function ChartWidget({
  symbol,
  timeframe = '5m',
  title,
  height = 300,
  showVolume = true,
  plugins = [candlestickPlugin, volumePlugin]
}: ChartWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data } = useRealtimeOHLC(symbol, timeframe);
  const { subscribeToOHLC } = useWebSocketConnection();
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Subscribe to OHLC data
  useEffect(() => {
    const subscription = subscribeToOHLC?.(symbol, selectedTimeframe);
    if (subscription) {
      setIsSubscribed(true);
    }
    return () => {
      if (subscription) {
        subscription.unsubscribe();
        setIsSubscribed(false);
      }
    };
  }, [symbol, selectedTimeframe, subscribeToOHLC]);

  // Render chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Chart options
    const options: ChartOptions = {
      width: canvas.width,
      height: canvas.height,
      timeframe: selectedTimeframe,
      showVolume,
      theme: 'light' // TODO: Get from theme context
    };

    // Render each plugin
    plugins.forEach(plugin => {
      plugin.render(ctx, data, options);
    });

  }, [data, selectedTimeframe, showVolume, plugins]);

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            {title || `${symbol} Chart`}
            {isSubscribed && <Badge variant="default" className="text-xs">Live</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeframes.map(tf => (
                  <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={height}
            className="w-full border rounded"
            style={{ height: `${height}px` }}
          />
          {!data.length && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Loading chart data...</p>
              </div>
            </div>
          )}
        </div>

        {/* Chart Info */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>Data points: {data.length}</span>
          <span>Timeframe: {selectedTimeframe}</span>
          {showVolume && <span>Volume: On</span>}
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Simple line chart for trends
 */
export const TrendChart = React.memo(function TrendChart({ data, className }: { data: number[]; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((value, i) => {
      const x = (i / (data.length - 1)) * canvas.width;
      const y = canvas.height - ((value - min) / range) * canvas.height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className={className}
    />
  );
});