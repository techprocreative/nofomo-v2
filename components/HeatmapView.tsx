"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface HeatmapData {
  pair: string
  signal: 'buy' | 'sell' | 'hold'
  confidence: number
  changePercent: number
}

interface HeatmapViewProps {
  data: HeatmapData[]
}

const HeatmapViewComponent = React.memo(function HeatmapView({ data }: HeatmapViewProps) {
  // Define color functions
  const getSignalColor = (signal: string, confidence: number) => {
    const intensity = confidence / 100
    switch (signal) {
      case 'buy':
        return `rgba(34, 197, 94, ${intensity})` // green
      case 'sell':
        return `rgba(239, 68, 68, ${intensity})` // red
      default:
        return `rgba(156, 163, 175, ${intensity})` // gray
    }
  }

  const getChangeColor = (change: number) => {
    const absChange = Math.abs(change)
    if (absChange > 2) return change > 0 ? 'bg-green-500' : 'bg-red-500'
    if (absChange > 1) return change > 0 ? 'bg-green-400' : 'bg-red-400'
    if (absChange > 0.5) return change > 0 ? 'bg-green-300' : 'bg-red-300'
    return 'bg-gray-300'
  }

  if (!data) {
    return (
      <Card className="w-full">
        <CardContent>No heatmap data available</CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
          Market Signal Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground mb-2">
            <div>Pair</div>
            <div className="text-center">Signal</div>
            <div className="text-center">Confidence</div>
            <div className="text-center">Change %</div>
          </div>

          {/* Heatmap Rows */}
          {data.map((item, index) => (
            <div key={index} className="grid grid-cols-4 gap-2 items-center p-2 rounded border">
              <div className="font-medium text-sm">{item.pair}</div>

              {/* Signal Cell */}
              <div className="flex justify-center">
                <Badge
                  variant={
                    item.signal === 'buy' ? 'default' :
                    item.signal === 'sell' ? 'destructive' : 'secondary'
                  }
                  className="text-xs"
                  style={{
                    backgroundColor: getSignalColor(item.signal, item.confidence),
                    color: 'white'
                  }}
                >
                  {item.signal.toUpperCase()}
                </Badge>
              </div>

              {/* Confidence Cell */}
              <div className="text-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: getSignalColor(item.signal, item.confidence) }}
                >
                  {item.confidence}
                </div>
              </div>

              {/* Change Cell */}
              <div className="text-center">
                <div
                  className={`inline-block px-2 py-1 rounded text-xs font-medium text-white ${getChangeColor(item.changePercent)}`}
                >
                  {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Strong Buy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-300 rounded"></div>
            <span>Moderate Buy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span>Hold</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-300 rounded"></div>
            <span>Moderate Sell</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Strong Sell</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
});

export default HeatmapViewComponent;