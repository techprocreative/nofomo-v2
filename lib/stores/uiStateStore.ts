import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface UIState {
  // Live monitor settings
  liveMonitor: {
    visible: boolean;
    layout: 'grid' | 'list';
    refreshInterval: number;
    autoScroll: boolean;
    showInactivePairs: boolean;
    theme: 'light' | 'dark' | 'auto';
  };

  // Chart settings
  chartSettings: {
    defaultTimeframe: string;
    showVolume: boolean;
    showIndicators: boolean;
    candlestickStyle: 'solid' | 'hollow';
    gridLines: boolean;
  };

  // Notification preferences
  notifications: {
    enabled: boolean;
    soundEnabled: boolean;
    pushEnabled: boolean;
    emailEnabled: boolean;
    criticalAlertsOnly: boolean;
  };

  // Notification rules and history
  notificationRules: Array<{
    id: string;
    name: string;
    conditions: Array<{
      field: string;
      operator: string;
      value: any;
      logic?: 'AND' | 'OR';
    }>;
    actions: Array<{
      type: 'browser' | 'email' | 'sms' | 'sound';
      enabled: boolean;
      config?: any;
    }>;
    severity: 'critical' | 'high' | 'medium' | 'low';
    enabled: boolean;
    createdAt: Date;
    lastTriggered?: Date;
  }>;

  alertHistory: Array<{
    id: string;
    ruleId: string;
    message: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    timestamp: Date;
    acknowledged: boolean;
    acknowledgedAt?: Date;
  }>;

  // Dashboard layout
  dashboardLayout: {
    widgets: Array<{
      id: string;
      type: string;
      position: { x: number; y: number; w: number; h: number };
      visible: boolean;
      config?: any; // For widget-specific settings
    }>;
    columns: number;
    rowHeight: number;
  };

  // Layout persistence
  layoutVersions: Record<string, UIState['dashboardLayout']>;
  currentLayoutName: string;
  history: UIState['dashboardLayout'][];
  historyIndex: number;

  // Connection status UI
  connectionIndicators: {
    showConnectionStatus: boolean;
    showLastUpdateTime: boolean;
    showDataQuality: boolean;
  };
}

interface UIStateActions {
  // Actions
  updateLiveMonitor: (settings: Partial<UIState['liveMonitor']>) => void;
  updateChartSettings: (settings: Partial<UIState['chartSettings']>) => void;
  updateNotifications: (settings: Partial<UIState['notifications']>) => void;
  updateDashboardLayout: (layout: Partial<UIState['dashboardLayout']>) => void;
  updateConnectionIndicators: (indicators: Partial<UIState['connectionIndicators']>) => void;

  // Widget management
  addWidget: (widget: UIState['dashboardLayout']['widgets'][0]) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<UIState['dashboardLayout']['widgets'][0]>) => void;

  // Layout persistence
  saveLayout: (name: string) => void;
  loadLayout: (name: string) => void;
  undoLayoutChange: () => void;
  redoLayoutChange: () => void;
  resetLayout: () => void;

  // Reset to defaults
  resetToDefaults: () => void;

  // Notification rule management
  addNotificationRule: (rule: UIState['notificationRules'][0]) => void;
  updateNotificationRule: (ruleId: string, updates: Partial<UIState['notificationRules'][0]>) => void;
  removeNotificationRule: (ruleId: string) => void;
  toggleNotificationRule: (ruleId: string) => void;

  // Alert history management
  addAlert: (alert: UIState['alertHistory'][0]) => void;
  acknowledgeAlert: (alertId: string) => void;
  clearAlertHistory: () => void;
}

const defaultState: UIState = {
  liveMonitor: {
    visible: true,
    layout: 'grid',
    refreshInterval: 5000,
    autoScroll: true,
    showInactivePairs: false,
    theme: 'auto',
  },
  chartSettings: {
    defaultTimeframe: '5m',
    showVolume: true,
    showIndicators: true,
    candlestickStyle: 'solid',
    gridLines: true,
  },
  notifications: {
    enabled: true,
    soundEnabled: true,
    pushEnabled: false,
    emailEnabled: false,
    criticalAlertsOnly: false,
  },
  dashboardLayout: {
    widgets: [
      {
        id: 'signals',
        type: 'signals',
        position: { x: 0, y: 0, w: 8, h: 4 },
        visible: true,
      },
      {
        id: 'charts',
        type: 'charts',
        position: { x: 8, y: 0, w: 4, h: 4 },
        visible: true,
      },
      {
        id: 'performance',
        type: 'performance',
        position: { x: 0, y: 4, w: 12, h: 3 },
        visible: true,
      },
    ],
    columns: 12,
    rowHeight: 80,
  },
  layoutVersions: {
    Default: {
      widgets: [
        {
          id: 'signals',
          type: 'signals',
          position: { x: 0, y: 0, w: 8, h: 4 },
          visible: true,
        },
        {
          id: 'charts',
          type: 'charts',
          position: { x: 8, y: 0, w: 4, h: 4 },
          visible: true,
        },
        {
          id: 'performance',
          type: 'performance',
          position: { x: 0, y: 4, w: 12, h: 3 },
          visible: true,
        },
      ],
      columns: 12,
      rowHeight: 80,
    },
  },
  currentLayoutName: 'Default',
  history: [
    {
      widgets: [
        {
          id: 'signals',
          type: 'signals',
          position: { x: 0, y: 0, w: 8, h: 4 },
          visible: true,
        },
        {
          id: 'charts',
          type: 'charts',
          position: { x: 8, y: 0, w: 4, h: 4 },
          visible: true,
        },
        {
          id: 'performance',
          type: 'performance',
          position: { x: 0, y: 4, w: 12, h: 3 },
          visible: true,
        },
      ],
      columns: 12,
      rowHeight: 80,
    },
  ],
  historyIndex: 0,
  connectionIndicators: {
    showConnectionStatus: true,
    showLastUpdateTime: true,
    showDataQuality: true,
  },
  notificationRules: [],
  alertHistory: [],
};

