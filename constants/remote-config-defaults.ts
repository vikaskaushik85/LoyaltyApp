/**
 * Local defaults for every remote-config key.
 * These are used immediately on startup and as fallbacks if the Supabase
 * fetch fails.  Keep this file in sync with the `remote_config` table.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RemoteConfig {
  // ── Branding / colours ──
  brandPrimary: string;
  brandPrimaryDark: string;
  brandAccent: string;
  brandAccentLight: string;
  brandAccentLightest: string;
  backgroundLight: string;

  // ── Strings ──
  appName: string;
  heroTitle: string;
  heroSubtitle: string;
  scanButtonLabel: string;
  exploreTitle: string;
  rewardModalTitle: string;
  rewardModalMessage: string;   // use {stamps} placeholder
  rewardClaimButton: string;

  // ── Loyalty logic ──
  stampsPerCard: number;
  scanRedirectDelayMs: number;
  pointMultiplier: number;

  // ── Feature flags ──
  showExploreTab: boolean;
  showSocialLogin: boolean;
  showTwitterLogin: boolean;

  // ── Auth / redirect URLs ──
  oauthRedirectUrl: string;
  googleOAuthEnabled: boolean;
  facebookOAuthEnabled: boolean;
  twitterOAuthEnabled: boolean;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: RemoteConfig = {
  // Branding
  brandPrimary: '#D97706',
  brandPrimaryDark: '#B45309',
  brandAccent: '#FCD34D',
  brandAccentLight: '#FEF3C7',
  brandAccentLightest: '#FFFBEB',
  backgroundLight: '#F9FAFB',

  // Strings
  appName: 'PerkUp',
  heroTitle: 'Welcome back!',
  heroSubtitle: 'Collect stamps and earn rewards at your favorite spots',
  scanButtonLabel: 'Scan QR Code',
  exploreTitle: 'Explore Cafes',
  rewardModalTitle: 'Congratulations! 🎉',
  rewardModalMessage: "You've earned {stamps} stamps!\nYou deserve a free coffee!",
  rewardClaimButton: 'Claim My Free Coffee ☕️',

  // Loyalty logic
  stampsPerCard: 10,
  scanRedirectDelayMs: 1000,
  pointMultiplier: 1,

  // Feature flags
  showExploreTab: false,
  showSocialLogin: false,
  showTwitterLogin: false,

  // Auth
  oauthRedirectUrl: 'perkup://auth/callback',
  googleOAuthEnabled: false,
  facebookOAuthEnabled: false,
  twitterOAuthEnabled: false,
};
