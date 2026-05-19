import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AlertCard } from '../components/AlertCard';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/useTheme';

const StatCard = ({ value, label, accent, T }: { value: string; label: string; accent?: string; T: any }) => (
  <View style={[styles.statCard, T.cardSm, T.shadow]}>
    <Text style={[styles.statValue, { color: accent ?? T.text }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: T.textSub }]}>{label}</Text>
  </View>
);

export const DashboardScreen = () => {
  const navigation  = useNavigation<any>();
  const T           = useTheme();
  const userProfile = useUserStore(state => state.userProfile);
  const toggleDark  = useUserStore(state => state.toggleDarkMode);

  const barData = [60, 75, 55, 80, 70, 42, 45, 40];

  return (
    <View style={[styles.wrap, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={T.bg}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Row */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: T.textSub }]}>Welcome back 👋</Text>
            <Text style={[styles.titleLine, { color: T.text }]}>
              {userProfile?.business_name ?? 'AutoCampaign AI'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {/* Dark mode toggle */}
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: T.surface, borderColor: T.border }]}
              onPress={toggleDark}
              activeOpacity={0.7}
            >
              <Ionicons
                name={T.isDarkMode ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={T.textSub}
              />
            </TouchableOpacity>
            {/* Brand glow badge */}
            <View style={[styles.logoCircle, { backgroundColor: T.pillBg, borderColor: `${T.primary}30` }]}>
              <Ionicons name="flash" size={20} color={T.primary} />
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard value="12"   label="Campaigns"  T={T} />
          <StatCard value="3"    label="Alerts"  accent={T.warning} T={T} />
          <StatCard value="+22%" label="Avg ROI" accent={T.success} T={T} />
        </View>

        {/* Sales Trend Chart Card */}
        <View style={[styles.chartCard, T.card, T.shadow]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: T.text }]}>Sales Trend</Text>
            <View style={[styles.chartBadge, { backgroundColor: T.surfaceCard }]}>
              <Text style={[styles.chartBadgeText, { color: T.textSub }]}>Last 8 Weeks</Text>
            </View>
          </View>
          {/* Bar chart */}
          <View style={styles.fakeBars}>
            {barData.map((h, i) => (
              <View key={i} style={styles.barWrap}>
                <View
                  style={[styles.bar, {
                    height: h,
                    backgroundColor: h < 50 ? T.error : T.primary,
                    opacity: h < 50 ? 0.85 : 0.65 + i * 0.04,
                    borderRadius: 6,
                  }]}
                />
              </View>
            ))}
          </View>
          <View style={[styles.chartFooter, { borderTopColor: T.border }]}>
            <Ionicons name="warning-outline" size={13} color={T.warning} />
            <Text style={[styles.chartNote, { color: T.warning }]}>
              Sales dip detected in weeks 6–8
            </Text>
          </View>
        </View>

        {/* Recent Alerts */}
        <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>RECENT ALERTS</Text>
        <View style={[styles.alertsCard, T.card, T.shadow]}>
          <AlertCard
            title="High CPC Detected"
            description="Facebook Ads CPC increased by 40% in the last 24h."
            severity="medium"
          />
          <View style={[styles.alertDivider, { backgroundColor: T.border }]} />
          <AlertCard
            title="Inventory Critical"
            description="Product Y stock will deplete in 2 days at current velocity."
            severity="high"
          />
        </View>

        {/* Brand Persona Chip (if set) */}
        {userProfile?.brand_persona && (
          <View style={[styles.personaChip, { backgroundColor: T.pillBg, borderColor: `${T.primary}30` }]}>
            <Ionicons name="sparkles" size={13} color={T.primary} />
            <Text style={[styles.personaText, { color: T.primary }]} numberOfLines={1}>
              {userProfile.brand_persona}
            </Text>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: T.primary, shadowColor: T.primary }]}
          onPress={() => navigation.navigate('Upload')}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.ctaBtnText}>Start New Analysis</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap:       { flex: 1 },
  container:  { flex: 1 },
  content:    { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting:   { fontSize: 13, fontWeight: '500', letterSpacing: 0.3, marginBottom: 2 },
  titleLine:  { fontSize: 26, fontWeight: '800', letterSpacing: 0.2 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn:    {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  logoCircle: {
    width: 42, height: 42, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },

  statsRow:   { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard:   { flex: 1, padding: 16, alignItems: 'center' },
  statValue:  { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  statLabel:  { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  chartCard:  { padding: 18, marginBottom: 24 },
  chartHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  chartTitle: { fontSize: 17, fontWeight: '700' },
  chartBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chartBadgeText: { fontSize: 12 },
  fakeBars:   { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 90, marginBottom: 14 },
  barWrap:    { flex: 1, alignItems: 'center' },
  bar:        { width: '62%' },
  chartFooter:{ flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, paddingTop: 12 },
  chartNote:  { fontSize: 12, fontWeight: '500' },

  sectionLabel:{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  alertsCard:  { marginBottom: 20, overflow: 'hidden' },
  alertDivider:{ height: 1, marginHorizontal: 16 },

  personaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
    marginBottom: 16,
  },
  personaText: { fontSize: 12, fontWeight: '600', maxWidth: 220 },

  ctaBtn: {
    paddingVertical: 18, borderRadius: 18,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  ctaBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
