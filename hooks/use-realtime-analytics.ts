import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useSupabaseRealtime } from './use-supabase-realtime';
import { PerformanceAnalytics } from '@/lib/types';

export function useRealtimeAnalytics(userId?: string) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (userId) {
      setCurrentUserId(userId);
    } else {
      // Get current user if not provided
      const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }
      };
      getUser();
    }
  }, [userId, supabase.auth]);

  const filter = currentUserId ? `user_id=eq.${currentUserId}` : undefined;

  const {
    data,
    isLoading,
    error,
    isConnected,
    lastUpdate,
  } = useSupabaseRealtime<PerformanceAnalytics>({
    table: 'performance_analytics',
    event: '*',
    filter,
  });

  return {
    analytics: data,
    isLoading,
    error,
    isConnected,
    lastUpdate,
  };
}