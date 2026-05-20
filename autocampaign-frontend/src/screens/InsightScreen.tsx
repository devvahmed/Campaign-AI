import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCampaignStore } from '../store/campaignStore';
import { AlertCard } from '../components/AlertCard';
import { StatusBadge } from '../components/StatusBadge';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

export const InsightScreen = () => {
  const navigation = useNavigation<any>();
  const T = useTheme();
  const { insights, contradictions, credibilityScores } = useCampaignStore();

  return (
    <ScrollView style={[styles.container, { backgroundColor: T.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: T.text }]}>Business ka Haal</Text>
      <Text style={[styles.subtitle, { color: T.textSub }]}>AI ne apka data parh lia hai</Text>

      {contradictions.length > 0 && (
        <TouchableOpacity 
          style={[styles.conflictBanner, T.card, T.shadow, { backgroundColor: `${T.warning}12`, borderColor: `${T.warning}30` }]} 
          onPress={() => navigation.navigate('Contradiction')} 
          activeOpacity={0.8}
        >
          <View style={[styles.conflictIconWrap, { backgroundColor: `${T.warning}18` }]}>
            <Ionicons name="warning" size={18} color={T.warning} />
          </View>
          <View style={styles.conflictText}>
            <Text style={[styles.conflictTitle, { color: T.warning }]}>{contradictions.length} Data Conflict{contradictions.length > 1 ? 's' : ''} Found</Text>
            <Text style={[styles.conflictSub, { color: T.textSub }]}>Tap to review AI resolution</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.textSub} />
        </TouchableOpacity>
      )}

      <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>MASLAY (ANOMALIES)</Text>
      {insights.map((insight, index) => (
        <AlertCard
          key={index}
          title={insight.metric}
          description={insight.description}
          severity={insight.severity as any}
        />
      ))}

      <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>SOURCE CREDIBILITY</Text>
      <View style={[styles.credCard, T.cardLg, T.shadow]}>
        {credibilityScores.map((score, index) => (
          <View key={index} style={[styles.credRow, index < credibilityScores.length - 1 && { borderBottomWidth: 1, borderBottomColor: T.border }]}>
            <View style={styles.credBarWrap}>
              <View style={styles.credRowTop}>
                <Text style={[styles.sourceName, { color: T.text }]}>{score.source}</Text>
                <StatusBadge
                  label={`${Math.round(score.score * 100)}%`}
                  type={score.score > 0.7 ? 'success' : score.score > 0.4 ? 'warning' : 'error'}
                />
              </View>
              <View style={[styles.credBarBg, { backgroundColor: T.surfaceCard }]}>
                <View style={[styles.credBarFill, {
                  width: `${score.score * 100}%` as any,
                  backgroundColor: score.score > 0.7 ? T.success : score.score > 0.4 ? T.warning : T.error
                }]} />
              </View>
              <Text style={[styles.sourceReason, { color: T.textSub }]}>{score.reason}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.nextBtn, { backgroundColor: T.primary, shadowColor: T.primary }]} onPress={() => navigation.navigate('Strategy')} activeOpacity={0.85}>
        <Text style={styles.nextBtnText}>View AI Strategy</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },

  title: { fontSize: 32, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { fontSize: 15, marginBottom: 20, marginTop: 4 },

  conflictBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 24, borderWidth: 1,
    marginBottom: 20,
  },
  conflictIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  conflictText: { flex: 1 },
  conflictTitle: { fontWeight: '700', fontSize: 15 },
  conflictSub: { fontSize: 12, marginTop: 2, fontWeight: '500' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12, marginTop: 8,
  },

  credCard: {
    marginBottom: 24, overflow: 'hidden', borderWidth: 0,
  },
  credRow: { padding: 18 },
  credRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  credBarWrap: { flex: 1 },
  credBarBg: { height: 6, borderRadius: 99, marginBottom: 8, overflow: 'hidden' },
  credBarFill: { height: '100%', borderRadius: 99 },
  sourceName: { fontWeight: '700', fontSize: 15 },
  sourceReason: { fontSize: 12, lineHeight: 17 },

  nextBtn: {
    height: 58, borderRadius: 32,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
  },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
