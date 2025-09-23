'use client';

import React, { useEffect, useState } from 'react';
import { useConnectionStatus } from '../hooks/useRealtimeState';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Activity, Clock, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface RealTimeIndicatorProps {
  showTimestamp?: boolean;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RealTimeIndicator({
  showTimestamp = true,
  showStatus = true,
  size = 'md',
  className
}: RealTimeIndicatorProps) {
  const { connectionStatus, isConnected, lastUpdate } = useConnectionStatus();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    if (connectionStatus.market === 'error' || connectionStatus.trading === 'error') {
      return <AlertTriangle className={cn(
        "text-red-500",
        size === 'sm' && "h-3 w-3",
        size === 'md' && "h-4 w-4",
        size === 'lg' && "h-5 w-5"
      )} />;
    }

    if (isConnected) {
      return <Activity className={cn(
        "text-green-500",
        size === 'sm' && "h-3 w-3",
        size === 'md' && "h-4 w-4",
        size === 'lg' && "h-5 w-5"
      )} />;
    }

    return <WifiOff className={cn(
      "text-gray-500",
      size === 'sm' && "h-3 w-3",
      size === 'md' && "h-4 w-4",
      size === 'lg' && "h-5 w-5"
    )} />;
  };

  const getStatusColor = () => {
    if (connectionStatus.market === 'error' || connectionStatus.trading === 'error') {
      return 'destructive';
    }
    if (isConnected) {
      return 'default';
    }
    return 'secondary';
  };

  const getStatusText = () => {
    if (connectionStatus.market === 'error' || connectionStatus.trading === 'error') {
      return 'Error';
    }
    if (connectionStatus.market === 'connecting' || connectionStatus.trading === 'connecting') {
      return 'Connecting';
    }
    if (isConnected) {
      return 'Live';
    }
    return 'Offline';
  };

  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return null;

    const diff = currentTime.getTime() - lastUpdate.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const timeSinceUpdate = getTimeSinceUpdate();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            {showStatus && (
              <Badge variant={getStatusColor()} className="flex items-center gap-1">
                {getStatusIcon()}
                <span className={cn(
                  size === 'sm' && "text-xs",
                  size === 'md' && "text-sm",
                  size === 'lg' && "text-base"
                )}>
                  {getStatusText()}
                </span>
              </Badge>
            )}

            {showTimestamp && lastUpdate && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className={cn(
                  size === 'sm' && "h-3 w-3",
                  size === 'md' && "h-4 w-4",
                  size === 'lg' && "h-5 w-5"
                )} />
                <span className={cn(
                  "font-mono",
                  size === 'sm' && "text-xs",
                  size === 'md' && "text-sm",
                  size === 'lg' && "text-base"
                )}>
                  {lastUpdate.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span>Market:</span>
              <Badge variant={connectionStatus.market === 'connected' ? 'default' : 'secondary'} className="text-xs">
                {connectionStatus.market}
              </Badge>
            </div>
            <div className="flex justify-between gap-4">
              <span>Trading:</span>
              <Badge variant={connectionStatus.trading === 'connected' ? 'default' : 'secondary'} className="text-xs">
                {connectionStatus.trading}
              </Badge>
            </div>
            {lastUpdate && (
              <div className="flex justify-between gap-4">
                <span>Last Update:</span>
                <span className="font-mono text-xs">{lastUpdate.toLocaleString()}</span>
              </div>
            )}
            {timeSinceUpdate && (
              <div className="flex justify-between gap-4">
                <span>Time Since:</span>
                <span className="font-mono text-xs">{timeSinceUpdate}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span>Current Time:</span>
              <span className="font-mono text-xs">{currentTime.toLocaleTimeString()}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Pulsing indicator for active connections
 */
export function PulsingIndicator({ isActive = false, className }: { isActive?: boolean; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "h-2 w-2 rounded-full transition-colors duration-200",
          isActive ? "bg-green-500" : "bg-gray-400"
        )}
      />
      {isActive && (
        <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75" />
      )}
    </div>
  );
}

/**
 * Compact status indicator
 */
export function CompactStatusIndicator({ className }: { className?: string }) {
  const { isConnected } = useConnectionStatus();

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <PulsingIndicator isActive={isConnected} />
      <span className="text-xs text-muted-foreground">
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}