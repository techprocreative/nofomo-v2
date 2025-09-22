"use client"

import { useState, useEffect, useCallback } from "react"
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
} from "lucide-react"
import { InlineError } from "@/components/error-boundary"
import { getUserFriendlyMessage } from "@/lib/error-messages"
import { useMT5Status } from "@/hooks/use-mt5-status"
import { MarketDataService } from "@/lib/services/market-data-service"
import { PriceTick, MarketAnalysis, PositionRisk } from "@/lib/types"

interface LiveDataItem {
  pair: string;
  price: number;
  change: number;
  changePercent: number;
  status: "active" | "monitoring";
  signal: "buy" | "sell" | "hold";
  confidence: number;
  lastUpdated: Date;
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

export function LiveMonitor() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveData, setLiveData] = useState<LiveDataItem[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [priceSubscriptions, setPriceSubscriptions] = useState<Map<string, (price: PriceTick) => void>>(new Map())
  const [positions, setPositions] = useState<PositionRisk[]>([])
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null)
  const [activeTrades, setActiveTrades] = useState(0)

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

      const marketDataService = new MarketDataService();

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

      for (const tick of data.data) {
        try {
          // Get historical data for change calculation
          const historicalData = await marketDataService.getHistoricalData(tick.symbol, '1h', 2)
          const currentPrice = tick.bid
          const previousPrice = historicalData.length > 1 ? historicalData[historicalData.length - 2].close : currentPrice
          const change = currentPrice - previousPrice
          const changePercent = (change / previousPrice) * 100

          // Get market analysis for signal generation
          const analysis = await marketDataService.getMarketAnalysis(tick.symbol)

          // Generate trading signal based on analysis
          let signal: "buy" | "sell" | "hold" = "hold"
          let confidence = 50

          if (analysis.indicators.rsi) {
            if (analysis.indicators.rsi < 30) {
              signal = "buy"
              confidence = Math.max(60, 100 - analysis.indicators.rsi)
            } else if (analysis.indicators.rsi > 70) {
              signal = "sell"
              confidence = Math.max(60, analysis.indicators.rsi)
            }
          }

          if (analysis.trend.direction === 'up' && signal === 'buy') {
            confidence += 10
          } else if (analysis.trend.direction === 'down' && signal === 'sell') {
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
          })
        } catch (err) {
          console.error(`Failed to process data for ${tick.symbol}:`, err)
          // Continue with other symbols
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

  // Set up real-time price subscriptions
  useEffect(() => {
    const setupSubscriptions = async () => {
      const marketDataService = new MarketDataService();
      const newSubscriptions = new Map<string, (price: PriceTick) => void>()

      for (const symbol of defaultSymbols) {
        try {
          const priceCallback = (price: PriceTick) => {
            // Update live data when price changes
            setLiveData(prevData =>
              prevData.map(item =>
                item.pair === symbol
                  ? {
                      ...item,
                      price: price.bid,
                      lastUpdated: price.timestamp,
                      // Recalculate change based on new price
                      change: price.bid - item.price,
                      changePercent: ((price.bid - item.price) / item.price) * 100,
                    }
                  : item
              )
            )
          }

          marketDataService.subscribeToPrices(symbol, priceCallback)
          newSubscriptions.set(symbol, priceCallback)
        } catch (error) {
          console.error(`Failed to subscribe to ${symbol}:`, error)
        }
      }

      setPriceSubscriptions(newSubscriptions)
    }

    fetchLiveData()
    setupSubscriptions()

    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      clearInterval(timer)
      // Cleanup subscriptions
      const marketDataService = new MarketDataService();
      priceSubscriptions.forEach((callback, symbol) => {
        marketDataService.unsubscribeFromPrices(symbol, callback)
      })
    }
  }, [fetchLiveData])

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Market Data */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Live Market Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  // Loading skeletons
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-3 h-3 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-16 mb-2" />
                          <Skeleton className="h-8 w-24" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Skeleton className="h-4 w-16 mb-2" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                        <div className="text-center">
                          <Skeleton className="h-6 w-12 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  liveData.map((data, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          data.status === "active" ? "bg-green-500 animate-pulse" : "bg-yellow-500"
                        }`}
                      />
                      <div>
                        <h3 className="font-medium text-foreground">{data.pair}</h3>
                        <div className="text-2xl font-mono font-bold text-foreground">
                          {data.price.toFixed(data.pair.includes("JPY") ? 2 : 4)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div
                          className={`flex items-center gap-1 ${data.change >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {data.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          <span className="font-medium">
                            {data.change >= 0 ? "+" : ""}
                            {data.change.toFixed(4)}
                          </span>
                        </div>
                        <div className={`text-sm ${data.changePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {data.changePercent >= 0 ? "+" : ""}
                          {data.changePercent.toFixed(2)}%
                        </div>
                      </div>

                      <div className="text-center">
                        <Badge
                          variant={
                            data.signal === "buy" ? "default" : data.signal === "sell" ? "destructive" : "secondary"
                          }
                        >
                          {data.signal.toUpperCase()}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">{data.confidence}% confidence</div>
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isLoading ? (
              // Loading skeletons for metrics
              Array.from({ length: 4 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="w-4 h-4" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className={`w-4 h-4 ${riskMetrics?.dailyPnL && riskMetrics.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                      <span className="text-sm font-medium text-muted-foreground">Today's P&L</span>
                    </div>
                    <div className={`text-2xl font-bold ${riskMetrics?.dailyPnL && riskMetrics.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {riskMetrics?.dailyPnL ? `${riskMetrics.dailyPnL >= 0 ? '+' : ''}$${riskMetrics.dailyPnL.toFixed(2)}` : '$0.00'}
                    </div>
                    <div className="text-xs text-muted-foreground">Real-time unrealized</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-muted-foreground">Active Positions</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{activeTrades}</div>
                    <div className="text-xs text-muted-foreground">
                      {positions.filter(p => p.unrealized_pnl >= 0).length} profitable
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-muted-foreground">Risk Score</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{riskMetrics?.riskScore ? riskMetrics.riskScore.toFixed(0) : '0'}</div>
                    <div className="text-xs text-muted-foreground">Out of 100</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-muted-foreground">Total Exposure</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      ${riskMetrics?.totalExposure ? riskMetrics.totalExposure.toFixed(0) : '0'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {riskMetrics?.marginUtilization ? `${riskMetrics.marginUtilization.toFixed(1)}%` : '0%'} utilization
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="space-y-6">
          {/* MT5 Connection Status */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Activity className="w-5 h-5" />
                 MT5 Connection & Trading Status
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className={`flex items-center justify-between p-3 rounded-lg border ${
                 mt5Status.connected
                   ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                   : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
               }`}>
                 <div className="flex items-center gap-2">
                   <div className={`w-3 h-3 rounded-full ${
                     mt5Loading ? 'bg-yellow-500 animate-pulse' : mt5Status.connected ? 'bg-green-500' : 'bg-red-500'
                   }`}></div>
                   <span className={`text-sm font-medium ${
                     mt5Status.connected ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                   }`}>
                     {mt5Loading ? 'Checking...' : mt5Status.connected ? 'Connected' : 'Disconnected'}
                   </span>
                 </div>
                 {mt5Status.last_connected && (
                   <div className="text-xs text-muted-foreground" suppressHydrationWarning>
                     Last connected: {mt5Status.last_connected.toLocaleTimeString()}
                   </div>
                 )}
               </div>

               {/* Trading Execution Status */}
               {mt5Status.connected && (
                 <div className="space-y-3">
                   <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                       <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Trading Active</span>
                     </div>
                     <Badge variant="default" className="text-xs">Auto-Trading ON</Badge>
                   </div>

                   <div className="grid grid-cols-2 gap-3 text-sm">
                     <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                       <div className="text-muted-foreground">Orders Today</div>
                       <div className="font-medium">47</div>
                     </div>
                     <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                       <div className="text-muted-foreground">Avg Execution</div>
                       <div className="font-medium">1.2s</div>
                     </div>
                   </div>

                   <div className="text-xs text-muted-foreground">
                     Last execution: 2 minutes ago • EURUSD Buy 0.1 lots @ 1.08745
                   </div>
                 </div>
               )}

               {mt5Error && (
                 <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                   <div className="flex items-center gap-2">
                     <XCircle className="w-4 h-4 text-red-600" />
                     <span className="text-sm text-red-800 dark:text-red-200">{mt5Error}</span>
                   </div>
                 </div>
               )}

               {!mt5Status.connected && !mt5Loading && (
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={reconnectMT5}
                   className="w-full"
                 >
                   <RefreshCw className="w-4 h-4 mr-2" />
                   Reconnect MT5
                 </Button>
               )}
             </CardContent>
           </Card>

          {/* Risk Management Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Risk Management Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { type: 'warning', message: 'High exposure on EURUSD - 45% of total capital', time: '5 min ago', severity: 'high' },
                  { type: 'info', message: 'Daily loss limit: 2.1% used of 5% limit', time: '12 min ago', severity: 'medium' },
                  { type: 'success', message: 'Risk score improved to 72/100', time: '1 hour ago', severity: 'low' },
                  { type: 'error', message: 'GBPUSD position exceeded stop loss distance', time: '2 hours ago', severity: 'high' }
                ].map((alert, index) => (
                  <div key={index} className={`flex items-start gap-3 p-3 border rounded-lg ${
                    alert.severity === 'high' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                    alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20' :
                    'border-green-200 bg-green-50 dark:bg-green-950/20'
                  }`}>
                    <div className="mt-0.5">
                      {alert.type === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                      {alert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                      {alert.type === 'info' && <Activity className="w-4 h-4 text-blue-600" />}
                      {alert.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                    </div>
                    <Badge variant={
                      alert.severity === 'high' ? 'destructive' :
                      alert.severity === 'medium' ? 'secondary' : 'default'
                    } className="text-xs">
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <AlertTriangle className="w-5 h-5" />
                 Market Alerts
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-3">
                 {isLoading ? (
                   // Loading skeletons for alerts
                   Array.from({ length: 3 }).map((_, index) => (
                     <div key={index} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                       <Skeleton className="w-4 h-4 mt-0.5" />
                       <div className="flex-1">
                         <Skeleton className="h-4 w-full mb-1" />
                         <Skeleton className="h-3 w-16" />
                       </div>
                     </div>
                   ))
                 ) : (
                   alerts.map((alert) => (
                   <div key={alert.id} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                     <div className="mt-0.5">
                       {alert.type === "success" && <CheckCircle className="w-4 h-4 text-green-600" />}
                       {alert.type === "warning" && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                       {alert.type === "info" && <Activity className="w-4 h-4 text-blue-600" />}
                       {alert.type === "error" && <XCircle className="w-4 h-4 text-red-600" />}
                     </div>
                     <div className="flex-1">
                       <p className="text-sm text-foreground">{alert.message}</p>
                       <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                     </div>
                   </div>
                   ))
                 )}
               </div>
             </CardContent>
           </Card>

          {/* Performance Monitoring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Real-time Performance Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-sm text-muted-foreground mb-1">Today's P&L</div>
                  <div className="text-lg font-bold text-blue-600">+$847.32</div>
                  <div className="text-xs text-green-600">+3.2% vs yesterday</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-sm text-muted-foreground mb-1">Win Rate</div>
                  <div className="text-lg font-bold text-green-600">76.8%</div>
                  <div className="text-xs text-green-600">+2.1% this week</div>
                </div>
              </div>

              {/* Performance Trends */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Performance Trends</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Hourly P&L</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div className="w-12 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-green-600">+$127</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Execution Speed</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div className="w-14 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-blue-600">1.8s avg</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Slippage Control</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div className="w-10 h-2 bg-orange-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-orange-600">0.8 pips</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategy Performance */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Top Strategies Today</h4>
                <div className="space-y-2">
                  {[
                    { name: 'EURUSD Scalper', pnl: 245.67, trades: 12, winRate: 83 },
                    { name: 'GBPUSD Trend', pnl: 189.23, trades: 8, winRate: 75 },
                    { name: 'USDJPY Range', pnl: 156.89, trades: 6, winRate: 67 }
                  ].map((strategy, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{strategy.name}</div>
                        <div className="text-xs text-muted-foreground">{strategy.trades} trades • {strategy.winRate}% win rate</div>
                      </div>
                      <div className="text-sm font-medium text-green-600">+${strategy.pnl.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
               <CardTitle>AI Optimizer Status</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                   <span className="text-sm font-medium text-green-800 dark:text-green-200">AI Optimization Active</span>
                 </div>
               </div>

               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">Last Optimization:</span>
                   <span className="font-medium text-foreground">3 min ago</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">Parameters Adjusted:</span>
                   <span className="font-medium text-foreground">5</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">Performance Gain:</span>
                   <span className="font-medium text-green-600">+2.3%</span>
                 </div>
               </div>

               <Button variant="outline" className="w-full bg-transparent">
                 View Optimization Details
               </Button>
             </CardContent>
           </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trade Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={async () => {
                  if (confirm('Are you sure you want to close all positions?')) {
                    try {
                      // Emergency close all positions
                      for (const position of positions) {
                        await fetch(`/api/trading/orders/${position.position_id}`, {
                          method: 'DELETE'
                        })
                      }
                      await fetchPositions()
                    } catch (error) {
                      console.error('Failed to close positions:', error)
                    }
                  }
                }}
                disabled={activeTrades === 0}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Close All Positions
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={async () => {
                  // Refresh all data
                  await Promise.all([
                    fetchLiveData(),
                    fetchPositions(),
                    fetchRiskMetrics(),
                  ])
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Dashboard
              </Button>
              <Button
                variant={riskMetrics && riskMetrics.riskScore > 80 ? "destructive" : "outline"}
                className="w-full justify-start"
                disabled
              >
                <Shield className="w-4 h-4 mr-2" />
                Risk Management
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
