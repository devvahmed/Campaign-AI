import React, { useEffect, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

interface WelcomeScreenProps {
  onContinue: () => void;
}

export const WelcomeScreen = ({ onContinue }: WelcomeScreenProps) => {
  const T = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;
  const logoScale = useRef(new Animated.Value(0.65)).current;
  const btnFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
      Animated.timing(btnFade, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const features = [
    { icon: 'trending-up-outline', text: 'Live Pakistani Trend Integration' },
    { icon: 'mail-outline', text: 'Autonomous Bulk Email Dispatch' },
    { icon: 'color-palette-outline', text: 'Gemini-Deduced Brand Identity' },
    { icon: 'videocam-outline', text: 'AI Cinematic Video Generation' },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: T.bg }}
      contentContainerStyle={[styles.container, { backgroundColor: T.bg }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle={T.isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={T.bg} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Logo */}
        <Animated.View style={[styles.logoBlock, { transform: [{ scale: logoScale }] }]}>
          <View style={[styles.logoOuter, { backgroundColor: T.pillBg, borderColor: `${T.primary}28` }]}>
            <View style={[styles.logoInner, T.card, T.shadow]}>
              <Ionicons name="sparkles" size={34} color={T.primary} />
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 450,
  },
  logoBlock: { marginBottom: 20 },
  logoOuter: {
    width: 96, height: 96, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  logoInner: {
    width: 70, height: 70, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  headline: { fontSize: 30, fontWeight: '800', letterSpacing: 0.4, textAlign: 'center', marginBottom: 8 },
  subheadline: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  pillsContainer: { gap: 10, width: '100%', marginBottom: 24 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 0, // fully floating card
  },
  pillIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  pillText: { fontSize: 14, fontWeight: '600' },
  poweredRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  poweredDot: { width: 4, height: 4, borderRadius: 2 },
  poweredText: { fontSize: 11, fontWeight: '600' },
  btnContainer: { gap: 10, alignItems: 'center', width: '100%', marginTop: 12 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 32, height: 56, width: '100%',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
  },
  ctaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  ctaHint: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
});
