'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  Bell,
  Search,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useUIStateStore } from '../lib/stores/uiStateStore';
import { useEventSubscription } from '../hooks/useEventBus';

interface NotificationCenterProps {
  className?: string;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    color: 'destructive',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  high: {
    icon: AlertCircle,
    color: 'default',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  medium: {
    icon: Bell,
    color: 'secondary',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  low: {
    icon: Info,
    color: 'outline',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
};

function NotificationItem({
  alert,
  isSelected,
  onSelect,
  onAcknowledge,
}: {
  alert: any;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onAcknowledge: (id: string) => void;
}) {
  const config = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG];
  const Icon = config.icon;

  return (
    <div
      className={`p-4 border rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
        config.bgColor
      } ${config.borderColor} ${alert.acknowledged ? 'opacity-60' : ''}`}
      onClick={() => onSelect(alert.id, !isSelected)}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onChange={() => onSelect(alert.id, !isSelected)}
          className="mt-1"
        />

        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
          alert.severity === 'critical' ? 'text-red-500' :
          alert.severity === 'high' ? 'text-orange-500' :
          alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
        }`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={config.color as any} className="text-xs">
              {alert.severity.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(alert.timestamp).toLocaleString()}
            </span>
            {alert.acknowledged && (
              <Badge variant="outline" className="text-xs">
                Acknowledged
              </Badge>
            )}
          </div>

          <div className="font-medium text-sm mb-1">{alert.message}</div>

          <div className="text-xs text-muted-foreground">
            Rule: {alert.ruleId}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!alert.acknowledged && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge(alert.id);
              }}
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const {
    alertHistory,
    acknowledgeAlert,
    clearAlertHistory,
    notifications,
    updateNotifications,
  } = useUIStateStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());

  // Listen for new alerts
  useEventSubscription('notification:triggered', (event) => {
    // Auto-scroll to top when new alert arrives
    console.log('New alert received:', event.payload?.alert);
  });

  const filteredAlerts = useMemo(() => {
    return alertHistory.filter((alert) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!alert.message.toLowerCase().includes(query) &&
            !alert.ruleId.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Severity filter
      if (severityFilter !== 'all' && alert.severity !== severityFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'acknowledged' && !alert.acknowledged) {
        return false;
      }
      if (statusFilter === 'unacknowledged' && alert.acknowledged) {
        return false;
      }

      return true;
    });
  }, [alertHistory, searchQuery, severityFilter, statusFilter]);

  const unacknowledgedCount = useMemo(() => {
    return alertHistory.filter(alert => !alert.acknowledged).length;
  }, [alertHistory]);

  const handleSelectAlert = useCallback((alertId: string, selected: boolean) => {
    setSelectedAlerts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(alertId);
      } else {
        newSet.delete(alertId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedAlerts.size === filteredAlerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(filteredAlerts.map(alert => alert.id)));
    }
  }, [selectedAlerts, filteredAlerts]);

  const handleBulkAcknowledge = useCallback(() => {
    selectedAlerts.forEach(alertId => {
      acknowledgeAlert(alertId);
    });
    setSelectedAlerts(new Set());
  }, [selectedAlerts, acknowledgeAlert]);

  const handleBulkDelete = useCallback(() => {
    // In a real app, this would make an API call to delete alerts
    // For now, we'll just clear them from state
    clearAlertHistory();
    setSelectedAlerts(new Set());
  }, [clearAlertHistory]);

  const toggleSound = useCallback(() => {
    updateNotifications({
      soundEnabled: !notifications.soundEnabled,
    });
  }, [notifications.soundEnabled, updateNotifications]);

  // Not using virtual list for now, using ScrollArea instead

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Center
            {unacknowledgedCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unacknowledgedCount}
              </Badge>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSound}
              className={notifications.soundEnabled ? 'text-green-600' : 'text-muted-foreground'}
            >
              {notifications.soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={clearAlertHistory}
              disabled={alertHistory.length === 0}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selectedAlerts.size > 0 && (
          <>
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedAlerts.size} selected
              </span>
              <Separator orientation="vertical" className="h-4" />
              <Button variant="outline" size="sm" onClick={handleBulkAcknowledge}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Acknowledge
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </>
        )}

        {/* Alerts List */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {filteredAlerts.length} of {alertHistory.length} alerts
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              disabled={filteredAlerts.length === 0}
            >
              {selectedAlerts.size === filteredAlerts.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No alerts found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <ScrollArea className="h-96 border rounded-lg">
              <div className="p-2 space-y-2">
                {filteredAlerts.map((alert) => (
                  <NotificationItem
                    key={alert.id}
                    alert={alert}
                    isSelected={selectedAlerts.has(alert.id)}
                    onSelect={handleSelectAlert}
                    onAcknowledge={acknowledgeAlert}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer Stats */}
        <div className="flex justify-between text-xs text-muted-foreground pt-4 border-t">
          <span>Total: {alertHistory.length}</span>
          <span>Unacknowledged: {unacknowledgedCount}</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}