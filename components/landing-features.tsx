"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Bot, BarChart3, Zap, Shield, Clock } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "AI Strategy Builder",
    description: "Create sophisticated trading strategies using natural language prompts and advanced AI algorithms.",
    color: "text-blue-600",
  },
  {
    icon: Bot,
    title: "Automated Execution",
    description: "Deploy your strategies as MT5 bots that trade 24/7 with precision and discipline.",
    color: "text-purple-600",
  },
  {
    icon: BarChart3,
    title: "Advanced Backtesting",
    description: "Test your strategies against years of historical data with detailed performance analytics.",
    color: "text-green-600",
  },
  {
    icon: Zap,
    title: "Real-time Optimization",
    description: "AI continuously monitors and optimizes your strategies for maximum performance.",
    color: "text-yellow-600",
  },
  {
    icon: Shield,
    title: "Risk Management",
    description: "Built-in risk controls and position sizing to protect your capital at all times.",
    color: "text-red-600",
  },
  {
    icon: Clock,
    title: "24/7 Monitoring",
    description: "Round-the-clock surveillance with instant alerts and performance notifications.",
    color: "text-indigo-600",
  },
]

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Everything You Need to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Dominate Forex
            </span>
          </h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-3xl mx-auto">
            Our comprehensive platform combines cutting-edge AI technology with professional-grade trading tools to give
            you the ultimate competitive advantage in the forex market.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="bg-card border-border hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      <Icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-card-foreground">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
