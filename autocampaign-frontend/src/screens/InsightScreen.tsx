import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { useCampaignStore } from '../store/campaignStore';
import { AlertCard } from '../components/AlertCard';
import { StatusBadge } from '../components/StatusBadge';
import { Ionicons } from '@expo/vector-icons';

export const InsightScreen = () => {
  const navigation = useNavigation<any>();
  const { insights, contradictions, credibilityScores } = useCampaignStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Business ka Haal</Text>
      <Text style={styles.subtitle}>AI ne apka data parh lia hai</Text>

      {contradictions.length > 0 && (
        <TouchableOpacity style={styles.conflictBanner} onPress={() => navigation.navigate('Contradiction')} activeOpacity={0.8}>
          <View style={styles.conflictIconWrap}>
            <Ionicons name="warning" size={18} color={Colors.warning} />
          </View>
          <View style={styles.conflictText}>
            <Text style={styles.conflictTitle}>{contradictions.length} Data Conflict{contradictions.length > 1 ? 's' : ''} Found</Text>
            <Text style={styles.conflictSub}>Tap to review AI resolution</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}

      <Text style={styles.sectionLabel}>MASLAY (ANOMALIES)</Text>
      {insights.map((insight, index) => (
        <AlertCard
          key={index}
          title={insight.metric}
          description={insight.description}
          severity={insight.severity as any}
        />
      ))}

      <Text style={styles.sectionLabel}>SOURCE CREDIBILITY</Text>
      <View style={styles.credCard}>
        {credibilityScores.map((score, index) => (
          <View key={index} style={[styles.credRow, index < credibilityScores.length - 1 && styles.credRowBorder]}>
            <View style={styles.credBarWrap}>
              <View style={styles.credRowTop}>
                <Text style={styles.sourceName}>{score.source}</Text>
                <StatusBadge
                  label={`${Math.round(score.score * 100)}%`}
                  type={score.score > 0.7 ? 'success' : score.score > 0.4 ? 'warning' : 'error'}
                />
              </View>
              <View style={styles.credBarBg}>
                <View style={[styles.credBarFill, {
                  width: `${score.score * 100}%` as any,
                  backgroundColor: score.score > 0.7 ? Colors.success : score.score > 0.4 ? Colors.warning : Colors.error
                }]} />
              </View>
              <Text style={styles.sourceReason}>{score.reason}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.nextBtn} onPress={() => navigation.navigate('Strategy')} activeOpacity={0.85}>
        <Text style={styles.nextBtnText}>View AI Strategy</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },

  title: { fontSize: 32, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 20, marginTop: 4 },

  conflictBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,159,10,0.10)', padding: 14,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,159,10,0.25)',
    marginBottom: 20,
  },
  conflictIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,159,10,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  conflictText: { flex: 1 },
  conflictTitle: { color: Colors.warning, fontWeight: '600', fontSize: 15 },
  conflictSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textSecondary,
    letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 10, marginTop: 8,
  },

  credCard: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 24, overflow: 'hidden',
  },
  credRow: { padding: 16 },
  credRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  credRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  credBarWrap: { flex: 1 },
  credBarBg: { height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, marginBottom: 8, overflow: 'hidden' },
  credBarFill: { height: '100%', borderRadius: 2 },
  sourceName: { color: Colors.textPrimary, fontWeight: '600', fontSize: 15 },
  sourceReason: { color: Colors.textSecondary, fontSize: 12 },

  nextBtn: {
    backgroundColor: Colors.primary, paddingVertical: 17, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
