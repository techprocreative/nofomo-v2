import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export function useSupabaseConnection() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // Try to get the current user to check if connection works
        const { data, error } = await supabase.auth.getUser();

        if (error && error.message !== 'Service temporarily unavailable. Please try again later.') {
          // If it's a real error, not the mock error
          setIsConnected(false);
        } else {
          setIsConnected(true);
        }
      } catch (error) {
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, []);

  return { isConnected, isLoading };
}