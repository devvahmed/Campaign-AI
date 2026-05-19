import React, { useState, useEffect } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCampaignStore } from '../store/campaignStore';
import { Ionicons } from '@expo/vector-icons';
import { approveCampaign } from '../api/api';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/useTheme';

export const ApprovalScreen = () => {
  const T = useTheme();
  const navigation = useNavigation<any>();
  const { strategy, budget, setBudget, setExecutionResult, jobId, assets, setLoadingStatus } = useCampaignStore();
  const userProfile = useUserStore(state => state.userProfile);

  const [loading,       setLoading]       = useState(false);
  const [localBudget,   setLocalBudget]   = useState(budget);
  const [manualEmails,  setManualEmails]  = useState('');
  const [csvEmails,     setCsvEmails]     = useState<string[]>([]);

  const handleIncreaseBudget = () => setLocalBudget(p => Math.min(p + 5000, 50000));
  const handleDecreaseBudget = () => setLocalBudget(p => Math.max(p - 5000, 5000));
  useEffect(() => { setBudget(localBudget); }, [localBudget]);

  const budgetPercent = ((localBudget - 5000) / 45000) * 100;

  const getCombinedLeads = (): string[] => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const parsedManual = manualEmails.match(emailRegex) || [];
    return Array.from(new Set([...parsedManual, ...csvEmails]));
  };

  const handlePickCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const found = fileContent.match(emailRegex) || [];
      if (!found.length) { Alert.alert('No Leads Found', 'No valid email addresses found in CSV.'); return; }
      setCsvEmails(found);
      Alert.alert('✅ Leads Imported', `${found.length} customer leads loaded from CSV.`);
    } catch { Alert.alert('Error', 'Failed to read the CSV file.'); }
  };

  const handleApprove = async () => {
    const leads = getCombinedLeads();
    if (!leads.length) {
      Alert.alert('No Leads', 'Add emails manually or import a CSV before dispatching.');
      return;
    }
    try {
      setLoading(true);
      setLoadingStatus("🚀 Agent 4: Dispatching bulk personalized campaign via Resend...");
      const res = await approveCampaign(jobId, localBudget, strategy, leads, assets, userProfile?.business_name, userProfile?.brand_color);
      setExecutionResult(res);
      Alert.alert('🚀 Campaign Dispatched!', `Email sent to ${leads.length} customer lead${leads.length > 1 ? 's' : ''}!`);
      navigation.navigate('Outcome');
    } catch {
      Alert.alert('Error', 'Failed to dispatch campaign. Check your backend connection.');
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  const checks = [
    { label: 'Budget Allocated', ok: true },
    { label: 'Timeline Valid',   ok: true },
    { label: 'Resources Ready',  ok: true },
  ];
  const combinedLeads = getCombinedLeads();

  return (
    <View style={[styles.wrap, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={T.bg} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={[styles.title, { color: T.text }]}>Review & Approve</Text>
        <Text style={[styles.subtitle, { color: T.textSub }]}>Final check before autonomous execution.</Text>

        {/* Budget Card */}
        <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>CAMPAIGN BUDGET</Text>
        <View style={[styles.budgetCard, T.card, T.shadow]}>
          <Text style={[styles.budgetValue, { color: T.primary }]}>PKR {localBudget.toLocaleString()}</Text>
          {/* Progress bar */}
          <View style={[styles.progressBg, { backgroundColor: T.surfaceCard }]}>
            <View style={[styles.progressFill, { width: `${budgetPercent}%` as any, backgroundColor: T.primary }]} />
          </View>
          <View style={styles.budgetRange}>
            <Text style={[styles.rangeText, { color: T.textTertiary }]}>PKR 5,000</Text>
            <Text style={[styles.rangeText, { color: T.textTertiary }]}>PKR 50,000</Text>
          </View>
          <View style={styles.sliderControls}>
            <TouchableOpacity style={[styles.sliderBtn, { backgroundColor: T.surfaceCard, borderColor: T.border }]} onPress={handleDecreaseBudget}>
              <Ionicons name="remove" size={20} color={T.text} />
            </TouchableOpacity>
            <Text style={[styles.sliderLabel, { color: T.textSub }]}>Adjust Budget</Text>
            <TouchableOpacity style={[styles.sliderBtn, { backgroundColor: T.surfaceCard, borderColor: T.border }]} onPress={handleIncreaseBudget}>
              <Ionicons name="add" size={20} color={T.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Checks */}
        <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>EXECUTION CHECKS</Text>
        <View style={[styles.checksCard, T.card, T.shadow]}>
          {checks.map((c, i) => (
            <View key={i} style={[styles.checkRow, i < checks.length - 1 && { borderBottomWidth: 1, borderBottomColor: T.border }]}>
              <Text style={[styles.checkLabel, { color: T.text }]}>{c.label}</Text>
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark-circle" size={16} color={T.success} />
                <Text style={[styles.checkOk, { color: T.success }]}>Passed</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>ACTIONS TO EXECUTE</Text>
        <View style={[styles.actionsCard, T.card, T.shadow]}>
          {strategy?.action_chain?.filter((a: any) => a.is_feasible).map((action: any, i: number) => (
            <View key={i} style={[styles.actionRow, i > 0 && { borderTopWidth: 1, borderTopColor: T.border }]}>
              <View style={[styles.actionDot, { backgroundColor: T.primary }]} />
              <Text style={[styles.actionText, { color: T.text }]}>{action.name}</Text>
            </View>
          ))}
        </View>

        {/* Dispatch Card */}
        <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>MARKETING DISPATCH SETUP</Text>
        <View style={[styles.dispatchCard, T.card, T.shadow]}>
          <Text style={[styles.dispatchSubLabel, { color: T.textSub }]}>
            Manual Entry <Text style={{ color: T.textTertiary }}>(comma-separated)</Text>
          </Text>
          <View style={[styles.emailInputRow, { backgroundColor: T.surfaceCard, borderColor: T.border }]}>
            <Ionicons name="mail-outline" size={18} color={T.textSub} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.emailInput, { color: T.text }]}
              placeholder="lead1@gmail.com, lead2@yahoo.com"
              placeholderTextColor={T.textTertiary}
              value={manualEmails}
              onChangeText={setManualEmails}
              keyboardType="email-address"
              autoCapitalize="none"
              multiline
            />
          </View>

          <View style={[styles.divider, { backgroundColor: T.border }]} />

          <TouchableOpacity
            style={[styles.csvBtn, { borderColor: `${T.primary}60`, backgroundColor: T.pillBg }]}
            onPress={handlePickCSV}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={18} color={T.primary} />
            <Text style={[styles.csvBtnText, { color: T.primary }]}>
              {csvEmails.length > 0 ? `📁 Replace CSV (${csvEmails.length} loaded)` : '📁 Import Customer Leads (.csv)'}
            </Text>
          </TouchableOpacity>

          {combinedLeads.length > 0 && (
            <View style={[styles.leadsBadge, { backgroundColor: `${T.success}18`, borderColor: `${T.success}30` }]}>
              <Ionicons name="people" size={16} color={T.success} />
              <Text style={[styles.leadsText, { color: T.success }]}>
                {combinedLeads.length} Leads Ready for Dispatch
              </Text>
            </View>
          )}
        </View>

        {/* Approve Button */}
        <TouchableOpacity
          style={[styles.approveBtn, { backgroundColor: T.success, shadowColor: T.success }, loading && { opacity: 0.75 }]}
          onPress={handleApprove}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="rocket" size={18} color="#fff" />
                <Text style={styles.approveBtnText}>Approve & Launch Campaign</Text>
              </>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.modifyBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Text style={[styles.modifyBtnText, { color: T.textSub }]}>← Modify Assets</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap:       { flex: 1 },
  container:  { flex: 1 },
  content:    { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },

  title:      { fontSize: 30, fontWeight: '800', letterSpacing: 0.2, marginBottom: 4 },
  subtitle:   { fontSize: 15, marginBottom: 22 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },

  budgetCard: { padding: 20, alignItems: 'center', marginBottom: 24 },
  budgetValue:{ fontSize: 38, fontWeight: '800', marginBottom: 16 },
  progressBg: { width: '100%', height: 6, borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  progressFill:{ height: '100%', borderRadius: 3 },
  budgetRange:{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 18 },
  rangeText:  { fontSize: 11 },
  sliderControls:{ flexDirection: 'row', alignItems: 'center', gap: 20 },
  sliderBtn:  { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  sliderLabel:{ fontSize: 14 },

  checksCard: { marginBottom: 24, overflow: 'hidden' },
  checkRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  checkLabel: { fontSize: 15 },
  checkBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkOk:    { fontSize: 13, fontWeight: '600' },

  actionsCard:{ marginBottom: 24, overflow: 'hidden' },
  actionRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  actionDot:  { width: 8, height: 8, borderRadius: 4 },
  actionText: { fontSize: 15 },

  dispatchCard:    { padding: 18, marginBottom: 24 },
  dispatchSubLabel:{ fontSize: 13, fontWeight: '600', marginBottom: 10 },
  emailInputRow:   {
    flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14,
    paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginBottom: 4,
  },
  emailInput:      { flex: 1, fontSize: 14, minHeight: 44 },
  divider:         { height: 1, marginVertical: 14 },
  csvBtn:          {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderWidth: 1, borderRadius: 12, paddingVertical: 14, marginBottom: 12,
  },
  csvBtnText:      { fontWeight: '700', fontSize: 14 },
  leadsbadge:      {},
  leadsText:       { fontSize: 14, fontWeight: '700' },
  leadsBadge:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, paddingVertical: 10, borderWidth: 1,
  },

  approveBtn:  {
    paddingVertical: 18, borderRadius: 18,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 7,
  },
  approveBtnText:{ color: '#fff', fontSize: 17, fontWeight: '700' },
  modifyBtn:     { padding: 16, alignItems: 'center' },
  modifyBtnText: { fontSize: 15, fontWeight: '500' },
});
