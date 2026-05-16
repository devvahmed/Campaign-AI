import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { AlertCard } from '../components/AlertCard';
import { Ionicons } from '@expo/vector-icons';

const StatCard = ({ value, label, accent }: { value: string; label: string; accent?: string }) => (
  <View style={styles.statCard}>
    <Text style={[styles.statValue, accent ? { color: accent } : {}]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>AutoCampaign</Text>
          <Text style={styles.titleLine}>AI Dashboard</Text>
        </View>
        <View style={styles.logoCircle}>
          <Ionicons name="flash" size={22} color={Colors.primary} />
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard value="12" label="Campaigns" />
        <StatCard value="3" label="Issues" accent={Colors.warning} />
        <StatCard value="+22%" label="Avg ROI" accent={Colors.success} />
      </View>

      {/* Chart Card */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Sales Trend</Text>
          <Text style={styles.chartBadge}>Last 8 Weeks</Text>
        </View>
        <View style={styles.fakeBars}>
          {[60, 75, 55, 80, 70, 42, 45, 40].map((h, i) => (
            <View key={i} style={styles.barWrap}>
              <View style={[styles.bar, {
                height: h,
                backgroundColor: h < 50 ? Colors.error : Colors.primary,
                opacity: h < 50 ? 0.9 : 0.7 + i * 0.03,
              }]} />
            </View>
          ))}
        </View>
        <View style={styles.chartFooter}>
          <Text style={styles.chartNote}>⚠ Sales dip detected in weeks 6–8</Text>
        </View>
      </View>

      {/* Alerts */}
      <Text style={styles.sectionLabel}>RECENT ALERTS</Text>
      <AlertCard
        title="High CPC Detected"
        description="Facebook Ads CPC increased by 40% in the last 24h."
        severity="medium"
      />
      <AlertCard
        title="Inventory Critical"
        description="Product Y stock will deplete in 2 days at current velocity."
        severity="high"
      />

      {/* CTA Button */}
      <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Upload')} activeOpacity={0.85}>
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.ctaBtnText}>Start New Analysis</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  titleLine: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(10,132,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.25)',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surfaceHigh,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  chartCard: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chartBadge: {
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  fakeBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 90,
    marginBottom: 12,
  },
  barWrap: { flex: 1, alignItems: 'center' },
  bar: { width: '65%', borderRadius: 6 },
  chartFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  chartNote: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '500',
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  ctaBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
