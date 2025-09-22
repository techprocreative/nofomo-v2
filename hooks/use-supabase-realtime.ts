import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseSupabaseRealtimeOptions<T extends { id: string }> {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onReceive?: (payload: RealtimePostgresChangesPayload<T>) => void;
  retryDelay?: number;
  maxRetries?: number;
}

interface UseSupabaseRealtimeReturn<T> {
  data: T[] | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdate: Date | null;
}

export function useSupabaseRealtime<T extends { id: string } = { id: string }>({
  table,
  event = '*',
  filter,
  onReceive,
  retryDelay = 5000,
  maxRetries = 3,
}: UseSupabaseRealtimeOptions<T>): UseSupabaseRealtimeReturn<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setupSubscription = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    // Check if supabase has channel method (not the mock)
    if (!(supabase as any).channel) {
      setError('Supabase client not properly configured');
      setIsLoading(false);
      return;
    }

    const channel = (supabase as any)
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          setError(null);
          setIsConnected(true);
          setLastUpdate(new Date());
          retryCountRef.current = 0;

          if (onReceive) {
            onReceive(payload);
          } else {
            // Default behavior: accumulate data
            setData((prevData) => {
              if (!prevData) return [payload.new as T];

              switch (payload.eventType) {
                case 'INSERT':
                  return [...prevData, payload.new as T];
                case 'UPDATE':
                  return prevData.map((item) =>
                    item.id === (payload.new as T).id ? payload.new as T : item
                  );
                case 'DELETE':
                  return prevData.filter((item) => item.id !== (payload.old as T).id);
                default:
                  return prevData;
              }
            });
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
          setIsLoading(false);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError('Subscription error');
          handleRetry();
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setError('Subscription timed out');
          handleRetry();
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;
  }, [table, event, filter, onReceive, supabase]);

  const handleRetry = useCallback(() => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;
      retryTimeoutRef.current = setTimeout(() => {
        setupSubscription();
      }, retryDelay);
    } else {
      setError(`Failed to establish subscription after ${maxRetries} retries`);
      setIsLoading(false);
    }
  }, [setupSubscription, retryDelay, maxRetries]);

  useEffect(() => {
    setupSubscription();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [setupSubscription]);

  return {
    data,
    isLoading,
    error,
    isConnected,
    lastUpdate,
  };
}