import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Plus, BarChart3, TrendingUp, Target, Map } from 'lucide-react';

interface WidgetPaletteProps {
  onAddWidget: (type: string) => void;
}

// Custom icon for MiniChart (since lucide doesn't have one)
const MiniChartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3v18h18" />
    <path d="M18 9l-5 5-4-4-3 3" />
  </svg>
);

const availableWidgets = [
  {
    type: 'signals',
    name: 'Trading Signals',
    description: 'Real-time trading signals and alerts',
    icon: TrendingUp,
  },
  {
    type: 'charts',
    name: 'Charts',
    description: 'Price charts and technical analysis',
    icon: BarChart3,
  },
  {
    type: 'performance',
    name: 'Performance Metrics',
    description: 'P&L, win rate, and key metrics',
    icon: Target,
  },
  {
    type: 'heatmap',
    name: 'Heatmap',
    description: 'Market sentiment and correlation heatmap',
    icon: Map,
  },
  {
    type: 'miniChart',
    name: 'Mini Charts',
    description: 'Compact price charts for multiple symbols',
    icon: MiniChartIcon,
  },
];

export const WidgetPalette: React.FC<WidgetPaletteProps> = ({ onAddWidget }) => {
  return (
    <Card className="w-64 h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Widget Palette</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {availableWidgets.map((widget) => (
          <div
            key={widget.type}
            className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent cursor-pointer"
            onClick={() => onAddWidget(widget.type)}
          >
            <div className="flex items-center space-x-3">
              <widget.icon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{widget.name}</p>
                <p className="text-xs text-muted-foreground">{widget.description}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};