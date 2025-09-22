"use client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Bot, TrendingUp, Settings, Activity, Zap, Brain, Target, Pause as Pulse } from "lucide-react"

const menuItems = [
  { icon: BarChart3, label: "Dashboard", id: "dashboard" },
  { icon: Brain, label: "AI Strategy Builder", id: "strategy-builder" },
  { icon: Target, label: "Backtesting", id: "backtesting" },
  { icon: Bot, label: "MT5 Bots", id: "mt5-bots" },
  { icon: Activity, label: "Live Monitor", id: "monitor" },
  { icon: TrendingUp, label: "Analytics", id: "analytics" },
  { icon: Settings, label: "Settings", id: "settings" },
]

interface SidebarProps {
  activeView?: string
  onViewChange?: (view: string) => void
}

export function Sidebar({ activeView = "dashboard", onViewChange }: SidebarProps) {
  return (
    <div className="w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-r border-border/50 flex flex-col shadow-xl">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              ForexAI Pro
            </h1>
            <p className="text-sm text-muted-foreground">AI Trading Platform</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5" />
          <div className="relative p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Pulse className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-green-800 dark:text-green-200">System Status</span>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                Active
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700 dark:text-green-300">Active Bots</span>
                <span className="font-bold text-green-800 dark:text-green-200">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700 dark:text-green-300">Today's P&L</span>
                <span className="font-bold text-green-800 dark:text-green-200">+$247.50</span>
              </div>
              <div className="w-full bg-green-200/50 dark:bg-green-800/30 rounded-full h-2 mt-3">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full w-3/4" />
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Performance: 74% efficiency</p>
            </div>
          </div>
        </Card>
      </div>

      <nav className="flex-1 px-6 pb-6">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id

            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start gap-3 h-12 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50 shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:shadow-sm"
                }`}
                onClick={() => onViewChange?.(item.id)}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive
                      ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/20"
                      : "bg-transparent group-hover:bg-accent/30"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-medium">{item.label}</span>
                {isActive && <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />}
              </Button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
