import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { useCampaignStore } from '../store/campaignStore';
import { Ionicons } from '@expo/vector-icons';
import { generateAssets } from '../api/api';

export const StrategyScreen = () => {
  const navigation = useNavigation<any>();
  const { strategy, setAssets, jobId } = useCampaignStore();
  const [loading, setLoading] = useState(false);

  const handleGenerateAssets = async () => {
    try {
      setLoading(true);
      const res = await generateAssets(jobId, strategy);
      setAssets(res);
      navigation.navigate('Assets');
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (!strategy) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Campaign Strategy</Text>
      <Text style={styles.subtitle}>Agent 2 Recommendation</Text>

      {/* Root Cause */}
      <View style={styles.rootCauseBox}>
        <View style={styles.rootIcon}>
          <Ionicons name="search" size={16} color={Colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rootLabel}>Root Cause Identified</Text>
          <Text style={styles.rootText}>{strategy.root_cause}</Text>
        </View>
      </View>

      {/* ROI Predictions */}
      <Text style={styles.sectionLabel}>PROJECTED ROI</Text>
      <View style={styles.roiRow}>
        {[
          { label: 'Conservative', value: strategy.roi_prediction.low, color: Colors.textSecondary },
          { label: 'Expected', value: strategy.roi_prediction.mid, color: Colors.primary, featured: true },
          { label: 'Optimistic', value: strategy.roi_prediction.high, color: Colors.success },
        ].map((item, i) => (
          <View key={i} style={[styles.roiCard, item.featured && styles.roiFeatured]}>
            <Text style={[styles.roiLabel, { color: item.featured ? Colors.primary : Colors.textSecondary }]}>{item.label}</Text>
            <Text style={[styles.roiValue, { color: item.color }]}>+{item.value}%</Text>
          </View>
        ))}
      </View>

      {/* Action Chain */}
      <Text style={styles.sectionLabel}>ACTION CHAIN</Text>
      {strategy.action_chain.map((action: any, index: number) => (
        <View key={index} style={[styles.actionCard, !action.is_feasible && styles.actionFaded]}>
          <View style={styles.actionTop}>
            <View style={styles.actionNumBadge}>
              <Text style={styles.actionNum}>{index + 1}</Text>
            </View>
            <Text style={styles.actionName}>{action.name}</Text>
            <View style={[styles.feasBadge, { backgroundColor: action.is_feasible ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)' }]}>
              <Text style={[styles.feasText, { color: action.is_feasible ? Colors.success : Colors.error }]}>
                {action.is_feasible ? 'Feasible' : 'Over Budget'}
              </Text>
            </View>
          </View>
          <Text style={styles.actionDesc}>{action.description}</Text>
          <Text style={styles.actionCost}>PKR {action.budget_required?.toLocaleString()}</Text>
        </View>
      ))}

      <TouchableOpacity style={[styles.generateBtn, loading && { opacity: 0.7 }]} onPress={handleGenerateAssets} disabled={loading} activeOpacity={0.85}>
        {loading ? <ActivityIndicator color="#fff" /> : <>
          <Ionicons name="color-palette" size={18} color="#fff" />
          <Text style={styles.generateBtnText}>Generate Creative Assets</Text>
        </>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },

  title: { fontSize: 32, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 20, marginTop: 4 },

  rootCauseBox: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: 'rgba(255,159,10,0.08)', padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,159,10,0.25)', marginBottom: 24,
  },
  rootIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,159,10,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  rootLabel: { fontSize: 11, fontWeight: '600', color: Colors.warning, letterSpacing: 0.5, marginBottom: 4 },
  rootText: { color: Colors.textPrimary, fontSize: 14, lineHeight: 20 },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textSecondary,
    letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 10,
  },

  roiRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  roiCard: {
    flex: 1, backgroundColor: Colors.surfaceHigh, padding: 14,
    borderRadius: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  roiFeatured: {
    borderColor: 'rgba(10,132,255,0.4)',
    backgroundColor: 'rgba(10,132,255,0.08)',
  },
  roiLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  roiValue: { fontSize: 22, fontWeight: '700' },

  actionCard: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 10,
  },
  actionFaded: { opacity: 0.5 },
  actionTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  actionNumBadge: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: 'rgba(10,132,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  actionNum: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  actionName: { flex: 1, color: Colors.textPrimary, fontWeight: '600', fontSize: 15 },
  feasBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  feasText: { fontSize: 11, fontWeight: '700' },
  actionDesc: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  actionCost: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },

  generateBtn: {
    backgroundColor: Colors.primary, paddingVertical: 17, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8,
  },
  generateBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