const store = create<UIState & UIStateActions>()(
  subscribeWithSelector((set, get) => ({
    ...defaultState,

    updateLiveMonitor: (settings) => {
      set((state) => ({
        liveMonitor: { ...state.liveMonitor, ...settings },
      }));
    },

    updateChartSettings: (settings) => {
      set((state) => ({
        chartSettings: { ...state.chartSettings, ...settings },
      }));
    },

    updateNotifications: (settings) => {
      set((state) => ({
        notifications: { ...state.notifications, ...settings },
      }));
    },

    updateDashboardLayout: (layout) => {
      set((state) => {
        const newLayout = { ...state.dashboardLayout, ...layout };
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(newLayout);
        return {
          dashboardLayout: newLayout,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
      });
    },

    updateConnectionIndicators: (indicators) => {
      set((state) => ({
        connectionIndicators: { ...state.connectionIndicators, ...indicators },
      }));
    },

    addWidget: (widget) => {
      set((state) => ({
        dashboardLayout: {
          ...state.dashboardLayout,
          widgets: [...state.dashboardLayout.widgets, widget],
        },
      }));
    },

    removeWidget: (widgetId) => {
      set((state) => ({
        dashboardLayout: {
          ...state.dashboardLayout,
          widgets: state.dashboardLayout.widgets.filter(w => w.id !== widgetId),
        },
      }));
    },

    updateWidget: (widgetId, updates) => {
      set((state) => ({
        dashboardLayout: {
          ...state.dashboardLayout,
          widgets: state.dashboardLayout.widgets.map(w =>
            w.id === widgetId ? { ...w, ...updates } : w
          ),
        },
      }));
    },

    resetToDefaults: () => {
      set(defaultState);
    },

    addNotificationRule: (rule) => {
      set((state) => ({
        notificationRules: [...state.notificationRules, rule],
      }));
    },

    updateNotificationRule: (ruleId, updates) => {
      set((state) => ({
        notificationRules: state.notificationRules.map(rule =>
          rule.id === ruleId ? { ...rule, ...updates } : rule
        ),
      }));
    },

    removeNotificationRule: (ruleId) => {
      set((state) => ({
        notificationRules: state.notificationRules.filter(rule => rule.id !== ruleId),
      }));
    },

    toggleNotificationRule: (ruleId) => {
      set((state) => ({
        notificationRules: state.notificationRules.map(rule =>
          rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
        ),
      }));
    },

    addAlert: (alert) => {
      set((state) => ({
        alertHistory: [alert, ...state.alertHistory.slice(0, 999)], // Keep last 1000 alerts
      }));
    },

    acknowledgeAlert: (alertId) => {
      set((state) => ({
        alertHistory: state.alertHistory.map(alert =>
          alert.id === alertId
            ? { ...alert, acknowledged: true, acknowledgedAt: new Date() }
            : alert
        ),
      }));
    },

    clearAlertHistory: () => {
      set((state) => ({
        alertHistory: [],
      }));
    },

    saveLayout: (name) => {
      set((state) => ({
        layoutVersions: { ...state.layoutVersions, [name]: state.dashboardLayout },
      }));
    },

    loadLayout: (name) => {
      set((state) => {
        if (state.layoutVersions[name]) {
          return {
            dashboardLayout: state.layoutVersions[name],
            currentLayoutName: name,
          };
        }
        return {};
      });
    },

    undoLayoutChange: () => {
      set((state) => {
        if (state.historyIndex > 0) {
          return {
            dashboardLayout: state.history[state.historyIndex - 1],
            historyIndex: state.historyIndex - 1,
          };
        }
        return {};
      });
    },

    redoLayoutChange: () => {
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          return {
            dashboardLayout: state.history[state.historyIndex + 1],
            historyIndex: state.historyIndex + 1,
          };
        }
        return {};
      });
    },

    resetLayout: () => {
      set((state) => ({
        dashboardLayout: state.layoutVersions.Default || defaultState.dashboardLayout,
        currentLayoutName: 'Default',
      }));
    },
  }))
);

export const useUIStateStore = store;