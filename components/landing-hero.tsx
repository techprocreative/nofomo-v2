"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, TrendingUp, Bot, Zap } from "lucide-react"

export function LandingHero() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Fixed data for server-side rendering to prevent hydration mismatches
  const chartData = isHydrated
    ? [...Array(12)].map((_, i) => Math.random() * 80 + 20) // Random only after hydration
    : [45, 62, 78, 52, 89, 34, 67, 91, 43, 76, 58, 84] // Fixed values for SSR

  const strategyProfits = isHydrated
    ? [145.67, 89.23, 234.89] // Random after hydration
    : [145.67, 89.23, 234.89] // Same fixed values for SSR
  return (
    <section className="pt-24 pb-16 bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                <Zap className="w-3 h-3 mr-1" />
                AI-Powered Trading
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
                Trade Forex with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  AI Precision
                </span>
              </h1>
              <p className="text-xl text-muted-foreground text-pretty max-w-2xl">
                Harness the power of artificial intelligence to automate your forex trading strategies. Deploy
                sophisticated bots, backtest with precision, and optimize performance in real-time.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">87.3%</div>
                <div className="text-sm text-muted-foreground">Avg Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">$2.4M+</div>
                <div className="text-sm text-muted-foreground">Profits Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">15,000+</div>
                <div className="text-sm text-muted-foreground">Active Traders</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Bot className="w-5 h-5 mr-2" />
                Start Trading Now
              </Button>
              <Button size="lg" variant="outline" className="border-border hover:bg-muted bg-transparent">
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-sm text-muted-foreground">MT5 Integrated</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-sm text-muted-foreground">Bank-Grade Security</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-sm text-muted-foreground">24/7 Support</span>
              </div>
            </div>
          </div>

          {/* Right Content - Trading Dashboard Preview */}
          <div className="relative">
            <div className="bg-card border border-border rounded-xl p-6 shadow-2xl">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-card-foreground">Live Trading Dashboard</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                </div>

                {/* Mock Trading Data */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-sm text-muted-foreground">Today's P&L</div>
                    <div className="text-lg font-bold text-accent">+$1,247.50</div>
                    <div className="flex items-center gap-1 text-xs text-accent">
                      <TrendingUp className="w-3 h-3" />
                      +12.3%
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-sm text-muted-foreground">Active Bots</div>
                    <div className="text-lg font-bold text-card-foreground">7</div>
                    <div className="text-xs text-muted-foreground">Running</div>
                  </div>
                </div>

                {/* Mock Chart */}
                <div className="bg-muted/30 rounded-lg p-4 h-32 flex items-end justify-between">
                  {chartData.map((height, i) => (
                    <div
                      key={i}
                      className="bg-primary rounded-sm"
                      style={{
                        height: `${height}%`,
                        width: "6px",
                      }}
                    />
                  ))}
                </div>

                {/* Mock Strategy List */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-card-foreground">Active Strategies</div>
                  {["EUR/USD Scalper", "GBP/JPY Trend", "Multi-Pair Arbitrage"].map((strategy, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{strategy}</span>
                      <span className="text-accent font-medium">+{strategyProfits[i].toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-accent text-accent-foreground rounded-full p-3 shadow-lg">
              <Bot className="w-6 h-6" />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-primary text-primary-foreground rounded-full p-3 shadow-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
