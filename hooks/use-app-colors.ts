import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRemoteConfig } from '@/hooks/use-remote-config';

export function useAppColors() {
  const colorScheme = useColorScheme();
  const cfg = useRemoteConfig();
  const isDark = colorScheme === 'dark';

  return {
    background: isDark ? '#151718' : cfg.backgroundLight,
    card: isDark ? '#1E2022' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1F2937',
    textSecondary: isDark ? '#9BA1A6' : '#6B7280',
    textTertiary: isDark ? '#687076' : '#9CA3AF',
    inputBg: isDark ? '#2A2D2F' : '#F3F4F6',
    inputText: isDark ? '#ECEDEE' : '#1F2937',
    inputDisabledBg: isDark ? '#1E2022' : '#E5E7EB',
    inputDisabledText: isDark ? '#687076' : '#9CA3AF',
    isDark,
  };
}
