/**
 * useTheme — Centralized dynamic token hook
 * Generates a complete design token set based on isDarkMode + user brand color.
 * Import and call this in any screen to get a fully-typed `T` (theme) object.
 */
import { useUserStore } from '../store/userStore';

function getContrastYIQ(hexcolor: any) {
  if (!hexcolor || typeof hexcolor !== 'string') return '#FFFFFF';
  hexcolor = hexcolor.replace("#", "");
  if (hexcolor.length === 3) {
    hexcolor = hexcolor.split('').map(x => x + x).join('');
  }
  const r = parseInt(hexcolor.substring(0,2), 16);
  const g = parseInt(hexcolor.substring(2,4), 16);
  const b = parseInt(hexcolor.substring(4,6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#FFFFFF';
  const yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? '#0E1015' : '#FFFFFF';
}

// Fixed semantic accent colors (never change with dark/light)
export const Accents = {
  success: '#30D158',
  warning: '#FF9F0A',
  error:   '#FF453A',
  purple:  '#BF5AF2',
};

export function useTheme() {
  const isDarkMode  = useUserStore(state => state.isDarkMode);
  const themeColor = useUserStore(state => state.brandColor || state.themeColor);
  const primary = (typeof themeColor === 'function' ? themeColor() : themeColor || '#0A84FF') as string;
  const primaryText = getContrastYIQ(primary);

  // ── Token stacks ──────────────────────────────────────────────────────────
  const dark = {
    // Backgrounds
    bg:          '#0E1015',
    surface:     '#1A1D26',
    surfaceHigh: '#222634',
    surfaceCard: '#242835',
    // Borders
    border:      'rgba(255,255,255,0.04)',
    borderMid:   'rgba(255,255,255,0.08)',
    // Text
    text:        '#F1F2F6',
    textSub:     '#9CA3B5',
    textTertiary:'#5C6479',
    // Shadows — hidden in dark mode, replaced by border glow
    shadow: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 2 },
      shadowOpacity: 0,
      shadowRadius:  0,
      elevation:     0,
    },
    // Card styles
    card: {
      backgroundColor: '#1A1D26',
      borderRadius:    24 as const,
      borderWidth:     1 as const,
      borderColor:     'rgba(255,255,255,0.04)',
    },
    cardLg: {
      backgroundColor: '#1A1D26',
      borderRadius:    32 as const,
      borderWidth:     1 as const,
      borderColor:     'rgba(255,255,255,0.04)',
    },
    cardSm: {
      backgroundColor: '#1A1D26',
      borderRadius:    16 as const,
      borderWidth:     1 as const,
      borderColor:     'rgba(255,255,255,0.04)',
    },
  };

  const light = {
    // Backgrounds — pristine warm ivory/alabaster luxury base
    bg:          '#FAF9F5',
    surface:     '#FFFFFF',
    surfaceHigh: '#FCFCFC',
    surfaceCard: '#FFFFFF',
    // Borders — subtle and crisp
    border:      'rgba(15,17,21,0.06)',
    borderMid:   'rgba(15,17,21,0.12)',
    // Text — deep rich charcoal hierarchy for highest readability
    text:        '#0B0C0E',
    textSub:     '#5A6172',
    textTertiary:'#8A92A6',
    // Soft luxurious diffused shadow
    shadow: {
      shadowColor:   '#0F1115',
      shadowOffset:  { width: 0, height: 8 },
      shadowOpacity: 0.05,
      shadowRadius:  16,
      elevation:     3,
    },
    // Card styles with elegant premium spacing
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius:    24 as const,
      borderWidth:     1 as const,
      borderColor:     'rgba(15,17,21,0.06)',
    },
    cardLg: {
      backgroundColor: '#FFFFFF',
      borderRadius:    32 as const,
      borderWidth:     1 as const,
      borderColor:     'rgba(15,17,21,0.06)',
    },
    cardSm: {
      backgroundColor: '#FFFFFF',
      borderRadius:    16 as const,
      borderWidth:     1 as const,
      borderColor:     'rgba(15,17,21,0.06)',
    },
  };

  const T = isDarkMode ? dark : light;

  return {
    isDarkMode,
    primary,
    primaryText,
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
    cardLg:      T.cardLg,
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
