"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Target, Play, BarChart3, TrendingUp, TrendingDown, Calendar, DollarSign, Activity } from "lucide-react"

interface BacktestResults {
  performance_metrics: {
    total_return: number;
    win_rate: number;
    max_drawdown: number;
    sharpe_ratio: number;
    profit_factor: number;
    total_trades: number;
  };
  trade_log: Array<{
    entry_time: Date;
    exit_time: Date;
    symbol: string;
    side: 'buy' | 'sell';
    entry_price: number;
    exit_price: number;
    profit_loss: number;
    commission: number;
  }>;
}

export function BacktestingPanel() {
  const [isRunning, setIsRunning] = useState(false)
  const [hasResults, setHasResults] = useState(false)
  const [results, setResults] = useState<BacktestResults | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState("")
  const [startDate, setStartDate] = useState("2024-01-01")
  const [endDate, setEndDate] = useState("2024-01-31")
  const [initialBalance, setInitialBalance] = useState("10000")
  const [spread, setSpread] = useState("1.5")
  const [commission, setCommission] = useState("7.0")

  const handleRunBacktest = async () => {
    if (!selectedStrategy) {
      alert('Please select a strategy first')
      return
    }

    setIsRunning(true)
    setResults(null)

    try {
      const response = await fetch('/api/backtesting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy: {
            id: selectedStrategy,
            user_id: 'test-user', // This should come from auth context
            name: selectedStrategy,
            strategy_data: {
              indicators: ['SMA'],
              fast_period: 10,
              slow_period: 20,
              entry_conditions: { sma_crossover: true },
              exit_conditions: { take_profit: 0.02, stop_loss: 0.01 }
            }
          },
          symbol: 'EURUSD',
          timeframe: '1h',
          startDate,
          endDate,
          initialBalance: parseFloat(initialBalance),
          spread: parseFloat(spread),
          commission: parseFloat(commission)
        })
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.data.results)
        setHasResults(true)
      } else {
        alert('Backtest failed: ' + data.error)
      }
    } catch (error) {
      console.error('Backtest error:', error)
      alert('Failed to run backtest')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Target className="w-8 h-8 text-green-600" />
            Strategy Backtesting
          </h1>
          <p className="text-muted-foreground">Test your strategies against historical data</p>
        </div>
        <Button
          onClick={handleRunBacktest}
          disabled={isRunning}
          className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600"
        >
          <Play className="w-4 h-4 mr-2" />
          {isRunning ? "Running..." : "Run Backtest"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Backtest Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="strategy-select">Strategy</Label>
                <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sma-crossover">SMA Crossover Strategy</SelectItem>
                    <SelectItem value="rsi-mean-reversion">RSI Mean Reversion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    type="date"
                    id="start-date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    type="date"
                    id="end-date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial-balance">Initial Balance</Label>
                <Input
                  id="initial-balance"
                  placeholder="10000"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="spread">Spread (pips)</Label>
                <Input
                  id="spread"
                  placeholder="1.5"
                  value={spread}
                  onChange={(e) => setSpread(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commission">Commission per lot</Label>
                <Input
                  id="commission"
                  placeholder="7.00"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {hasResults && (
            <>
              {/* Performance Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-muted-foreground">Total Trades</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{results?.trade_log?.length || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-muted-foreground">Win Rate</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{((results?.performance_metrics?.win_rate || 0) * 100).toFixed(1)}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-muted-foreground">Total Return</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">+{((results?.performance_metrics?.total_return || 0) * 100).toFixed(2)}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-muted-foreground">Max Drawdown</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">{((results?.performance_metrics?.max_drawdown || 0) * 100).toFixed(2)}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-muted-foreground">Sharpe Ratio</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{(results?.performance_metrics?.sharpe_ratio || 0).toFixed(2)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-muted-foreground">Profit Factor</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{(results?.performance_metrics?.profit_factor || 0).toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Trade History */}
              <Card>
                <CardHeader>
                  <CardTitle>Trade History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {results?.trade_log?.slice(0, 10).map((trade, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant={trade.side === "buy" ? "default" : "secondary"}>{trade.side.toUpperCase()}</Badge>
                          <div>
                            <div className="font-medium text-foreground">{trade.symbol}</div>
                            <div className="text-sm text-muted-foreground">{new Date(trade.entry_time).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-medium ${trade.profit_loss >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            ${trade.profit_loss.toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {Math.round((new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime()) / (1000 * 60))}m
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center text-muted-foreground py-8">
                        No trades to display
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {isRunning && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-foreground mb-2">Running Backtest...</h3>
                <p className="text-muted-foreground">Analyzing historical data and calculating performance metrics</p>
              </CardContent>
            </Card>
          )}

          {!hasResults && !isRunning && (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Results Yet</h3>
                <p className="text-muted-foreground">
                  Configure your backtest settings and click "Run Backtest" to see results
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
