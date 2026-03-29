import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/use-auth';

interface Cafe {
  id: string;
  name: string;
  qr_secret: string;
  owner_id: string;
}

/**
 * Fetches the cafe(s) owned by the current authenticated user.
 * For v1, assumes each owner has exactly one cafe.
 */
export function useCafe() {
  const { user } = useAuth();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCafe(null);
      setIsLoading(false);
      return;
    }

    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('cafes')
        .select('id, name, qr_secret, owner_id')
        .eq('owner_id', user.id)
        .limit(1)
        .single();

      if (error || !data) {
        if (__DEV__) console.warn('Cafe fetch error:', error?.message);
        setCafe(null);
      } else {
        setCafe(data);
      }
      setIsLoading(false);
    })();
  }, [user]);

  return { cafe, isLoading };
}
