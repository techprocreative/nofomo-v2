import { useState, useEffect, useCallback, useRef } from 'react';

interface WidgetConfig {
  id: string;
  type: string;
  refreshRate: number;
  dataFilters: Record<string, any>;
  visible: boolean;
  size: { w: number; h: number };
}

interface WidgetState {
  config: WidgetConfig;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  data: any;
}

export const useWidgetState = (initialConfig: WidgetConfig) => {
  const [state, setState] = useState<WidgetState>({
    config: initialConfig,
    isLoading: false,
    error: null,
    lastUpdated: null,
    data: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateConfig = useCallback((updates: Partial<WidgetConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...updates },
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const updateData = useCallback((data: any) => {
    setState(prev => ({
      ...prev,
      data,
      lastUpdated: new Date(),
      isLoading: false,
      error: null,
    }));
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate data fetch - replace with actual API call
      const newData = await fetchWidgetData(state.config);
      updateData(newData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [state.config, setLoading, updateData, setError]);

  const startAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (state.config.refreshRate > 0) {
      intervalRef.current = setInterval(refreshData, state.config.refreshRate);
    }
  }, [state.config.refreshRate, refreshData]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (state.config.visible) {
      refreshData();
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [state.config.visible, refreshData, startAutoRefresh, stopAutoRefresh]);

  useEffect(() => {
    startAutoRefresh();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startAutoRefresh]);

  return {
    ...state,
    updateConfig,
    refreshData,
    startAutoRefresh,
    stopAutoRefresh,
  };
};

// Mock function - replace with actual service
async function fetchWidgetData(config: WidgetConfig): Promise<any> {
  // Simulate API call
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ mock: 'data', type: config.type });
    }, 1000);
  });
}