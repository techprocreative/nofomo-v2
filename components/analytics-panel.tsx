"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Target, Activity, Calendar, Download, Zap, BarChart, PieChart, Brain } from "lucide-react"
import { analyzeMarket } from "@/lib/utils/market-analysis"
import { MarketAnalysis, OHLCData } from "@/lib/types"

const performanceData = [
  { month: "Jan", profit: 1240, trades: 45, winRate: 73 },
  { month: "Feb", profit: 1580, trades: 52, winRate: 76 },
  { month: "Mar", profit: 890, trades: 38, winRate: 68 },
  { month: "Apr", profit: 2100, trades: 61, winRate: 81 },
  { month: "May", profit: 1750, trades: 49, winRate: 75 },
  { month: "Jun", profit: 2340, trades: 67, winRate: 79 },
]

const topStrategies = [
  { name: "EUR/USD Scalper", profit: 3240, trades: 156, winRate: 78.2, roi: 24.8 },
  { name: "GBP/JPY Trend", profit: 2890, trades: 89, winRate: 82.1, roi: 31.2 },
  { name: "Multi-Pair Arbitrage", profit: 1560, trades: 234, winRate: 65.4, roi: 18.7 },
  { name: "USD/CAD Range", profit: 1240, trades: 67, winRate: 71.6, roi: 22.1 },
]

interface MarketAnalyticsData {
  symbol: string;
  analysis: MarketAnalysis;
  historicalData: OHLCData[];
  lastUpdated: Date;
}

