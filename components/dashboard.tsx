"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Bot,
  Zap,
  Play,
  Pause,
  Settings,
  LogOut,
  User,
  Wifi,
  WifiOff,
  Shield,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { StrategyBuilder } from "./strategy-builder"
import { BacktestingPanel } from "./backtesting-panel"
import { MT5BotsPanel } from "./mt5-bots-panel"
import { LiveMonitor } from "./live-monitor"
import { AnalyticsPanel } from "./analytics-panel"
import { createClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { useRealtimeTrades } from "@/hooks/use-realtime-trades"
import { useRealtimeStrategies } from "@/hooks/use-realtime-strategies"
import { useRealtimeBots } from "@/hooks/use-realtime-bots"
import { useRealtimeAnalytics } from "@/hooks/use-realtime-analytics"

interface DashboardProps {
  activeView: string
  onViewChange: (view: string) => void
}

export function Dashboard({ activeView, onViewChange }: DashboardProps) {
  const router = useRouter()
  const supabase = createClient()

  // Hydration state
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Real-time data hooks
  const { trades, isLoading: tradesLoading, isConnected: tradesConnected, lastUpdate: tradesLastUpdate } = useRealtimeTrades()
  const { strategies, isLoading: strategiesLoading, isConnected: strategiesConnected, lastUpdate: strategiesLastUpdate } = useRealtimeStrategies()
  const { bots, isLoading: botsLoading, isConnected: botsConnected, lastUpdate: botsLastUpdate } = useRealtimeBots()
  const { analytics, isLoading: analyticsLoading, isConnected: analyticsConnected, lastUpdate: analyticsLastUpdate } = useRealtimeAnalytics()

  // Market data state
  const [marketPrices, setMarketPrices] = useState<Map<string, any>>(new Map())

  // Initialize market data service
  useEffect(() => {
    const initMarketData = async () => {
      const popularSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD']
      try {
        // Get initial prices
        const response = await fetch(`/api/market/prices?symbols=${popularSymbols.join(',')}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const newPrices = new Map()
            data.data.forEach((tick: any) => {
              newPrices.set(tick.symbol, {
                price: tick.bid,
                change: 0,
                changePercent: 0,
                lastUpdated: tick.timestamp
              })
            })
            setMarketPrices(newPrices)
          }
        }
      } catch (error) {
        console.error('Failed to initialize market data:', error)
      }
    }

    initMarketData()
  }, [])

  // Risk metrics calculation
  const [riskMetrics, setRiskMetrics] = useState({
    totalExposure: 0,
    realizedPnL: 0,
    unrealizedPnL: 0,
    marginUsed: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    riskScore: 0
  })

  // Move random calculations to useEffect to avoid hydration mismatches
  useEffect(() => {
    const positions = trades?.filter(t => t.status === 'open') || []
    const closedTrades = trades?.filter(t => t.status === 'closed') || []

    // Calculate total exposure from open positions
    const totalExposure = positions.reduce((sum, trade) => sum + (trade.quantity || 1) * (trade.entry_price || 0), 0)

    // Calculate realized P&L from closed trades
    const realizedPnL = closedTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0)

    // Calculate unrealized P&L for open positions (simplified - in real app would use current market prices)
    const unrealizedPnL = positions.reduce((sum, trade) => {
      // Mock unrealized P&L calculation - in real app this would be calculated from current price
      const mockUnrealized = (Math.random() - 0.5) * 0.1 * (trade.quantity || 1) * (trade.entry_price || 0)
      return sum + mockUnrealized
    }, 0)

    const marginUsed = totalExposure * 0.1 // Assuming 10% margin requirement

    // Calculate max drawdown from trade history
    const equityCurve = [10000] // Start with initial balance
    let currentEquity = 10000
    trades?.forEach(trade => {
      if (trade.profit_loss) {
        currentEquity += trade.profit_loss
        equityCurve.push(currentEquity)
      }
    })
    const peak = Math.max(...equityCurve)
    const maxDrawdown = peak > 0 ? ((peak - Math.min(...equityCurve)) / peak) * 100 : 0

    // Calculate Sharpe ratio (simplified)
    const returns = closedTrades.map(t => t.profit_loss || 0).filter(p => p !== 0)
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
    const stdDev = returns.length > 0 ? Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length) : 1
    const sharpeRatio = stdDev > 0 ? Math.sqrt(252) * (avgReturn / stdDev) : 0

    setRiskMetrics({
      totalExposure,
      realizedPnL,
      unrealizedPnL,
      marginUsed,
      maxDrawdown,
      sharpeRatio,
      riskScore: Math.min((totalExposure / 50000) * 100, 100) // Scale based on exposure
    })
  }, [trades])

  // Computed stats from real-time data
  const stats = useMemo(() => {
    // Use static values during server-side rendering to prevent hydration mismatches
    if (!isHydrated) {
      return [
        {
          title: "Portfolio Value",
          value: "$0.00",
          change: "+$0.00",
          trend: "up",
          icon: DollarSign,
          description: "Total unrealized P&L",
          secondary: "$0.00 unrealized"
        },
        {
          title: "Active Strategies",
          value: "0",
          change: "+0",
          trend: "up",
          icon: Bot,
          description: "Running algorithms",
          secondary: "0 total strategies"
        },
        {
          title: "Today's P&L",
          value: "$0.00",
          change: "+$0.00",
          trend: "up",
          icon: TrendingUp,
          description: "Daily performance",
          secondary: "0 trades today"
        },
        {
          title: "Win Rate",
          value: "0.0%",
          change: "+0.0%",
          trend: "up",
          icon: Activity,
          description: "Success ratio",
          secondary: "0/0 trades"
        },
        {
          title: "Risk Score",
          value: "0",
          change: "+0.0",
          trend: "up",
          icon: Shield,
          description: "Portfolio risk level",
          secondary: "0 margin used"
        },
        {
          title: "Sharpe Ratio",
          value: "0.00",
          change: "+0.00",
          trend: "up",
          icon: Target,
          description: "Risk-adjusted returns",
          secondary: "Annualized"
        }
      ]
    }

    const totalPnL = trades?.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0) || 0
    const activeStrategiesCount = strategies?.filter(s => s.status === 'active').length || 0
    const closedTrades = trades?.filter(t => t.status === 'closed') || []
    const winningTrades = closedTrades.filter(t => (t.profit_loss || 0) > 0).length
    const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0
    const avgTradeSize = closedTrades.length > 0 ? closedTrades.reduce((sum, t) => sum + Math.abs(t.quantity || 1) * (t.entry_price || 0), 0) / closedTrades.length : 0

    // Calculate changes (simplified - in real app would use historical data)
    const todayTrades = trades?.filter(t => {
      const tradeDate = new Date(t.created_at || Date.now())
      const today = new Date()
      return tradeDate.toDateString() === today.toDateString()
    }) || []
    const todayPnL = todayTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0)

    return [
      {
        title: "Portfolio Value",
        value: `$${totalPnL.toFixed(2)}`,
        change: `${totalPnL >= 0 ? '+' : ''}${(totalPnL * 0.052).toFixed(2)}`, // Mock 5.2% change
        trend: totalPnL >= 0 ? "up" : "down",
        icon: DollarSign,
        description: "Total unrealized P&L",
        secondary: `$${riskMetrics.unrealizedPnL.toFixed(2)} unrealized`
      },
      {
        title: "Active Strategies",
        value: activeStrategiesCount.toString(),
        change: "+2", // Mock increase
        trend: "up",
        icon: Bot,
        description: "Running algorithms",
        secondary: `${strategies?.length || 0} total strategies`
      },
      {
        title: "Today's P&L",
        value: `$${todayPnL.toFixed(2)}`,
        change: `${todayPnL >= 0 ? '+' : ''}${(todayPnL * 0.123).toFixed(2)}`, // Mock 12.3% change
        trend: todayPnL >= 0 ? "up" : "down",
        icon: TrendingUp,
        description: "Daily performance",
        secondary: `${todayTrades.length} trades today`
      },
      {
        title: "Win Rate",
        value: `${winRate.toFixed(1)}%`,
        change: "+2.1%", // Mock improvement
        trend: winRate >= 50 ? "up" : "down",
        icon: Activity,
        description: "Success ratio",
        secondary: `${winningTrades}/${closedTrades.length} trades`
      },
      {
        title: "Risk Score",
        value: riskMetrics.riskScore.toFixed(0),
        change: `${riskMetrics.riskScore > 70 ? '+' : ''}${(riskMetrics.riskScore * 0.021).toFixed(1)}`, // Mock change
        trend: riskMetrics.riskScore > 70 ? "down" : "up",
        icon: Shield,
        description: "Portfolio risk level",
        secondary: `${riskMetrics.marginUsed.toFixed(0)} margin used`
      },
      {
        title: "Sharpe Ratio",
        value: riskMetrics.sharpeRatio.toFixed(2),
        change: `${riskMetrics.sharpeRatio >= 1 ? '+' : ''}${(riskMetrics.sharpeRatio * 0.015).toFixed(2)}`, // Mock change
        trend: riskMetrics.sharpeRatio >= 1 ? "up" : "down",
        icon: Target,
        description: "Risk-adjusted returns",
        secondary: "Annualized"
      }
    ]
  }, [trades, strategies, riskMetrics, isHydrated])

  // Computed active strategies from real-time data with enhanced metrics
  const activeStrategies = useMemo(() => {
    // Use static data during server-side rendering
    if (!isHydrated) {
      return [
        {
          id: '1',
          name: 'EURUSD Momentum',
          status: 'running',
          pnl: '+$125.43',
          trades: 12,
          winRate: '75%',
          pair: 'EURUSD',
          timeframe: '1h',
          exposure: 2500,
          riskLevel: 'medium',
          drawdown: 45.67,
          avgTradeSize: 1250,
          openPositions: 2,
          lastTrade: null
        },
        {
          id: '2',
          name: 'GBPUSD Trend',
          status: 'running',
          pnl: '+$89.21',
          trades: 8,
          winRate: '62%',
          pair: 'GBPUSD',
          timeframe: '4h',
          exposure: 1800,
          riskLevel: 'low',
          drawdown: 23.45,
          avgTradeSize: 900,
          openPositions: 1,
          lastTrade: null
        }
      ]
    }

    return strategies?.map(strategy => {
      const strategyTrades = trades?.filter(t => t.strategy_id === strategy.id) || []
      const closedTrades = strategyTrades.filter(t => t.status === 'closed')
      const winningTrades = closedTrades.filter(t => (t.profit_loss || 0) > 0)
      const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0
      const totalPnL = strategyTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0)

      // Enhanced metrics
      const openPositions = strategyTrades.filter(t => t.status === 'open')
      const totalExposure = openPositions.reduce((sum, t) => sum + (t.quantity || 1) * (t.entry_price || 0), 0)
      const avgTradeSize = closedTrades.length > 0 ? closedTrades.reduce((sum, t) => sum + Math.abs(t.quantity || 1) * (t.entry_price || 0), 0) / closedTrades.length : 0

      // Risk indicators
      const riskLevel = totalExposure > 10000 ? 'high' : totalExposure > 5000 ? 'medium' : 'low'
      const drawdown = Math.max(...strategyTrades.map(t => t.profit_loss || 0).filter(p => p < 0), 0) * -1

      // Extract pair and timeframe from strategy_data if available
      const strategyData = strategy.strategy_data as any
      const pair = strategyData?.pair || strategyData?.symbol || 'N/A'
      const timeframe = strategyData?.timeframe || 'N/A'

      return {
        id: strategy.id,
        name: strategy.name,
        status: strategy.status === 'active' ? 'running' : 'paused',
        pnl: totalPnL >= 0 ? `+$${totalPnL.toFixed(2)}` : `$${totalPnL.toFixed(2)}`,
        trades: strategyTrades.length,
        winRate: `${winRate.toFixed(0)}%`,
        pair,
        timeframe,
        exposure: totalExposure,
        riskLevel,
        drawdown,
        avgTradeSize,
        openPositions: openPositions.length,
        lastTrade: strategyTrades.length > 0 ? strategyTrades[strategyTrades.length - 1].created_at : null
      }
    }) || []
  }, [strategies, trades, isHydrated])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const renderContent = () => {
    switch (activeView) {
      case "strategy-builder":
        return <StrategyBuilder />
      case "backtesting":
        return <BacktestingPanel />
      case "mt5-bots":
        return <MT5BotsPanel />
      case "monitor":
        return <LiveMonitor />
      case "analytics":
        return <AnalyticsPanel />
      default:
        return (
          <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50/50 to-blue-50/30 dark:from-slate-950/50 dark:to-blue-950/30 min-h-full">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  Trading Dashboard
                </h1>
                <p className="text-lg text-muted-foreground">Monitor your AI-powered forex strategies</p>
                <div className="flex items-center gap-2 mt-2" suppressHydrationWarning>
                  {tradesConnected && strategiesConnected && botsConnected && analyticsConnected ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {tradesConnected && strategiesConnected && botsConnected && analyticsConnected
                      ? 'Live data connected'
                      : 'Connecting to live data...'}
                  </span>
                  {tradesLastUpdate && (
                    <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                      Last update: {tradesLastUpdate?.toLocaleTimeString() || 'Loading...'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <User className="w-4 h-4" />
                  Profile
                </Button>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg gap-2"
                >
                  <Zap className="w-4 h-4" />
                  New Strategy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <Card
                    key={stat.title}
                    className="relative overflow-hidden border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-slate-800/20" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                        <p className="text-xs text-muted-foreground/70">{stat.description}</p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="text-3xl font-bold text-foreground mb-2" suppressHydrationWarning>{stat.value}</div>
                      <div className="flex items-center gap-2">
                        {stat.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span
                          className={`text-sm font-medium ${stat.trend === "up" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          suppressHydrationWarning
                        >
                          {stat.change}
                        </span>
                        <span className="text-sm text-muted-foreground">from yesterday</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Live Market Prices */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-slate-800/20 rounded-lg" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Activity className="w-6 h-6 text-green-600" />
                  Live Market Prices
                  <Badge variant="secondary" className="ml-auto">
                    {Array.from(marketPrices.keys()).length} Symbols
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Array.from(marketPrices.entries()).map(([symbol, data]) => (
                    <div key={symbol} className="text-center p-4 border border-border/50 rounded-lg bg-gradient-to-br from-white/50 to-slate-50/50 dark:from-slate-800/50 dark:to-slate-900/50">
                      <div className="font-semibold text-foreground text-lg">{symbol}</div>
                      <div className="text-2xl font-mono font-bold text-foreground">
                        {data.price?.toFixed(symbol.includes('JPY') ? 2 : 4)}
                      </div>
                      <div className={`flex items-center justify-center gap-1 mt-1 ${data.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span className="text-sm font-medium">
                          {data.change >= 0 ? '+' : ''}{data.change?.toFixed(4)}
                        </span>
                      </div>
                      <div className={`text-xs ${data.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.changePercent >= 0 ? '+' : ''}{data.changePercent?.toFixed(2)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-slate-800/20 rounded-lg" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  Trading Algorithm Control Panel
                  <Badge variant="secondary" className="ml-auto">
                    {activeStrategies.filter((s) => s.status === "running").length} Running
                  </Badge>
                </CardTitle>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    <Play className="w-3 h-3 mr-1" />
                    Start All
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Pause className="w-3 h-3 mr-1" />
                    Pause All
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Settings className="w-3 h-3 mr-1" />
                    Risk Settings
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {activeStrategies.map((strategy) => (
                    <div
                      key={strategy.id}
                      className="group p-6 border border-border/50 rounded-xl bg-gradient-to-r from-white/50 to-slate-50/50 dark:from-slate-800/50 dark:to-slate-900/50 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div
                              className={`w-4 h-4 rounded-full ${
                                strategy.status === "running"
                                  ? "bg-green-500 shadow-lg shadow-green-500/30"
                                  : "bg-yellow-500 shadow-lg shadow-yellow-500/30"
                              }`}
                            />
                            {strategy.status === "running" && (
                              <div className="absolute inset-0 w-4 h-4 rounded-full bg-green-500 animate-pulse" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-foreground text-lg">{strategy.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {strategy.pair}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {strategy.timeframe}
                              </Badge>
                              <Badge
                                variant={strategy.riskLevel === 'high' ? 'destructive' : strategy.riskLevel === 'medium' ? 'secondary' : 'default'}
                                className="text-xs"
                              >
                                Risk: {strategy.riskLevel}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                {strategy.trades} trades ({strategy.openPositions} open)
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Win rate: {strategy.winRate}
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                Exposure: <span suppressHydrationWarning>${strategy.exposure.toFixed(0)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                Avg size: ${(strategy.avgTradeSize || 1000).toFixed(0)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right space-y-1">
                            <div
                              className={`text-xl font-bold ${
                                strategy.pnl.startsWith("+")
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              <span suppressHydrationWarning>{strategy.pnl}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Drawdown: ${strategy.drawdown.toFixed(2)}
                            </div>
                            <Badge
                              variant={strategy.status === "running" ? "default" : "secondary"}
                              className={
                                strategy.status === "running"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : ""
                              }
                            >
                              {strategy.status}
                            </Badge>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-8 h-8 p-0 rounded-lg hover:bg-accent transition-all bg-transparent"
                              title={strategy.status === "running" ? "Pause Strategy" : "Start Strategy"}
                            >
                              {strategy.status === "running" ? (
                                <Pause className="w-3 h-3" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-8 h-8 p-0 rounded-lg hover:bg-accent transition-all bg-transparent"
                              title="Edit Settings"
                            >
                              <Settings className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      {strategy.lastTrade && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="text-xs text-muted-foreground" suppressHydrationWarning>
                            Last trade: {strategy.lastTrade ? new Date(strategy.lastTrade).toLocaleString() : 'No trades yet'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Risk Management Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-slate-800/20 rounded-lg" />
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    Risk Management Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-4">
                    {/* Risk Score Overview */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="text-sm text-muted-foreground mb-1">Portfolio Risk</div>
                        <div className="text-xl font-bold text-red-600" suppressHydrationWarning>{riskMetrics.riskScore}</div>
                        <div className="text-xs text-muted-foreground">Out of 100</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="text-sm text-muted-foreground mb-1">Margin Used</div>
                        <div className="text-xl font-bold text-orange-600" suppressHydrationWarning>{riskMetrics.marginUsed.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Of total capital</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="text-sm text-muted-foreground mb-1">Max Drawdown</div>
                        <div className="text-xl font-bold text-yellow-600" suppressHydrationWarning>{riskMetrics.maxDrawdown.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Current period</div>
                      </div>
                    </div>

                    {/* Risk Limits */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Risk Limits</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Daily Loss Limit</span>
                          <span className="text-sm font-medium">$2,500 / $5,000</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Position Size Limit</span>
                          <span className="text-sm font-medium">$12,450 / $25,000</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div className="bg-orange-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Risk Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Shield className="w-3 h-3 mr-1" />
                        Adjust Limits
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Emergency Stop
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Market Analysis Widgets */}
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-slate-800/20 rounded-lg" />
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500/10 to-blue-500/10 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    Market Analysis Widgets
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-4">
                    {/* Market Sentiment */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="text-sm text-muted-foreground mb-1">Bullish Signals</div>
                        <div className="text-2xl font-bold text-green-600">7</div>
                        <div className="text-xs text-green-600">+2 from yesterday</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="text-sm text-muted-foreground mb-1">Bearish Signals</div>
                        <div className="text-2xl font-bold text-red-600">3</div>
                        <div className="text-xs text-red-600">-1 from yesterday</div>
                      </div>
                    </div>

                    {/* Key Market Indicators */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Key Indicators</h4>
                      <div className="space-y-2">
                        {[
                          { symbol: 'EURUSD', indicator: 'RSI', value: 68, status: 'neutral' },
                          { symbol: 'GBPUSD', indicator: 'MACD', value: 0.0024, status: 'bullish' },
                          { symbol: 'USDJPY', indicator: 'Bollinger', value: 95, status: 'overbought' },
                          { symbol: 'USDCHF', indicator: 'Trend', value: 78, status: 'bullish' }
                        ].map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{item.symbol}</span>
                              <Badge variant="outline" className="text-xs">{item.indicator}</Badge>
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-medium ${
                                item.status === 'bullish' ? 'text-green-600' :
                                item.status === 'bearish' ? 'text-red-600' : 'text-blue-600'
                              }`}>
                                {typeof item.value === 'number' && item.value < 1 ? item.value.toFixed(4) : item.value}
                              </span>
                              <div className={`text-xs ${
                                item.status === 'bullish' ? 'text-green-600' :
                                item.status === 'bearish' ? 'text-red-600' : 'text-blue-600'
                              }`}>
                                {item.status}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Market Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Activity className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Market Scan
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Real-time Notifications System */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-slate-800/20 rounded-lg" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  Real-time Notifications
                  <Badge variant="secondary" className="ml-auto">3 active</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-3">
                  {[
                    { type: 'success', message: 'EURUSD strategy executed successfully - P&L: +$127.43', time: '2 min ago', priority: 'normal' },
                    { type: 'warning', message: 'Risk limit approaching: 78% of daily loss limit used', time: '5 min ago', priority: 'high' },
                    { type: 'info', message: 'AI optimization completed - 3.2% performance improvement', time: '12 min ago', priority: 'normal' },
                    { type: 'error', message: 'GBPUSD position hit stop loss at 1.2567', time: '18 min ago', priority: 'high' }
                  ].map((notification, index) => (
                    <div key={index} className={`flex items-start gap-3 p-3 border rounded-lg ${
                      notification.priority === 'high' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                      'border-border bg-white dark:bg-gray-900'
                    }`}>
                      <div className="mt-0.5">
                        {notification.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                        {notification.type === 'info' && <Activity className="w-4 h-4 text-blue-600" />}
                        {notification.type === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                      </div>
                      {notification.priority === 'high' && (
                        <Badge variant="destructive" className="text-xs">High Priority</Badge>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    Mark All Read
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Notification Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
    }
  }

  return renderContent()
}
