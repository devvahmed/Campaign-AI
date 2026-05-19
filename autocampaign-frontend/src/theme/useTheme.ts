/**
 * useTheme — Centralized dynamic token hook
 * Generates a complete design token set based on isDarkMode + user brand color.
 * Import and call this in any screen to get a fully-typed `T` (theme) object.
 */
import { useUserStore } from '../store/userStore';

// Fixed semantic accent colors (never change with dark/light)
export const Accents = {
  success: '#30D158',
  warning: '#FF9F0A',
  error:   '#FF453A',
  purple:  '#BF5AF2',
};

export function useTheme() {
  const isDarkMode  = useUserStore(state => state.isDarkMode);
  const themeColor  = useUserStore(state => state.themeColor);
  const primary     = themeColor();                    // brand-adaptive accent

  // ── Token stacks ──────────────────────────────────────────────────────────
  const dark = {
    // Backgrounds
    bg:          '#0B0C0E',
    surface:     '#18191E',
    surfaceHigh: '#1C1D24',
    surfaceCard: '#222330',
    // Borders
    border:      'rgba(255,255,255,0.06)',
    borderMid:   'rgba(255,255,255,0.10)',
    // Text
    text:        '#FFFFFF',
    textSub:     '#999999',
    textTertiary:'#555566',
    // Shadows — hidden in dark mode, replaced by border glow
    shadow: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 2 },
      shadowOpacity: 0,
      shadowRadius:  0,
      elevation:     0,
    },
    // Card style
    card: {
      backgroundColor: '#1C1D24',
      borderRadius:    24 as const,
      borderWidth:     1 as const,
      borderColor:     'rgba(255,255,255,0.06)',
    },
    cardSm: {
      backgroundColor: '#1C1D24',
      borderRadius:    16 as const,
      borderWidth:     1 as const,
      borderColor:     'rgba(255,255,255,0.06)',
    },
  };

  const light = {
    // Backgrounds
    bg:          '#F4F5F9',
    surface:     '#FFFFFF',
    surfaceHigh: '#FFFFFF',
    surfaceCard: '#F0F1F5',
    // Borders
    border:      'rgba(0,0,0,0.06)',
    borderMid:   'rgba(0,0,0,0.10)',
    // Text
    text:        '#111111',
    textSub:     '#666666',
    textTertiary:'#AAAAAA',
    // Soft diffused shadow
    shadow: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 8 },
      shadowOpacity: 0.05,
      shadowRadius:  16,
      elevation:     4,
    },
    // Card style
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius:    24 as const,
      borderWidth:     1 as const,
      borderColor:     'rgba(0,0,0,0.05)',
    },
    cardSm: {
      backgroundColor: '#FFFFFF',
      borderRadius:    16 as const,
      borderWidth:     1 as const,
      borderColor:     'rgba(0,0,0,0.05)',
    },
  };

  const T = isDarkMode ? dark : light;

  return {
    isDarkMode,
    primary,
    ...Accents,
    // Backgrounds
    bg:          T.bg,
    surface:     T.surface,
    surfaceHigh: T.surfaceHigh,
    surfaceCard: T.surfaceCard,
    // Borders
    border:      T.border,
    borderMid:   T.borderMid,
    // Text
    text:        T.text,
    textSub:     T.textSub,
    textTertiary:T.textTertiary,
    // Shadows
    shadow:      T.shadow,
    // Compound card styles
    card:        T.card,
    cardSm:      T.cardSm,
    // Utility: primary glow ring (for buttons and focused elements)
    glowBorder: {
      borderWidth: 1 as const,
      borderColor: `${primary}44`,
    },
    // Utility: tinted primary pill background
    pillBg:  `${primary}18`,
    pillBg2: `${primary}28`,
  };
}

export type Theme = ReturnType<typeof useTheme>;
