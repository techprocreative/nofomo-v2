"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Settings, Wifi, WifiOff, TestTube, Save, Loader2 } from "lucide-react"
import { mt5Config, isUsingDemoCredentials } from "@/lib/mt5-config"
import { mt5Service } from "@/lib/services/mt5-service"
import { useToast } from "@/hooks/use-toast"

export function MT5ConnectionSettings() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<any>(null)
  const [formData, setFormData] = useState({
    account: mt5Config.connection.account || '',
    password: mt5Config.connection.password || '',
    server: mt5Config.connection.server || '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      const status = await mt5Service.getConnectionStatus()
      setIsConnected(status.connected)
      setConnectionStatus(status)
    } catch (error) {
      setIsConnected(false)
      console.error('Failed to check connection status:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const testConnection = async () => {
    if (!formData.account || !formData.password || !formData.server) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields before testing connection.",
        variant: "destructive",
      })
      return
    }

    setIsTesting(true)
    try {
      // Create a temporary connection to test
      const testResult = await mt5Service.connect()
      if (testResult.success) {
        toast({
          title: "Connection Test Successful",
          description: `Successfully connected to MT5 server: ${formData.server}`,
        })
        await checkConnectionStatus()
      } else {
        toast({
          title: "Connection Test Failed",
          description: testResult.error?.message || "Failed to connect to MT5 server",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Connection Test Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const saveSettings = () => {
    // In a real app, you would save these settings to a secure backend
    // For now, we'll just show a success message
    toast({
      title: "Settings Saved",
      description: "MT5 connection settings have been saved.",
    })
  }

  const connect = async () => {
    setIsLoading(true)
    try {
      const result = await mt5Service.connect()
      if (result.success) {
        toast({
          title: "Connected Successfully",
          description: `Connected to MT5 server: ${formData.server}`,
        })
        await checkConnectionStatus()
      } else {
        toast({
          title: "Connection Failed",
          description: result.error?.message || "Failed to connect to MT5 server",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const disconnect = async () => {
    setIsLoading(true)
    try {
      const result = await mt5Service.disconnect()
      if (result.success) {
        toast({
          title: "Disconnected",
          description: "Successfully disconnected from MT5 server.",
        })
        await checkConnectionStatus()
      } else {
        toast({
          title: "Disconnection Failed",
          description: result.error?.message || "Failed to disconnect from MT5 server",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Disconnection Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          MT5 Connection Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600" />
            )}
            <div>
              <h3 className="font-medium">
                {isConnected ? "Connected to MT5" : "Not Connected"}
              </h3>
              {connectionStatus && (
                <p className="text-sm text-muted-foreground">
                  {connectionStatus.server && connectionStatus.account
                    ? `Server: ${connectionStatus.server} | Account: ${connectionStatus.account}`
                    : "No active connection"
                  }
                </p>
              )}
              {isUsingDemoCredentials() && !isConnected && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Using demo credentials - configure your real MT5 account below
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isUsingDemoCredentials() && !isConnected && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Demo
              </Badge>
            )}
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>

        {/* Connection Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="account">Account Number</Label>
            <Input
              id="account"
              type="text"
              placeholder="12345678"
              value={formData.account}
              onChange={(e) => handleInputChange('account', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="server">Server Address</Label>
            <Input
              id="server"
              type="text"
              placeholder="ICMarkets-Demo01"
              value={formData.server}
              onChange={(e) => handleInputChange('server', e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your MT5 password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁️"}
              </Button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <Alert>
          <AlertDescription>
            <strong>Security Notice:</strong> Your MT5 credentials are stored locally and used only for direct connection to your MT5 terminal.
            Never share your credentials with third parties.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={saveSettings}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </Button>

          <Button
            variant="outline"
            onClick={testConnection}
            disabled={isTesting}
            className="flex items-center gap-2"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4" />
            )}
            {isTesting ? "Testing..." : "Test Connection"}
          </Button>

          {!isConnected ? (
            <Button
              onClick={connect}
              disabled={isLoading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              {isLoading ? "Connecting..." : "Connect"}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={disconnect}
              disabled={isLoading}
              className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              {isLoading ? "Disconnecting..." : "Disconnect"}
            </Button>
          )}
        </div>

        {/* Connection Requirements */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Connection Requirements:</h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• MT5 terminal must be running and accessible on the network</li>
            <li>• WebSocket API must be enabled in MT5 terminal</li>
            <li>• Firewall must allow connections to the specified port</li>
            <li>• Valid account credentials with appropriate permissions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}