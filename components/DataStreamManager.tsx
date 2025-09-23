'use client';

import React, { useEffect, useState } from 'react';
import { useWebSocketConnection } from '../hooks/useWebSocketConnection';
import { useRealtimeState } from '../hooks/useRealtimeState';
import { useEventBus } from '../hooks/useEventBus';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Activity, Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface DataStreamManagerProps {
  symbols?: string[];
  autoConnect?: boolean;
}

export function DataStreamManager({ symbols = ['EURUSD', 'GBPUSD', 'USDJPY'], autoConnect = true }: DataStreamManagerProps) {
  const {
    isConnected,
    isInitializing,
    error,
    initialize,
    disconnect,
    subscribeToPrices,
    getActiveSubscriptions,
  } = useWebSocketConnection();

  const { prices, connectionStatus } = useRealtimeState();
  const { emitConnectionEvent } = useEventBus();

  const [subscribedSymbols, setSubscribedSymbols] = useState<Set<string>>(new Set());

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && !isConnected && !isInitializing) {
      initialize();
    }
  }, [autoConnect, isConnected, isInitializing, initialize]);

  // Auto-subscribe to symbols when connected
  useEffect(() => {
    if (isConnected && symbols.length > 0) {
      symbols.forEach(symbol => {
        if (!subscribedSymbols.has(symbol)) {
          const subscription = subscribeToPrices?.(symbol);
          if (subscription) {
            setSubscribedSymbols(prev => new Set(prev.add(symbol)));
          }
        }
      });
    }
  }, [isConnected, symbols, subscribedSymbols, subscribeToPrices]);

  const handleConnect = () => {
    initialize();
    emitConnectionEvent('connected', { source: 'manual' });
  };

  const handleDisconnect = () => {
    disconnect();
    setSubscribedSymbols(new Set());
    emitConnectionEvent('disconnected', { source: 'manual' });
  };

  const getConnectionIcon = () => {
    if (error) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (isConnected) return <Wifi className="h-4 w-4 text-green-500" />;
    return <WifiOff className="h-4 w-4 text-gray-500" />;
  };

  const getConnectionStatus = () => {
    if (error) return 'error';
    if (isInitializing) return 'connecting';
    if (isConnected) return 'connected';
    return 'disconnected';
  };

  const activeSubscriptions = getActiveSubscriptions();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {getConnectionIcon()}
          Data Stream Manager
          <Badge variant={getConnectionStatus() === 'connected' ? 'default' : 'secondary'}>
            {getConnectionStatus()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Controls */}
        <div className="flex gap-2">
          {!isConnected ? (
            <Button onClick={handleConnect} disabled={isInitializing} size="sm">
              {isInitializing ? 'Connecting...' : 'Connect'}
            </Button>
          ) : (
            <Button onClick={handleDisconnect} variant="outline" size="sm">
              Disconnect
            </Button>
          )}
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Market:</span>
            <Badge
              variant={connectionStatus.market === 'connected' ? 'default' : 'secondary'}
              className="ml-2"
            >
              {connectionStatus.market}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Trading:</span>
            <Badge
              variant={connectionStatus.trading === 'connected' ? 'default' : 'secondary'}
              className="ml-2"
            >
              {connectionStatus.trading}
            </Badge>
          </div>
        </div>

        {/* Last Update */}
        {connectionStatus.lastUpdate && (
          <div className="text-xs text-muted-foreground">
            Last update: {connectionStatus.lastUpdate.toLocaleTimeString()}
          </div>
        )}

        {/* Active Symbols */}
        <div>
          <h4 className="text-sm font-medium mb-2">Active Subscriptions ({activeSubscriptions.length})</h4>
          <div className="flex flex-wrap gap-1">
            {activeSubscriptions.map(subscription => (
              <Badge key={subscription.id} variant="outline" className="text-xs">
                {subscription.symbol} ({subscription.type})
              </Badge>
            ))}
          </div>
        </div>

        {/* Price Preview */}
        <div>
          <h4 className="text-sm font-medium mb-2">Live Prices</h4>
          <div className="space-y-1">
            {symbols.map(symbol => {
              const price = prices.get(symbol);
              return (
                <div key={symbol} className="flex justify-between text-sm">
                  <span>{symbol}</span>
                  <span className="font-mono">
                    {price ? `${price.bid?.toFixed(5)} / ${price.ask?.toFixed(5)}` : '--'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Connection Error
            </div>
            <div className="mt-1 text-xs">{error.message}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}