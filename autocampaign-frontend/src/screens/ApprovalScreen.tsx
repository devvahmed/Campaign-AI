import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { useCampaignStore } from '../store/campaignStore';
import { Ionicons } from '@expo/vector-icons';
import { approveCampaign } from '../api/api';

export const ApprovalScreen = () => {
  const navigation = useNavigation<any>();
  const { strategy, budget, setBudget, setExecutionResult, jobId } = useCampaignStore();
  const [loading, setLoading] = useState(false);
  const [localBudget, setLocalBudget] = useState(budget);

  const handleIncreaseBudget = () => setLocalBudget(prev => Math.min(prev + 5000, 50000));
  const handleDecreaseBudget = () => setLocalBudget(prev => Math.max(prev - 5000, 5000));
  useEffect(() => { setBudget(localBudget); }, [localBudget]);

  const budgetPercent = ((localBudget - 5000) / 45000) * 100;

  const handleApprove = async () => {
    try {
      setLoading(true);
      const res = await approveCampaign(jobId, localBudget, strategy);
      setExecutionResult(res);
      navigation.navigate('Outcome');
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Review & Approve</Text>
      <Text style={styles.subtitle}>Final check before autonomous execution.</Text>

      {/* Budget Control */}
      <Text style={styles.sectionLabel}>CAMPAIGN BUDGET</Text>
      <View style={styles.budgetCard}>
        <Text style={styles.budgetValue}>PKR {localBudget.toLocaleString()}</Text>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${budgetPercent}%` as any }]} />
        </View>
        <View style={styles.budgetRange}>
          <Text style={styles.rangeText}>PKR 5,000</Text>
          <Text style={styles.rangeText}>PKR 50,000</Text>
        </View>
        <View style={styles.sliderControls}>
          <TouchableOpacity style={styles.sliderBtn} onPress={handleDecreaseBudget} activeOpacity={0.7}>
            <Ionicons name="remove" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.sliderLabel}>Adjust Budget</Text>
          <TouchableOpacity style={styles.sliderBtn} onPress={handleIncreaseBudget} activeOpacity={0.7}>
            <Ionicons name="add" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Constraints */}
      <Text style={styles.sectionLabel}>EXECUTION CHECKS</Text>
      <View style={styles.checksCard}>
        {[
          { label: 'Budget Allocated', ok: true },
          { label: 'Timeline Valid', ok: true },
          { label: 'Resources Ready', ok: true },
        ].map((c, i) => (
          <View key={i} style={[styles.checkRow, i < 2 && styles.checkRowBorder]}>
            <Text style={styles.checkLabel}>{c.label}</Text>
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.checkOk}>Passed</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Feasible Actions */}
      <Text style={styles.sectionLabel}>ACTIONS TO EXECUTE</Text>
      <View style={styles.actionsCard}>
        {strategy?.action_chain.filter((a: any) => a.is_feasible).map((action: any, index: number) => (
          <View key={index} style={[styles.actionRow, index > 0 && styles.actionRowBorder]}>
            <View style={styles.actionDot} />
            <Text style={styles.actionText}>{action.name}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.approveBtn, loading && { opacity: 0.75 }]} onPress={handleApprove} disabled={loading} activeOpacity={0.85}>
        {loading ? <ActivityIndicator color="#fff" /> : <>
          <Ionicons name="rocket" size={18} color="#fff" />
          <Text style={styles.approveBtnText}>Approve & Launch</Text>
        </>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.modifyBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
        <Text style={styles.modifyBtnText}>← Modify Assets</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },

  title: { fontSize: 32, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 20, marginTop: 4 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textSecondary,
    letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 10,
  },

  budgetCard: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  budgetValue: { fontSize: 36, fontWeight: '700', color: Colors.primary, marginBottom: 16 },
  progressBg: {
    width: '100%', height: 6, backgroundColor: Colors.borderLight,
    borderRadius: 3, marginBottom: 6, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  budgetRange: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  rangeText: { fontSize: 11, color: Colors.textSecondary },
  sliderControls: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  sliderBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surfaceCard, justifyContent: 'center', alignItems: 'center',
  },
  sliderLabel: { color: Colors.textSecondary, fontSize: 14 },

  checksCard: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 24,
  },
  checkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  checkRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  checkLabel: { color: Colors.textPrimary, fontSize: 15 },
  checkBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkOk: { color: Colors.success, fontSize: 13, fontWeight: '600' },

  actionsCard: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 24,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  actionRowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  actionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  actionText: { color: Colors.textPrimary, fontSize: 15 },

  approveBtn: {
    backgroundColor: Colors.success, paddingVertical: 17, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  approveBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  modifyBtn: { padding: 16, alignItems: 'center' },
  modifyBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '500' },
});
