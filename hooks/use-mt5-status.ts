import { useState, useEffect } from 'react';
import { MT5ConnectionStatus } from '@/lib/types';

export function useMT5Status(pollInterval: number = 30000) {
  const [status, setStatus] = useState<MT5ConnectionStatus>({
    connected: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setError(null);
      const response = await fetch('/api/mt5/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testType: 'health' }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setStatus({
          connected: data.data.healthy,
          last_connected: data.data.healthy ? new Date() : status.last_connected,
        });
      } else {
        setStatus({
          connected: false,
          error: data.error || 'Unknown error',
        });
      }
    } catch (err) {
      console.error('Failed to fetch MT5 status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check MT5 status');
      setStatus(prev => ({
        ...prev,
        connected: false,
        error: err instanceof Error ? err.message : 'Connection check failed',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(fetchStatus, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval]);

  const reconnect = async () => {
    setIsLoading(true);
    await fetchStatus();
  };

  return {
    status,
    isLoading,
    error,
    reconnect,
  };
}