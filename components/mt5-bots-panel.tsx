"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bot, Play, Pause, Settings, Plus, Activity, DollarSign, TrendingUp, AlertCircle } from "lucide-react"

const mockBots = [
  {
    id: 1,
    name: "EUR/USD Scalper Pro",
    status: "running",
    strategy: "AI Scalping",
    pnl: "+$247.50",
    trades: 23,
    winRate: "78.3%",
    lastTrade: "2 min ago",
  },
  {
    id: 2,
    name: "GBP/JPY Trend Hunter",
    status: "running",
    strategy: "Trend Following",
    pnl: "+$156.20",
    trades: 12,
    winRate: "83.3%",
    lastTrade: "15 min ago",
  },
  {
    id: 3,
    name: "USD/CAD Range Bot",
    status: "paused",
    strategy: "Range Trading",
    pnl: "+$89.40",
    trades: 8,
    winRate: "62.5%",
    lastTrade: "1 hour ago",
  },
  {
    id: 4,
    name: "Multi-Pair Arbitrage",
    status: "stopped",
    strategy: "Arbitrage",
    pnl: "-$23.10",
    trades: 5,
    winRate: "40.0%",
    lastTrade: "3 hours ago",
  },
]

export function MT5BotsPanel() {
  const [bots, setBots] = useState(mockBots)

  const toggleBot = (botId: number) => {
    setBots((prev) =>
      prev.map((bot) =>
        bot.id === botId
          ? {
              ...bot,
              status: bot.status === "running" ? "paused" : "running",
            }
          : bot,
      ),
    )
  }

  const runningBots = bots.filter((bot) => bot.status === "running").length
  const totalPnL = bots.reduce((sum, bot) => {
    const pnl = Number.parseFloat(bot.pnl.replace(/[+$,]/g, ""))
    return sum + pnl
  }, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Bot className="w-8 h-8 text-purple-600" />
            MT5 Trading Bots
          </h1>
          <p className="text-muted-foreground">Deploy and manage your automated trading strategies</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600">
          <Plus className="w-4 h-4 mr-2" />
          Deploy New Bot
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Active Bots</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{runningBots}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Total P&L</span>
            </div>
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-muted-foreground">Total Trades</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{bots.reduce((sum, bot) => sum + bot.trades, 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-muted-foreground">Avg Win Rate</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {(bots.reduce((sum, bot) => sum + Number.parseFloat(bot.winRate), 0) / bots.length).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MT5 Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            MT5 Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <h3 className="font-medium text-green-800 dark:text-green-200">Connected to MT5</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Server: ICMarkets-Demo01 | Account: 12345678
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-green-300 text-green-700 hover:bg-green-100 bg-transparent"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bots List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Trading Bots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bots.map((bot) => (
              <div key={bot.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      bot.status === "running"
                        ? "bg-green-500 animate-pulse"
                        : bot.status === "paused"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                  />
                  <div>
                    <h3 className="font-medium text-foreground">{bot.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{bot.strategy}</span>
                      <span>{bot.trades} trades</span>
                      <span>Win rate: {bot.winRate}</span>
                      <span>Last: {bot.lastTrade}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`font-medium ${bot.pnl.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
                      {bot.pnl}
                    </div>
                    <Badge
                      variant={
                        bot.status === "running" ? "default" : bot.status === "paused" ? "secondary" : "destructive"
                      }
                    >
                      {bot.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-8 h-8 p-0 bg-transparent"
                      onClick={() => toggleBot(bot.id)}
                    >
                      {bot.status === "running" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" className="w-8 h-8 p-0 bg-transparent">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deployment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Deploy New Bot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bot-name">Bot Name</Label>
              <Input id="bot-name" placeholder="e.g., EUR/USD Scalper" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strategy-select">Strategy</Label>
              <Input id="strategy-select" placeholder="Select strategy" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot-size">Lot Size</Label>
              <Input id="lot-size" placeholder="0.01" />
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Deployment Requirements:</p>
              <ul className="space-y-1 text-xs">
                <li>• MT5 terminal must be running and connected</li>
                <li>• Strategy must pass backtesting validation</li>
                <li>• Sufficient account balance for selected lot size</li>
              </ul>
            </div>
          </div>
          <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600">
            <Bot className="w-4 h-4 mr-2" />
            Deploy Bot to MT5
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
