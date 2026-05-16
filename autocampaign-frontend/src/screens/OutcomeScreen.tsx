import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { useCampaignStore } from '../store/campaignStore';
import { Ionicons } from '@expo/vector-icons';

const statusConfig: Record<string, { color: string; bg: string }> = {
  SUCCESS:   { color: Colors.success, bg: 'rgba(48,209,88,0.15)' },
  FAILED:    { color: Colors.error,   bg: 'rgba(255,69,58,0.15)' },
  RECOVERED: { color: Colors.warning, bg: 'rgba(255,159,10,0.15)' },
};

export const OutcomeScreen = () => {
  const navigation = useNavigation<any>();
  const { executionResult } = useCampaignStore();

  if (!executionResult) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="checkmark-done-circle" size={40} color={Colors.success} />
        </View>
        <Text style={styles.heroTitle}>Campaign Live!</Text>
        <Text style={styles.heroSub}>Status: {executionResult.final_status}</Text>
      </View>

      {/* Metrics */}
      <Text style={styles.sectionLabel}>BEFORE & AFTER</Text>
      <View style={styles.metricsRow}>
        <View style={[styles.metricBox, { borderColor: 'rgba(255,69,58,0.3)', backgroundColor: 'rgba(255,69,58,0.08)' }]}>
          <Text style={styles.metricEpoch}>Before</Text>
          <Text style={[styles.metricVal, { color: Colors.error }]}>-28%</Text>
          <Text style={styles.metricDesc}>Sales Drop</Text>
        </View>
        <View style={styles.arrowWrap}>
          <Ionicons name="arrow-forward" size={20} color={Colors.textTertiary} />
        </View>
        <View style={[styles.metricBox, { borderColor: 'rgba(48,209,88,0.3)', backgroundColor: 'rgba(48,209,88,0.08)' }]}>
          <Text style={styles.metricEpoch}>Projected</Text>
          <Text style={[styles.metricVal, { color: Colors.success }]}>+20%</Text>
          <Text style={styles.metricDesc}>Recovery</Text>
        </View>
      </View>

      {/* Execution Log */}
      <Text style={styles.sectionLabel}>EXECUTION LOG</Text>
      <View style={styles.logCard}>
        {executionResult.execution_log.map((log: any, index: number) => {
          const sc = statusConfig[log.status] ?? { color: Colors.textSecondary, bg: Colors.surfaceCard };
          return (
            <View key={index} style={[styles.logItem, index > 0 && styles.logItemBorder]}>
              <View style={styles.logTop}>
                <Text style={styles.logAction}>{log.action}</Text>
                <View style={[styles.logBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.logBadgeText, { color: sc.color }]}>{log.status}</Text>
                </View>
              </View>
              <View style={styles.logMeta}>
                <Text style={styles.logMetaText}>PKR {log.cost?.toLocaleString()}</Text>
                <Text style={styles.logMetaDot}>·</Text>
                <Text style={styles.logMetaText}>{log.latency_ms}ms</Text>
              </View>
              {log.error ? <Text style={styles.logError}>{log.error}</Text> : null}
            </View>
          );
        })}
      </View>

      {/* Cost Summary */}
      <View style={styles.costRow}>
        <Text style={styles.costLabel}>Total Spend</Text>
        <Text style={styles.costValue}>PKR {executionResult.total_cost?.toLocaleString()}</Text>
      </View>

      <TouchableOpacity style={styles.newBtn} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] })} activeOpacity={0.85}>
        <Ionicons name="refresh" size={18} color="#fff" />
        <Text style={styles.newBtnText}>Start New Campaign</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },

  hero: {
    alignItems: 'center', paddingVertical: 28,
    backgroundColor: Colors.surfaceHigh, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(48,209,88,0.2)', marginBottom: 28,
  },
  heroIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(48,209,88,0.15)', justifyContent: 'center',
    alignItems: 'center', marginBottom: 14,
  },
  heroTitle: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  heroSub: { fontSize: 14, color: Colors.success, fontWeight: '500' },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textSecondary,
    letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 10,
  },

  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  metricBox: {
    flex: 1, padding: 16, borderRadius: 14, alignItems: 'center',
    borderWidth: 1,
  },
  metricEpoch: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  metricVal: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  metricDesc: { fontSize: 12, color: Colors.textSecondary },
  arrowWrap: { padding: 4 },

  logCard: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 16,
  },
  logItem: { padding: 14 },
  logItemBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  logAction: { color: Colors.textPrimary, fontWeight: '600', fontSize: 14, flex: 1 },
  logBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  logBadgeText: { fontSize: 11, fontWeight: '700' },
  logMeta: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  logMetaText: { color: Colors.textSecondary, fontSize: 12 },
  logMetaDot: { color: Colors.textTertiary, fontSize: 12 },
  logError: { color: Colors.error, fontSize: 12, marginTop: 4, fontStyle: 'italic' },

  costRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surfaceHigh, padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 20,
  },
  costLabel: { color: Colors.textSecondary, fontSize: 15 },
  costValue: { color: Colors.primary, fontSize: 20, fontWeight: '700' },

  newBtn: {
    backgroundColor: Colors.primary, paddingVertical: 17, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  newBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
