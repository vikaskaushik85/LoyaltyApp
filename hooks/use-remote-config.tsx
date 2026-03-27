import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/utils/supabase';
import { DEFAULT_CONFIG, RemoteConfig } from '@/constants/remote-config-defaults';

// ─── Context ────────────────────────────────────────────────────────────────

const RemoteConfigContext = createContext<RemoteConfig>(DEFAULT_CONFIG);

/**
 * Reads the current remote config.  Safe to call in any component wrapped
 * by `<RemoteConfigProvider>`.  Returns local defaults synchronously while
 * the fetch is in-flight or if it fails.
 */
export function useRemoteConfig(): RemoteConfig {
  return useContext(RemoteConfigContext);
}

// ─── Fetcher ────────────────────────────────────────────────────────────────

async function fetchRemoteConfig(): Promise<Partial<RemoteConfig>> {
  const { data, error } = await supabase
    .from('remote_config')
    .select('key, value')
    .eq('is_active', true);

  if (error || !data) {
    if (__DEV__) console.warn('Remote config fetch failed, using defaults:', error?.message);
    return {};
  }

  const overrides: Record<string, unknown> = {};
  for (const row of data) {
    // `value` is a JSONB column — Supabase returns it already parsed.
    // We store it as { "v": <actualValue> } so primitives survive JSONB.
    overrides[row.key] = (row.value as { v: unknown })?.v ?? row.value;
  }
  return overrides as Partial<RemoteConfig>;
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface ProviderProps {
  children: React.ReactNode;
}

export function RemoteConfigProvider({ children }: ProviderProps) {
  const [config, setConfig] = useState<RemoteConfig>(DEFAULT_CONFIG);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const overrides = await fetchRemoteConfig();
        if (!cancelled) {
          setConfig((prev) => ({ ...prev, ...overrides }));
        }
      } catch {
        // Fail-safe: defaults are already set
        if (__DEV__) console.warn('Remote config fetch threw, using defaults');
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={DEFAULT_CONFIG.brandPrimary} />
        <Text style={styles.splashText}>Loading…</Text>
      </View>
    );
  }

  return (
    <RemoteConfigContext.Provider value={config}>
      {children}
    </RemoteConfigContext.Provider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DEFAULT_CONFIG.backgroundLight,
  },
  splashText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
});
