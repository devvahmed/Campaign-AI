import { StyleSheet, Platform } from 'react-native';
import { Colors } from './colors';

// Apple-style reusable style tokens
export const T = {
  // Font sizes (SF Pro rhythm)
  largeTitle: 34,
  title1: 28,
  title2: 22,
  title3: 20,
  headline: 17,
  body: 17,
  callout: 16,
  subheadline: 15,
  footnote: 13,
  caption: 12,
  caption2: 11,

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

// Shared reusable styles
export const shared = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },
  pageTitle: {
    fontSize: T.largeTitle,
    fontWeight: T.bold,
    color: Colors.textPrimary,
    letterSpacing: 0.35,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: T.subheadline,
    fontWeight: T.regular,
    color: Colors.textSecondary,
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: T.footnote,
    fontWeight: T.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 24,
  },
  card: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
  },
  pillButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row' as const,
    gap: 8,
  },
  pillButtonText: {
    fontSize: T.callout,
    fontWeight: T.semibold,
    color: Colors.textPrimary,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center',
  },
});
