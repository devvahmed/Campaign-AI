import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCampaignStore } from '../store/campaignStore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

export const StrategyScreen = () => {
  const navigation = useNavigation<any>();
  const T = useTheme();
  const { strategy, setAssets, jobId, businessLevel } = useCampaignStore();
  const [loading, setLoading] = useState(false);

  const handleGenerateAssets = () => {
    navigation.navigate('Assets');
  };

  if (!strategy) return null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: T.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: T.text }]}>Trend aur Strategy</Text>
      <Text style={[styles.subtitle, { color: T.textSub }]}>Apki Business Strategy</Text>

      {/* Root Cause */}
      <View style={[styles.rootCauseBox, T.card, T.shadow, { backgroundColor: `${T.warning}08`, borderColor: `${T.warning}20` }]}>
        <View style={[styles.rootIcon, { backgroundColor: `${T.warning}18` }]}>
          <Ionicons name="search" size={16} color={T.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rootLabel, { color: T.warning }]}>Asal Masla</Text>
          <Text style={[styles.rootText, { color: T.text }]}>{strategy.root_cause}</Text>
        </View>
      </View>

      {/* ROI Predictions */}
      <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>KITNA FAIDA HOGA (ROI)</Text>
      <View style={styles.roiRow}>
        {[
          { label: 'Conservative', value: strategy.roi_prediction.low, color: T.textSub, bg: T.surface, border: T.border },
          { label: 'Expected', value: strategy.roi_prediction.mid, color: T.primary, featured: true, bg: `${T.primary}08`, border: `${T.primary}30` },
          { label: 'Optimistic', value: strategy.roi_prediction.high, color: T.success, bg: T.surface, border: T.border },
        ].map((item, i) => (
          <View key={i} style={[styles.roiCard, T.card, T.shadow, { backgroundColor: item.bg, borderColor: item.border }]}>
            <Text style={[styles.roiLabel, { color: item.featured ? T.primary : T.textSub }]}>{item.label}</Text>
            <Text style={[styles.roiValue, { color: item.color }]}>+{item.value}%</Text>
          </View>
        ))}
      </View>

      {/* Action Chain */}
      <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>KIA KRNA CHAHIYE</Text>
      {strategy.action_chain.map((action: any, index: number) => (
        <View key={index} style={[styles.actionCard, T.card, T.shadow, !action.is_feasible && styles.actionFaded]}>
          <View style={styles.actionTop}>
            <View style={[styles.actionNumBadge, { backgroundColor: `${T.primary}18` }]}>
              <Text style={[styles.actionNum, { color: T.primary }]}>{index + 1}</Text>
            </View>
            <Text style={[styles.actionName, { color: T.text }]}>{action.name}</Text>
            <View style={[styles.feasBadge, { backgroundColor: action.is_feasible ? `${T.success}18` : `${T.error}18` }]}>
              <Text style={[styles.feasText, { color: action.is_feasible ? T.success : T.error }]}>
                {action.is_feasible ? 'Feasible' : 'Over Budget'}
              </Text>
            </View>
          </View>
          <Text style={[styles.actionDesc, { color: T.textSub }]}>{action.description}</Text>
          <Text style={[styles.actionCost, { color: T.text }]}>PKR {action.budget_required?.toLocaleString()}</Text>
        </View>
      ))}

      <TouchableOpacity style={[styles.generateBtn, { backgroundColor: T.primary, shadowColor: T.primary }]} onPress={handleGenerateAssets} activeOpacity={0.85}>
        <Ionicons name="color-palette" size={18} color="#fff" />
        <Text style={styles.generateBtnText}>View Creative Assets</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },

  title: { fontSize: 32, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { fontSize: 15, marginBottom: 20, marginTop: 4 },

  rootCauseBox: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 24,
  },
  rootIcon: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  rootLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  rootText: { fontSize: 14, lineHeight: 20 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
  },

  roiRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  roiCard: {
    flex: 1, padding: 14,
    borderRadius: 20, alignItems: 'center',
    borderWidth: 1,
  },
  roiLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  roiValue: { fontSize: 22, fontWeight: '800' },

  actionCard: {
    borderRadius: 24, padding: 16,
    borderWidth: 1, marginBottom: 12,
  },
  actionFaded: { opacity: 0.5 },
  actionTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  actionNumBadge: {
    width: 28, height: 28, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  actionNum: { fontWeight: '800', fontSize: 13 },
  actionName: { flex: 1, fontWeight: '700', fontSize: 15 },
  feasBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  feasText: { fontSize: 11, fontWeight: '700' },
  actionDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  actionCost: { fontSize: 14, fontWeight: '700' },

  generateBtn: {
    height: 58, borderRadius: 32,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
  },
  generateBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
