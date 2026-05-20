import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCampaignStore } from '../store/campaignStore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

export const OutcomeScreen = () => {
  const navigation      = useNavigation<any>();
  const T               = useTheme();
  const { executionResult } = useCampaignStore();

  if (!executionResult) return null;

  const statusConfig: Record<string, { color: string; bg: string }> = {
    SUCCESS:   { color: T.success, bg: `${T.success}18` },
    FAILED:    { color: T.error,   bg: `${T.error}18` },
    RECOVERED: { color: T.warning, bg: `${T.warning}18` },
  };

  return (
    <View style={[styles.wrap, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={T.bg} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <View style={[styles.hero, T.cardLg, T.shadow, { borderColor: `${T.success}20` }]}>
          <View style={[styles.heroIcon, { backgroundColor: `${T.success}12` }]}>
            <Ionicons name="checkmark-done-circle" size={44} color={T.success} />
          </View>
          <Text style={[styles.heroTitle, { color: T.text }]}>Campaign Live!</Text>
          <Text style={[styles.heroSub, { color: T.success }]}>{executionResult.final_status}</Text>
        </View>

        {/* Before / After */}
        <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>BEFORE & AFTER</Text>
        <View style={styles.metricsRow}>
          <View style={[styles.metricBox, T.card, T.shadow, { borderColor: `${T.error}20` }]}>
            <Text style={[styles.metricEpoch, { color: T.textSub }]}>Before</Text>
            <Text style={[styles.metricVal, { color: T.error }]}>-28%</Text>
            <Text style={[styles.metricDesc, { color: T.textTertiary }]}>Sales Drop</Text>
          </View>
          <View style={styles.arrowWrap}>
            <Ionicons name="arrow-forward" size={20} color={T.textTertiary} />
          </View>
          <View style={[styles.metricBox, T.card, T.shadow, { borderColor: `${T.success}20` }]}>
            <Text style={[styles.metricEpoch, { color: T.textSub }]}>Projected</Text>
            <Text style={[styles.metricVal, { color: T.success }]}>+20%</Text>
            <Text style={[styles.metricDesc, { color: T.textTertiary }]}>Recovery</Text>
          </View>
        </View>

        {/* Execution Log */}
        <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>EXECUTION LOG</Text>
        <View style={[styles.logCard, T.cardLg, T.shadow]}>
          {executionResult.execution_log.map((log: any, i: number) => {
            const sc = statusConfig[log.status] ?? { color: T.textSub, bg: T.surfaceCard };
            return (
              <View key={i} style={[styles.logItem, i > 0 && { borderTopWidth: 1, borderTopColor: T.border }]}>
                <View style={styles.logTop}>
                  <Text style={[styles.logAction, { color: T.text }]}>{log.action}</Text>
                  <View style={[styles.logBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.logBadgeText, { color: sc.color }]}>{log.status}</Text>
                  </View>
                </View>
                <View style={styles.logMeta}>
                  <Text style={[styles.logMetaText, { color: T.textSub }]}>PKR {log.cost?.toLocaleString()}</Text>
                  <Text style={[styles.logMetaDot, { color: T.textTertiary }]}>·</Text>
                  <Text style={[styles.logMetaText, { color: T.textSub }]}>{log.latency_ms}ms</Text>
                </View>
                {log.error ? <Text style={[styles.logError, { color: T.error }]}>{log.error}</Text> : null}
              </View>
            );
          })}
        </View>

        {/* Cost Summary */}
        <View style={[styles.costRow, T.cardLg, T.shadow]}>
          <Text style={[styles.costLabel, { color: T.textSub }]}>Total Spend</Text>
          <Text style={[styles.costValue, { color: T.primary }]}>PKR {executionResult.total_cost?.toLocaleString()}</Text>
        </View>

        {/* New Campaign CTA */}
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: T.primary, shadowColor: T.primary }]}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] })}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.newBtnText}>Start New Campaign</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap:       { flex: 1 },
  container:  { flex: 1 },
  content:    { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },

  hero:       {
    alignItems: 'center', paddingVertical: 32,
    borderWidth: 1, marginBottom: 28,
  },
  heroIcon:   { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  heroTitle:  { fontSize: 30, fontWeight: '800', marginBottom: 6 },
  heroSub:    { fontSize: 14, fontWeight: '600' },

  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  metricBox:  { flex: 1, padding: 18, alignItems: 'center', borderWidth: 1 },
  metricEpoch:{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  metricVal:  { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  metricDesc: { fontSize: 12, fontWeight: '600' },
  arrowWrap:  { padding: 4 },

  logCard:    { marginBottom: 20, overflow: 'hidden', borderWidth: 0 },
  logItem:    { padding: 18 },
  logTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  logAction:  { fontWeight: '600', fontSize: 14, flex: 1 },
  logBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  logBadgeText:{ fontSize: 11, fontWeight: '700' },
  logMeta:    { flexDirection: 'row', gap: 6, alignItems: 'center' },
  logMetaText:{ fontSize: 12, fontWeight: '600' },
  logMetaDot: { fontSize: 12 },
  logError:   { fontSize: 12, marginTop: 4, fontStyle: 'italic' },

  costRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, marginBottom: 24, borderWidth: 0 },
  costLabel:  { fontSize: 15, fontWeight: '600' },
  costValue:  { fontSize: 22, fontWeight: '800' },

  newBtn:     {
    height: 58, borderRadius: 32,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 7,
  },
  newBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
