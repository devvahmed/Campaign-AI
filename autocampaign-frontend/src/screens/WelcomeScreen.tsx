import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

interface WelcomeScreenProps {
  onContinue: () => void;
}

export const WelcomeScreen = ({ onContinue }: WelcomeScreenProps) => {
  const T = useTheme();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;
  const logoScale = useRef(new Animated.Value(0.65)).current;
  const btnFade   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
      Animated.timing(btnFade, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const features = [
    { icon: 'trending-up-outline',   text: 'Live Pakistani Trend Integration' },
    { icon: 'mail-outline',          text: 'Autonomous Bulk Email Dispatch' },
    { icon: 'color-palette-outline', text: 'Gemini-Deduced Brand Identity' },
    { icon: 'videocam-outline',      text: 'AI Cinematic Video Generation' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={T.bg} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Logo */}
        <Animated.View style={[styles.logoBlock, { transform: [{ scale: logoScale }] }]}>
          <View style={[styles.logoOuter, { backgroundColor: T.pillBg, borderColor: `${T.primary}28` }]}>
            <View style={[styles.logoInner, T.card, T.shadow]}>
              <Ionicons name="sparkles" size={38} color={T.primary} />
            </View>
          </View>
        </Animated.View>

        <Text style={[styles.headline, { color: T.text }]}>AutoCampaign AI</Text>
        <Text style={[styles.subheadline, { color: T.textSub }]}>
          Pakistan's First{'\n'}Autonomous Marketing platform
        </Text>

        {/* Feature Pills */}
        <View style={styles.pillsContainer}>
          {features.map((f, i) => (
            <View key={i} style={[styles.pill, T.card, T.shadow]}>
              <View style={[styles.pillIcon, { backgroundColor: T.pillBg }]}>
                <Ionicons name={f.icon as any} size={16} color={T.primary} />
              </View>
              <Text style={[styles.pillText, { color: T.text }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Powered By */}
        <View style={styles.poweredRow}>
          <View style={[styles.poweredDot, { backgroundColor: T.textTertiary }]} />
          <Text style={[styles.poweredText, { color: T.textTertiary }]}>
            Powered by Gemini · Fal.ai · Resend
          </Text>
          <View style={[styles.poweredDot, { backgroundColor: T.textTertiary }]} />
        </View>
      </Animated.View>

      {/* CTA */}
      <Animated.View style={[styles.btnContainer, { opacity: btnFade }]}>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: T.primary, shadowColor: T.primary }]}
          onPress={onContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.ctaHint, { color: T.textTertiary }]}>
          Autonomous. Trend-Aware. Yours.
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 52,
    paddingHorizontal: 28,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoBlock:  { marginBottom: 28 },
  logoOuter:  {
    width: 112, height: 112, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  logoInner:  {
    width: 82, height: 82, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  headline:   { fontSize: 34, fontWeight: '800', letterSpacing: 0.4, textAlign: 'center', marginBottom: 10 },
  subheadline:{ fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 36 },
  pillsContainer: { gap: 12, width: '100%', marginBottom: 32 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 0, // fully floating card
  },
  pillIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  pillText: { fontSize: 15, fontWeight: '600' },
  poweredRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  poweredDot:  { width: 4, height: 4, borderRadius: 2 },
  poweredText: { fontSize: 12, fontWeight: '600' },
  btnContainer:{ gap: 12, alignItems: 'center', width: '100%' },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 32, height: 60, width: '100%',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
  },
  ctaBtnText:  { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  ctaHint:     { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
});