export function AnalyticsPanel() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("EURUSD")
  const [marketData, setMarketData] = useState<Map<string, MarketAnalyticsData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [availableSymbols, setAvailableSymbols] = useState<string[]>(["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "GBPCHF"])

  const fetchMarketAnalysis = async (symbol: string) => {
    try {
      const response = await fetch(`/api/market/history?symbol=${symbol}&timeframe=1h&limit=100`)
      const data = await response.json()
      const historicalData = data.success ? data.data : []
      const analysis = analyzeMarket(historicalData)

      setMarketData(prev => new Map(prev.set(symbol, {
        symbol,
        analysis,
        historicalData,
        lastUpdated: new Date()
      })))
    } catch (error) {
      console.error(`Failed to fetch analysis for ${symbol}:`, error)
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      for (const symbol of availableSymbols) {
        await fetchMarketAnalysis(symbol)
      }
      setLoading(false)
    }

    loadInitialData()

    // Refresh data every 5 minutes
    const interval = setInterval(() => {
      fetchMarketAnalysis(selectedSymbol)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [selectedSymbol])

  const currentAnalysis = marketData.get(selectedSymbol)
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            Trading Analytics
          </h1>
          <p className="text-muted-foreground">Comprehensive performance analysis and insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Custom Range
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-700 hover:to-purple-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Total Profit</span>
            </div>
            <div className="text-2xl font-bold text-green-600">$12,847</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600">+18.3% this month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Total Trades</span>
            </div>
            <div className="text-2xl font-bold text-foreground">1,247</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600">+12% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-muted-foreground">Win Rate</span>
            </div>
            <div className="text-2xl font-bold text-foreground">73.8%</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600">+2.1% improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-muted-foreground">Max Drawdown</span>
            </div>
            <div className="text-2xl font-bold text-red-600">-8.3%</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600">-1.2% better</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="algorithms">Algorithms</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="market-analysis">Market Analysis</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceData.map((data, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {data.month}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{data.month} 2024</h3>
                        <div className="text-sm text-muted-foreground">
                          {data.trades} trades • {data.winRate}% win rate
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">+${data.profit.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {((data.profit / 10000) * 100).toFixed(1)}% ROI
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="algorithms" className="space-y-6">
          {/* Algorithm Comparison Charts */}
          <Card>
            <CardHeader>
              <CardTitle>Algorithm Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Chart */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Monthly Returns by Algorithm</h4>
                  <div className="space-y-3">
                    {[
                      { name: 'Statistical Arbitrage', returns: [2.1, 1.8, -0.5, 3.2, 2.8], color: 'bg-purple-500' },
                      { name: 'Momentum Strategy', returns: [1.5, 2.2, 1.8, 2.5, 1.9], color: 'bg-blue-500' },
                      { name: 'Mean Reversion', returns: [0.8, 1.2, 2.1, 1.5, 1.8], color: 'bg-green-500' },
                      { name: 'Pairs Trading', returns: [-0.2, 1.8, 0.9, 2.2, 1.2], color: 'bg-orange-500' }
                    ].map((algorithm, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-medium truncate">{algorithm.name}</div>
                        <div className="flex-1 flex gap-1">
                          {algorithm.returns.map((ret, i) => (
                            <div
                              key={i}
                              className={`h-6 ${ret >= 0 ? algorithm.color : 'bg-red-500'} rounded`}
                              style={{ width: `${Math.abs(ret) * 20}px`, minWidth: '4px' }}
                              title={`${ret >= 0 ? '+' : ''}${ret}%`}
                            />
                          ))}
                        </div>
                        <div className="w-16 text-right text-sm font-medium">
                          {algorithm.returns.reduce((a, b) => a + b, 0).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk-Return Scatter Plot */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Risk vs Return Analysis</h4>
                  <div className="relative h-64 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    {/* Simple scatter plot representation */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="grid grid-cols-5 grid-rows-5 gap-4 w-full h-full">
                        {[
                          { name: 'Stat Arb', x: 2, y: 3, risk: 'Low', return: 'High' },
                          { name: 'Momentum', x: 4, y: 4, risk: 'Medium', return: 'High' },
                          { name: 'Mean Rev', x: 1, y: 2, risk: 'Low', return: 'Medium' },
                          { name: 'Pairs', x: 3, y: 2, risk: 'Medium', return: 'Medium' }
                        ].map((point, i) => (
                          <div
                            key={i}
                            className={`col-start-${point.x} row-start-${point.y} w-3 h-3 rounded-full bg-blue-500 relative group`}
                          >
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {point.name}: {point.risk} Risk, {point.return} Return
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">Low Risk ← → High Risk</div>
                    <div className="absolute left-2 bottom-8 -rotate-90 text-xs text-muted-foreground origin-left">Low Return ← → High Return</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-muted-foreground">Active Algorithms</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">3</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">All running</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-muted-foreground">Total Signals</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">1,247</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">+15% this week</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-muted-foreground">Algorithm Win Rate</span>
                </div>
                <div className="text-2xl font-bold text-green-600">76.2%</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">+3.1% vs manual</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-muted-foreground">Avg Execution Time</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">2.3s</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">-0.5s improvement</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Algorithm Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Statistical Arbitrage', profit: 2850, trades: 45, winRate: 78, status: 'active', type: 'arbitrage' },
                    { name: 'Momentum Strategy', profit: 1920, trades: 32, winRate: 81, status: 'active', type: 'momentum' },
                    { name: 'Mean Reversion', profit: 1340, trades: 28, winRate: 75, status: 'active', type: 'reversion' },
                    { name: 'Pairs Trading', profit: 890, trades: 18, winRate: 72, status: 'paused', type: 'pairs' }
                  ].map((algorithm, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                          algorithm.type === 'arbitrage' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                          algorithm.type === 'momentum' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                          algorithm.type === 'reversion' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                          'bg-gradient-to-br from-orange-500 to-red-500'
                        }`}>
                          {algorithm.type.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{algorithm.name}</h3>
                          <div className="text-sm text-muted-foreground">
                            {algorithm.trades} trades • {algorithm.winRate}% win rate
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium text-green-600">+${algorithm.profit.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">
                            {((algorithm.profit / 10000) * 100).toFixed(1)}% ROI
                          </div>
                        </div>
                        <Badge variant={algorithm.status === 'active' ? 'default' : 'secondary'}>
                          {algorithm.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Algorithm Health & Risk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: 'Statistical Arbitrage', health: 95, risk: 12, signals: 23, lastExecution: '2 min ago' },
                  { name: 'Momentum Strategy', health: 88, risk: 18, signals: 18, lastExecution: '5 min ago' },
                  { name: 'Mean Reversion', health: 92, risk: 15, signals: 15, lastExecution: '3 min ago' },
                  { name: 'Pairs Trading', health: 78, risk: 25, signals: 8, lastExecution: '12 min ago' }
                ].map((algorithm, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">{algorithm.name}</h4>
                      <Badge variant={algorithm.health > 90 ? 'default' : algorithm.health > 80 ? 'secondary' : 'destructive'}>
                        {algorithm.health}% Health
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Risk Score</div>
                        <div className={`font-medium ${algorithm.risk > 20 ? 'text-red-600' : algorithm.risk > 15 ? 'text-orange-600' : 'text-green-600'}`}>
                          {algorithm.risk}/100
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Signals/Hour</div>
                        <div className="font-medium text-foreground">{algorithm.signals}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Last Execution</div>
                        <div className="font-medium text-foreground">{algorithm.lastExecution}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="market-analysis" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Real-time Market Analysis</h2>
              <p className="text-sm text-muted-foreground">Live technical analysis with AI insights</p>
            </div>
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSymbols.map(symbol => (
                  <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Market Sentiment Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-muted-foreground">Bullish Signals</span>
                </div>
                <div className="text-2xl font-bold text-green-600">7</div>
                <div className="text-xs text-green-600">+2 from last hour</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-muted-foreground">Bearish Signals</span>
                </div>
                <div className="text-2xl font-bold text-red-600">3</div>
                <div className="text-xs text-red-600">-1 from last hour</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-muted-foreground">Neutral/Hold</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">2</div>
                <div className="text-xs text-muted-foreground">No change</div>
              </CardContent>
            </Card>
          </div>

          {currentAnalysis ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Technical Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="w-5 h-5" />
                    Technical Indicators
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">RSI (14)</div>
                      <div className="text-lg font-semibold text-foreground">
                        {currentAnalysis.analysis.indicators.rsi?.toFixed(2) || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">MACD</div>
                      <div className="text-lg font-semibold text-foreground">
                        {currentAnalysis.analysis.indicators.macd?.line.toFixed(5) || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">SMA (20)</div>
                      <div className="text-lg font-semibold text-foreground">
                        {currentAnalysis.analysis.indicators.sma?.toFixed(5) || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">EMA (20)</div>
                      <div className="text-lg font-semibold text-foreground">
                        {currentAnalysis.analysis.indicators.ema?.toFixed(5) || 'N/A'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Market Trend & Volatility */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Market Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Trend Direction</div>
                    <Badge variant={currentAnalysis.analysis.trend.direction === 'up' ? 'default' : currentAnalysis.analysis.trend.direction === 'down' ? 'destructive' : 'secondary'}>
                      {currentAnalysis.analysis.trend.direction.toUpperCase()}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      Strength: {currentAnalysis.analysis.trend.strength}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Volatility (ATR)</div>
                    <div className="text-lg font-semibold text-foreground">
                      {currentAnalysis.analysis.volatility.atr?.toFixed(5) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Liquidity Score</div>
                    <div className="text-lg font-semibold text-foreground">
                      {currentAnalysis.analysis.liquidity.score}/100
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bollinger Bands */}
              {currentAnalysis.analysis.indicators.bollingerBands && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Bollinger Bands
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Upper</div>
                        <div className="text-lg font-semibold text-red-600">
                          {currentAnalysis.analysis.indicators.bollingerBands.upper.toFixed(5)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Middle</div>
                        <div className="text-lg font-semibold text-foreground">
                          {currentAnalysis.analysis.indicators.bollingerBands.middle.toFixed(5)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Lower</div>
                        <div className="text-lg font-semibold text-green-600">
                          {currentAnalysis.analysis.indicators.bollingerBands.lower.toFixed(5)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Price Action */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">24h Volume</span>
                      <span className="font-medium">{currentAnalysis.analysis.liquidity.volume24h.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Spread</span>
                      <span className="font-medium">{currentAnalysis.analysis.liquidity.spreadAverage.toFixed(5)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated</span>
                      <span className="font-medium" suppressHydrationWarning>{currentAnalysis.lastUpdated.toLocaleTimeString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">Loading market analysis...</div>
              </CardContent>
            </Card>
          )}

          {/* Market Regime & AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Market Insights & Regime Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Market Regime */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Market Regime Detection</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <div>
                          <div className="font-medium text-sm">Trending Upward</div>
                          <div className="text-xs text-muted-foreground">Primary regime: Bullish trend</div>
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800">87% confidence</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div className="text-muted-foreground">Volatility</div>
                        <div className="font-medium text-blue-600">Low</div>
                        <div className="text-xs text-muted-foreground">ATR: 0.0012</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <div className="text-muted-foreground">Liquidity</div>
                        <div className="font-medium text-purple-600">High</div>
                        <div className="text-xs text-muted-foreground">Score: 92/100</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Pattern Recognition */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Detected Patterns & Signals</h4>
                  <div className="space-y-3">
                    {[
                      { pattern: 'Bullish Flag', confidence: 89, direction: 'bullish', timeframe: '4h' },
                      { pattern: 'Support Level', confidence: 76, direction: 'neutral', timeframe: '1h' },
                      { pattern: 'RSI Divergence', confidence: 68, direction: 'bearish', timeframe: '30m' },
                      { pattern: 'Volume Spike', confidence: 82, direction: 'bullish', timeframe: '1h' }
                    ].map((pattern, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            pattern.direction === 'bullish' ? 'bg-green-500' :
                            pattern.direction === 'bearish' ? 'bg-red-500' : 'bg-blue-500'
                          }`}></div>
                          <div>
                            <div className="font-medium text-sm">{pattern.pattern}</div>
                            <div className="text-xs text-muted-foreground">{pattern.timeframe} timeframe</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">{pattern.confidence}%</div>
                          <Badge variant="outline" className="text-xs">
                            {pattern.direction}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trading Recommendations */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">AI Trading Recommendation</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                      Based on current market analysis, the AI recommends a bullish bias with scalping opportunities on EURUSD.
                      Risk management suggests limiting position sizes to 2% of equity per trade.
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="default" className="text-xs">Buy Signal</Badge>
                      <Badge variant="secondary" className="text-xs">Scalping Strategy</Badge>
                      <Badge variant="outline" className="text-xs">Medium Risk</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-6">
          {/* AI Strategy Performance Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Strategy Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* AI vs Manual Performance */}
                <div>
                  <h4 className="text-sm font-medium mb-4">AI vs Manual Trading Performance</h4>
                  <div className="space-y-3">
                    {[
                      { period: '1 Month', aiReturn: 8.7, manualReturn: 4.2, aiSharpe: 1.8, manualSharpe: 1.2 },
                      { period: '3 Months', aiReturn: 24.1, manualReturn: 12.8, aiSharpe: 2.1, manualSharpe: 1.5 },
                      { period: '6 Months', aiReturn: 45.3, manualReturn: 28.6, aiSharpe: 2.3, manualSharpe: 1.6 },
                      { period: '1 Year', aiReturn: 78.9, manualReturn: 42.1, aiSharpe: 2.2, manualSharpe: 1.4 }
                    ].map((period, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{period.period}</span>
                          <span className="text-green-600">AI: +{period.aiReturn}%</span>
                          <span className="text-blue-600">Manual: +{period.manualReturn}%</span>
                        </div>
                        <div className="flex gap-1">
                          <div
                            className="h-4 bg-green-500 rounded"
                            style={{ width: `${period.aiReturn}%`, maxWidth: '200px' }}
                          />
                          <div
                            className="h-4 bg-blue-500 rounded"
                            style={{ width: `${period.manualReturn}%`, maxWidth: '200px' }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Sharpe AI: {period.aiSharpe}</span>
                          <span>Sharpe Manual: {period.manualSharpe}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Strategy Confidence vs Performance */}
                <div>
                  <h4 className="text-sm font-medium mb-4">AI Confidence vs Actual Performance</h4>
                  <div className="space-y-3">
                    {[
                      { confidence: 'High (90-100%)', predicted: 8.2, actual: 9.1, accuracy: 98 },
                      { confidence: 'Medium (70-89%)', predicted: 6.8, actual: 7.2, accuracy: 92 },
                      { confidence: 'Low (50-69%)', predicted: 4.1, actual: 3.8, accuracy: 85 }
                    ].map((level, index) => (
                      <div key={index} className="p-3 border border-border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">{level.confidence}</span>
                          <Badge variant={level.accuracy > 95 ? 'default' : level.accuracy > 90 ? 'secondary' : 'outline'}>
                            {level.accuracy}% accurate
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <div className="text-muted-foreground">Predicted Return</div>
                            <div className="font-medium text-blue-600">+{level.predicted}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Actual Return</div>
                            <div className="font-medium text-green-600">+{level.actual}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'AI Momentum Scalper', profit: 3240, trades: 156, winRate: 78.2, roi: 24.8, aiScore: 95, type: 'ai' },
                  { name: 'AI Trend Follower', profit: 2890, trades: 89, winRate: 82.1, roi: 31.2, aiScore: 92, type: 'ai' },
                  { name: 'Manual Range Trader', profit: 1560, trades: 234, winRate: 65.4, roi: 18.7, aiScore: null, type: 'manual' },
                  { name: 'AI Mean Reversion', profit: 1240, trades: 67, winRate: 71.6, roi: 22.1, aiScore: 88, type: 'ai' }
                ].map((strategy, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                        strategy.type === 'ai' ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                      }`}>
                        {strategy.type === 'ai' ? '🤖' : '#'}
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{strategy.name}</h3>
                          {strategy.type === 'ai' && (
                            <Badge variant="outline" className="text-xs">AI Generated</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {strategy.trades} trades • {strategy.winRate}% win rate
                          {strategy.aiScore && ` • AI Score: ${strategy.aiScore}%`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-medium text-green-600">+${strategy.profit.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{strategy.roi}% ROI</div>
                      </div>
                      <Badge variant={strategy.type === 'ai' ? 'default' : 'secondary'}>
                        {strategy.type === 'ai' ? 'AI Optimized' : 'Active'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currencies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Symbol Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableSymbols.map((symbol, index) => {
                  const analysis = marketData.get(symbol)?.analysis;
                  return (
                    <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {symbol.substring(0, 3)}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{symbol}</h3>
                          <div className="text-sm text-muted-foreground">
                            Trend: {analysis?.trend.direction || 'N/A'} • RSI: {analysis?.indicators.rsi?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Volatility</div>
                          <div className="font-medium text-foreground">
                            {analysis?.volatility.standardDeviation?.toFixed(5) || 'N/A'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            {analysis?.liquidity.score || 0}/100
                          </div>
                          <div className="text-sm text-muted-foreground">Liquidity</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          {/* Risk Heat Map */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Exposure Heat Map</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2 mb-4">
                <div></div>
                {['Low', 'Medium', 'High', 'Very High', 'Extreme'].map((level, i) => (
                  <div key={i} className="text-center text-xs font-medium text-muted-foreground">{level}</div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { asset: 'EURUSD', risk: [0.1, 0.3, 0.2, 0.1, 0.3] },
                  { asset: 'GBPUSD', risk: [0.2, 0.4, 0.2, 0.1, 0.1] },
                  { asset: 'USDJPY', risk: [0.3, 0.2, 0.3, 0.1, 0.1] },
                  { asset: 'USDCHF', risk: [0.1, 0.2, 0.4, 0.2, 0.1] },
                  { asset: 'AUDUSD', risk: [0.2, 0.3, 0.2, 0.2, 0.1] }
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-16 text-sm font-medium">{row.asset}</div>
                    <div className="flex gap-1 flex-1">
                      {row.risk.map((value, j) => (
                        <div
                          key={j}
                          className={`h-6 flex-1 rounded ${
                            j === 0 ? 'bg-green-200 dark:bg-green-800' :
                            j === 1 ? 'bg-yellow-200 dark:bg-yellow-800' :
                            j === 2 ? 'bg-orange-200 dark:bg-orange-800' :
                            j === 3 ? 'bg-red-200 dark:bg-red-800' :
                            'bg-purple-200 dark:bg-purple-800'
                          }`}
                          style={{ opacity: value }}
                          title={`Risk level ${j + 1}: ${(value * 100).toFixed(0)}%`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Value at Risk (95%)</span>
                  <div className="text-right">
                    <span className="font-medium text-foreground">$234.50</span>
                    <div className="text-xs text-muted-foreground">Daily</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Sharpe Ratio</span>
                  <div className="text-right">
                    <span className="font-medium text-foreground">1.42</span>
                    <div className="text-xs text-green-600">+0.12 this month</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Sortino Ratio</span>
                  <div className="text-right">
                    <span className="font-medium text-foreground">1.89</span>
                    <div className="text-xs text-green-600">+0.08 this month</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Calmar Ratio</span>
                  <div className="text-right">
                    <span className="font-medium text-foreground">2.98</span>
                    <div className="text-xs text-red-600">-0.15 this month</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Beta vs SP500</span>
                  <div className="text-right">
                    <span className="font-medium text-foreground">0.73</span>
                    <div className="text-xs text-muted-foreground">Market correlation</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Max Drawdown</span>
                  <div className="text-right">
                    <span className="font-medium text-red-600">-8.3%</span>
                    <div className="text-xs text-green-600">-1.2% better</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Drawdown Analysis & Recovery</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Current Drawdown</span>
                    <span className="font-medium text-red-600">-2.1%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '21%' }}></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Recovery Progress</span>
                    <span className="font-medium text-green-600">68%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '68%' }}></div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Drawdown</span>
                  <span className="font-medium text-red-600">-8.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Drawdown</span>
                  <span className="font-medium text-red-600">-3.7%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recovery Time</span>
                  <span className="font-medium text-foreground">4.2 days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Drawdown Frequency</span>
                  <span className="font-medium text-foreground">12.3%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stress Testing Results */}
          <Card>
            <CardHeader>
              <CardTitle>Stress Testing Scenarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { scenario: '2020 Market Crash', loss: -15.7, probability: 5 },
                  { scenario: '2018 Volatility Spike', loss: -8.2, probability: 15 },
                  { scenario: 'Brexit Impact', loss: -12.4, probability: 8 },
                  { scenario: 'Fed Rate Shock', loss: -6.8, probability: 20 },
                  { scenario: 'Normal Market', loss: -2.1, probability: 52 }
                ].map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        test.probability > 40 ? 'bg-green-500' :
                        test.probability > 15 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}></div>
                      <div>
                        <h4 className="font-medium text-sm">{test.scenario}</h4>
                        <p className="text-xs text-muted-foreground">{test.probability}% probability</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-600">{test.loss}% loss</div>
                      <div className="text-xs text-muted-foreground">max expected</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
