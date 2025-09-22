"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Settings, Play, TrendingUp } from "lucide-react"

const steps = [
  {
    step: "01",
    icon: Brain,
    title: "Describe Your Strategy",
    description:
      "Use natural language to describe your trading approach. Our AI understands complex trading concepts and converts them into executable strategies.",
  },
  {
    step: "02",
    icon: Settings,
    title: "Configure & Backtest",
    description:
      "Fine-tune parameters, select currency pairs, and run comprehensive backtests against historical data to validate performance.",
  },
  {
    step: "03",
    icon: Play,
    title: "Deploy to MT5",
    description:
      "Launch your strategy as an automated trading bot on MetaTrader 5 with just one click. Start with demo or go live immediately.",
  },
  {
    step: "04",
    icon: TrendingUp,
    title: "Monitor & Optimize",
    description:
      "Watch your bot trade in real-time while our AI continuously optimizes performance and manages risk automatically.",
  },
]

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            From Idea to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Automated Profits
            </span>
          </h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-3xl mx-auto">
            Transform your trading ideas into profitable automated strategies in just four simple steps. No coding
            required, no complex setup - just pure trading intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Steps */}
          <div className="space-y-6">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <Card key={index} className="bg-card border-border p-6">
                  <CardContent className="p-0">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-sm">
                          {step.step}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold text-card-foreground">{step.title}</h3>
                        </div>
                        <p className="text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8">
              <div className="space-y-6">
                {/* Mock Strategy Input */}
                <div className="bg-card rounded-lg p-4 border border-border">
                  <div className="text-sm text-muted-foreground mb-2">AI Strategy Prompt:</div>
                  <div className="text-card-foreground italic">
                    "Create a scalping strategy for EUR/USD that buys when RSI is oversold and price is above 20 EMA..."
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>

                {/* Mock Results */}
                <div className="bg-card rounded-lg p-4 border border-border">
                  <div className="text-sm text-muted-foreground mb-3">Generated Strategy Performance:</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-lg font-bold text-accent">+247.5%</div>
                      <div className="text-xs text-muted-foreground">Annual Return</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-accent">87.3%</div>
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="text-center pt-4">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Try It Free Today</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
