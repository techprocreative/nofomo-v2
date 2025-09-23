"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { BarChart3, Bot, TrendingUp, Settings, Activity, Zap, Brain, Target, Pause as Pulse, ChevronDown, ChevronRight, AlertTriangle, CheckCircle, XCircle, Bell } from "lucide-react"
import { useRealtimeState } from "@/hooks/useRealtimeState"
import { useRealtimeDataStore } from "@/lib/stores/realtimeDataStore"
import { useEventBus } from "@/hooks/useEventBus"
import { useSignalEvents } from "@/hooks/useEventBus"
import { ThemeToggle } from "@/components/theme-toggle"

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
  const [isStatusCollapsed, setIsStatusCollapsed] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])
  const { positions, connectionStatus, signals } = useRealtimeDataStore()
  const { on } = useEventBus()

  // Load persisted collapse state
  useEffect(() => {
    const persisted = localStorage.getItem('sidebar-status-collapsed')
    if (persisted) {
      setIsStatusCollapsed(JSON.parse(persisted))
    }
  }, [])

  // Save collapse state
  const handleCollapseChange = (collapsed: boolean) => {
    setIsStatusCollapsed(collapsed)
    localStorage.setItem('sidebar-status-collapsed', JSON.stringify(collapsed))
  }

  // Subscribe to real-time events for alerts
  useEffect(() => {
    const unsubscribeSignal = on('signal:*', (event) => {
      const newAlert = {
        id: Date.now(),
        type: event.type.includes('new') ? 'info' : 'success',
        message: `${event.payload?.symbol || 'Unknown'} signal: ${event.payload?.side || 'unknown'}`,
        time: new Date().toLocaleTimeString(),
      };
      setAlerts(prev => [newAlert, ...prev.slice(0, 4)]);
    });

    const unsubscribeTrading = on('trading:*', (event) => {
      const newAlert = {
        id: Date.now(),
        type: event.type.includes('executed') ? 'success' : event.type.includes('failed') ? 'error' : 'info',
        message: `Trade ${event.type.split(':')[1]} for ${event.payload?.symbol || 'unknown'}`,
        time: new Date().toLocaleTimeString(),
      };
      setAlerts(prev => [newAlert, ...prev.slice(0, 4)]);
    });

    return () => {
      unsubscribeSignal.unsubscribe();
      unsubscribeTrading.unsubscribe();
    };
  }, [on])

  // Calculate real-time data
  const activeBots = positions.length // Assume positions represent active bots
  const todaysPnL = positions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0)
  const efficiency = connectionStatus.market === 'connected' ? 85 : 0 // Mock

  return (
    <div className="w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-r border-border/50 flex flex-col shadow-xl">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
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
          <ThemeToggle />
        </div>
      </div>

      <div className="p-6">
        <Collapsible open={!isStatusCollapsed} onOpenChange={(open) => handleCollapseChange(!open)}>
          <CollapsibleTrigger asChild>
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 cursor-pointer hover:shadow-xl transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5" />
              <div className="relative p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Pulse className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-semibold text-green-800 dark:text-green-200">System Status</span>
                    {isStatusCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                    Active
                  </Badge>
                </div>
              </div>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 mt-2">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5" />
              <div className="relative p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-700 dark:text-green-300">Active Bots</span>
                    <span className="font-bold text-green-800 dark:text-green-200">{activeBots}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-700 dark:text-green-300">Today's P&L</span>
                    <span className="font-bold text-green-800 dark:text-green-200">
                      {todaysPnL >= 0 ? '+' : ''}${todaysPnL.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-green-200/50 dark:bg-green-800/30 rounded-full h-2 mt-3">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${efficiency}%` }}
                    />
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">Performance: {efficiency}% efficiency</p>
                </div>
              </div>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="p-6">
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5" />
              <div className="relative p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-semibold text-orange-800 dark:text-orange-200">Recent Alerts</span>
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs">
                    {alerts.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {alerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-2 text-xs">
                      {alert.type === 'success' && <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />}
                      {alert.type === 'error' && <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />}
                      {alert.type === 'info' && <AlertTriangle className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />}
                      <div className="flex-1">
                        <div className="text-orange-700 dark:text-orange-300">{alert.message}</div>
                        <div className="text-orange-600/70 dark:text-orange-400/70">{alert.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}
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
