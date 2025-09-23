"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Shield,
  Target,
  BarChart3,
  Brain,
  Zap,
  Settings,
  Play,
  ExternalLink,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEventBus } from "@/hooks/useEventBus"
import { InlineError } from "@/components/error-boundary"
import { getUserFriendlyMessage } from "@/lib/error-messages"
import { useMT5Status } from "@/hooks/use-mt5-status"
import { PriceTick, MarketAnalysis, PositionRisk } from "@/lib/types"
import { MiniChart } from "@/components/MiniChart"
const HeatmapView = React.lazy(() => import("@/components/HeatmapView"))
import { Progress } from "@/components/ui/progress"
import { CustomDashboard } from "@/components/CustomDashboard"

interface LiveDataItem {
  pair: string;
  price: number;
  change: number;
  changePercent: number;
  status: "active" | "monitoring";
  signal: "buy" | "sell" | "hold";
  confidence: number;
  lastUpdated: Date;
  chartData: { time: number; price: number }[];
}

interface AlertItem {
  id: number;
  type: "success" | "warning" | "info" | "error";
  message: string;
  time: string;
}

interface RiskMetrics {
  totalExposure: number;
  marginUtilization: number;
  dailyPnL: number;
  riskScore: number;
}

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function LiveMonitor() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveData, setLiveData] = useState<LiveDataItem[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [positions, setPositions] = useState<PositionRisk[]>([])
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null)
  const [activeTrades, setActiveTrades] = useState(0)

  const router = useRouter()
  const { emitTradingData, emitUIEvent } = useEventBus()

  const { status: mt5Status, isLoading: mt5Loading, error: mt5Error, reconnect: reconnectMT5 } = useMT5Status()

  const defaultSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF']


  const fetchPositions = useCallback(async () => {
    try {
      const response = await fetch('/api/trading/positions')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPositions(data.data || [])
          setActiveTrades(data.data?.length || 0)
        }
      }
    } catch (error) {
      console.error('Failed to fetch positions:', error)
    }
  }, [])

  const fetchRiskMetrics = useCallback(async () => {
    try {
      // For now, we'll calculate basic metrics from positions
      // In a real app, this would come from risk management API
      let totalExposure = 0
      let totalPnL = 0

      positions.forEach(position => {
        totalExposure += position.exposure
        totalPnL += position.unrealized_pnl
      })

      setRiskMetrics({
        totalExposure,
        marginUtilization: totalExposure > 0 ? (totalExposure / 10000) * 100 : 0, // Mock account balance
        dailyPnL: totalPnL,
        riskScore: Math.min((totalExposure / 10000) * 50, 100), // Simple risk score
      })
    } catch (error) {
      console.error('Failed to calculate risk metrics:', error)
    }
  }, [positions])

  const fetchLiveData = useCallback(async () => {
    try {
      setError(null)
      setIsRefreshing(true)

      // Fetch current prices for default symbols
      const response = await fetch(`/api/market/prices?symbols=${defaultSymbols.join(',')}`)
      if (!response.ok) {
        throw new Error('Failed to fetch market prices')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch prices')
      }

      // Fetch positions and risk metrics
      await Promise.all([
        fetchPositions(),
        fetchRiskMetrics(),
      ])

      // Transform price data into live data format with analysis
      const transformedData: LiveDataItem[] = []

      // Fetch historical data for all symbols in parallel
      const historyPromises = data.data.map(async (tick: any) => {
        try {
          const historyResponse = await fetch(`/api/market/history?symbol=${tick.symbol}&timeframe=5m&limit=20`)
          const historyData = await historyResponse.json()
          return {
            tick,
            historicalData: historyData.success ? historyData.data : []
          }
        } catch (err) {
          console.error(`Failed to fetch history for ${tick.symbol}:`, err)
          return {
            tick,
            historicalData: []
          }
        }
      })

      const historyResults = await Promise.allSettled(historyPromises)

      for (const result of historyResults) {
        if (result.status === 'fulfilled') {
          const { tick, historicalData } = result.value

          const currentPrice = tick.bid
          const previousPrice = historicalData.length > 1 ? historicalData[historicalData.length - 1].close : currentPrice
          const change = currentPrice - previousPrice
          const changePercent = (change / previousPrice) * 100

          // Prepare chart data for sparkline
          const chartData = historicalData.slice(-15).map((item: any) => ({
            time: new Date(item.timestamp).getTime(),
            price: item.close
          }))

          // Get market analysis for signal generation (mock data for now)
          const analysis = {
            indicators: {
              rsi: 45 + Math.random() * 20, // Random RSI between 45-65
              macd: Math.random() * 2 - 1, // Random MACD
              bollinger: {
                upper: tick.bid + 0.001,
                lower: tick.bid - 0.001,
                middle: tick.bid
              }
            },
            trend: {
              direction: ['up', 'down', 'neutral'][Math.floor(Math.random() * 3)]
            }
          }

          // Generate trading signal based on analysis
          let signal: "buy" | "sell" | "hold" = "hold"
          let confidence = 50

          if (analysis.indicators?.rsi) {
            if (analysis.indicators.rsi < 30) {
              signal = "buy"
              confidence = Math.max(60, 100 - analysis.indicators.rsi)
            } else if (analysis.indicators.rsi > 70) {
              signal = "sell"
              confidence = Math.max(60, analysis.indicators.rsi)
            }
          }

          if (analysis.trend?.direction === 'up' && signal === 'buy') {
            confidence += 10
          } else if (analysis.trend?.direction === 'down' && signal === 'sell') {
            confidence += 10
          }

          confidence = Math.min(confidence, 95)

          transformedData.push({
            pair: tick.symbol,
            price: currentPrice,
            change,
            changePercent,
            status: "active",
            signal,
            confidence,
            lastUpdated: tick.timestamp,
            chartData,
          })
        } else {
          console.error(`Failed to fetch history for symbol:`, result.reason)
        }
      }

      setLiveData(transformedData)

      // Generate alerts based on market conditions
      const newAlerts: AlertItem[] = []
      let alertId = 1

      for (const item of transformedData) {
        if (Math.abs(item.changePercent) > 1) {
          newAlerts.push({
            id: alertId++,
            type: item.changePercent > 1 ? "success" : "warning",
            message: `${item.pair} ${item.changePercent > 0 ? 'gained' : 'lost'} ${Math.abs(item.changePercent).toFixed(2)}%`,
            time: "Just now",
          })
        }

        if (item.signal !== "hold" && item.confidence > 80) {
          newAlerts.push({
            id: alertId++,
            type: "info",
            message: `Strong ${item.signal} signal for ${item.pair} (${item.confidence}% confidence)`,
            time: "Just now",
          })
        }
      }

      setAlerts(newAlerts.slice(0, 5)) // Keep only latest 5 alerts
    } catch (err) {
      console.error('Failed to fetch live data:', err)
      setError(getUserFriendlyMessage('NETWORK_ERROR'))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Set up periodic data refresh
  useEffect(() => {
    fetchLiveData()

    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Set up periodic refresh every 30 seconds
    const refreshTimer = setInterval(() => {
      fetchLiveData()
    }, 30000)

    return () => {
      clearInterval(timer)
      clearInterval(refreshTimer)
    }
  }, [fetchLiveData])

  const handleTradeExecution = async (item: LiveDataItem) => {
    try {
      const response = await fetch('/api/trading/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: item.pair,
          side: item.signal,
          type: 'market',
          quantity: 0.01, // Default quantity, could be configurable
          signalId: `live-${item.pair}-${Date.now()}`,
        }),
      });

      if (response.ok) {
        emitTradingData('order_executed', { item, success: true });
        setAlerts(prev => [{
          id: Date.now(),
          type: 'success',
          message: `Trade executed for ${item.pair} ${item.signal}`,
          time: new Date().toLocaleTimeString(),
        }, ...prev.slice(0, 4)]);
      } else {
        throw new Error('Trade execution failed');
      }
    } catch (error) {
      console.error('Trade execution error:', error);
      emitTradingData('order_failed', { item, error });
      setAlerts(prev => [{
        id: Date.now(),
        type: 'error',
        message: `Failed to execute trade for ${item.pair}`,
        time: new Date().toLocaleTimeString(),
      }, ...prev.slice(0, 4)]);
    }
  };

  const handleNavigateStrategy = (item: LiveDataItem) => {
    router.push(`/strategy-builder?symbol=${item.pair}&signal=${item.signal}`);
  };

  const handleNavigateBacktesting = (item: LiveDataItem) => {
    router.push(`/backtesting?symbol=${item.pair}&strategy=${item.signal}`);
  };

  const handleShowChart = (item: LiveDataItem) => {
    emitUIEvent('open_chart_modal', { symbol: item.pair, timeframe: '5m' });
  };

  const handleOptimizeStrategy = (item: LiveDataItem) => {
    router.push(`/strategy-builder?symbol=${item.pair}&optimize=true&confidence=${item.confidence}`);
  };

  const handleClosePosition = async (position: any) => {
    try {
      const response = await fetch('/api/trading/positions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId: position.id }),
      });

      if (response.ok) {
        emitTradingData('position_closed', { position, success: true });
      } else {
        throw new Error('Failed to close position');
      }
    } catch (error) {
      console.error('Position close error:', error);
      emitTradingData('position_close_failed', { position, error });
    }
  };

  const handleAdjustPosition = (position: any) => {
    // Open position adjustment modal or navigate to position management
    emitUIEvent('open_position_adjustment', { position });
  };

  const handleRefresh = () => {
    fetchLiveData()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Error Display */}
      {error && (
        <InlineError
          error={error}
          onRetry={handleRefresh}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Activity className="w-8 h-8 text-red-600" />
            Live Trading Monitor
          </h1>
          <p className="text-muted-foreground">Real-time monitoring and AI optimization</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Market Time</div>
            <div className="font-mono text-lg font-medium text-foreground" suppressHydrationWarning>{currentTime.toLocaleTimeString()}</div>
          </div>
          <div className={`w-3 h-3 rounded-full animate-pulse ${error ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
        </div>
      </div>

      {/* Live Signal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {liveData.map((item) => (
          <Card key={item.pair} className="bg-card/50 border-border/50 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={item.signal === 'buy' ? 'default' : item.signal === 'sell' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {item.signal.toUpperCase()}
                  </Badge>
                  <span className="font-semibold text-lg">{item.pair}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${item.confidence > 80 ? 'bg-green-500' : item.confidence > 60 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-muted-foreground">{item.confidence}%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Price and Change */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{item.price.toFixed(5)}</div>
                    <div className={`text-sm ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.change >= 0 ? '+' : ''}{item.change.toFixed(5)} ({item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%)
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.lastUpdated.toLocaleTimeString()}
                  </div>
                </div>

                {/* Mini Chart */}
                <div className="h-16">
                  <MiniChart data={item.chartData} color={item.signal === 'buy' ? '#10b981' : item.signal === 'sell' ? '#ef4444' : '#6b7280'} />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs px-1"
                    onClick={() => handleTradeExecution(item)}
                  >
                    <Play className="w-3 h-3 sm:mr-1" />
                    <span className="hidden sm:inline">Execute</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-1"
                    onClick={() => handleNavigateStrategy(item)}
                  >
                    <Brain className="w-3 h-3 sm:mr-1" />
                    <span className="hidden sm:inline">Strategy</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-1"
                    onClick={() => handleNavigateBacktesting(item)}
                  >
                    <TrendingUp className="w-3 h-3 sm:mr-1" />
                    <span className="hidden sm:inline">Backtest</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-1"
                    onClick={() => handleShowChart(item)}
                  >
                    <BarChart3 className="w-3 h-3 sm:mr-1" />
                    <span className="hidden sm:inline">Chart</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-1"
                    onClick={() => handleOptimizeStrategy(item)}
                  >
                    <Settings className="w-3 h-3 sm:mr-1" />
                    <span className="hidden sm:inline">Optimize</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Management Section */}
      {riskMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Risk Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Exposure</span>
                  <span className="font-semibold">${riskMetrics.totalExposure.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Margin Used</span>
                  <span className="font-semibold">{riskMetrics.marginUtilization.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Daily P&L</span>
                  <span className={`font-semibold ${riskMetrics.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${riskMetrics.dailyPnL.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Risk Score</span>
                  <span className="font-semibold">{riskMetrics.riskScore.toFixed(1)}/100</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => router.push('/risk-management')}
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Adjust Risk Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Active Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-center">{activeTrades}</div>
              <p className="text-xs text-muted-foreground text-center mb-3">Open trades</p>
              <div className="space-y-2">
                {positions.slice(0, 3).map((position, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{position.symbol}</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleClosePosition(position)}
                      >
                        Close
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleAdjustPosition(position)}
                      >
                        Adjust
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {positions.length > 3 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => router.push('/trading/positions')}
                >
                  View All Positions
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Recent Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-center gap-2 text-xs">
                    {alert.type === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
                    {alert.type === 'warning' && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                    {alert.type === 'error' && <XCircle className="w-3 h-3 text-red-500" />}
                    <span className="truncate">{alert.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    <CustomDashboard />
  </div>
)
}
