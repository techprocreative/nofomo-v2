"use client"

import React from 'react'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

interface MiniChartData {
  time: number
  price: number
}

interface MiniChartProps {
  data: MiniChartData[]
  height?: number
  color?: string
  showTooltip?: boolean
}

export const MiniChart = React.memo(function MiniChart({
  data,
  height = 60,
  color = '#3b82f6',
  showTooltip = false
}: MiniChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded"
        style={{ height }}
      >
        <span className="text-xs text-muted-foreground">No data</span>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="miniChartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          hide
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          hide
          axisLine={false}
          tickLine={false}
          domain={['dataMin', 'dataMax']}
        />
        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '12px'
            }}
            formatter={(value: number) => [value.toFixed(4), 'Price']}
            labelFormatter={(label) => new Date(label).toLocaleTimeString()}
          />
        )}
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={1.5}
          fill="url(#miniChartGradient)"
          dot={false}
          activeDot={false}
        />
      </AreaChart>
   </ResponsiveContainer>
 )
});