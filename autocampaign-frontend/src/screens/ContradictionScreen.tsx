import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCampaignStore } from '../store/campaignStore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

export const ContradictionScreen = () => {
  const navigation = useNavigation<any>();
  const T = useTheme();
  const { contradictions } = useCampaignStore();

  return (
    <ScrollView style={[styles.container, { backgroundColor: T.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: T.text }]}>Data Conflicts</Text>
      <Text style={[styles.subtitle, { color: T.textSub }]}>AI has identified and resolved the following contradictions.</Text>

      {contradictions.map((conflict, index) => (
        <View key={index} style={[styles.conflictBlock, T.cardLg, T.shadow]}>
          <View style={styles.metricRow}>
            <View style={[styles.metricBadge, { backgroundColor: T.pillBg }]}>
              <Text style={[styles.metricBadgeText, { color: T.primary }]}>{index + 1}</Text>
            </View>
            <Text style={[styles.metricName, { color: T.text }]}>{conflict.metric}</Text>
          </View>
          {conflict.description ? <Text style={[styles.description, { color: T.textSub }]}>{conflict.description}</Text> : null}

          <View style={styles.cardsRow}>
            <View style={[styles.sourceCard, T.card, T.shadow, { borderColor: `${T.error}30` }]}>
              <View style={styles.cardHead}>
                <Ionicons name="close-circle" size={16} color={T.error} />
                <Text style={[styles.cardHeadText, { color: T.error }]}>Source A</Text>
              </View>
              <Text style={[styles.sourceText, { color: T.textSub }]}>{conflict.source_a}</Text>
              <Text style={[styles.confLabel, { color: T.error }]}>Low Confidence</Text>
            </View>

            <View style={styles.vsWrap}>
              <Text style={[styles.vsText, { color: T.textTertiary }]}>VS</Text>
            </View>

            <View style={[styles.sourceCard, T.card, T.shadow, { borderColor: `${T.success}30` }]}>
              <View style={styles.cardHead}>
                <Ionicons name="checkmark-circle" size={16} color={T.success} />
                <Text style={[styles.cardHeadText, { color: T.success }]}>Source B</Text>
              </View>
              <Text style={[styles.sourceText, { color: T.textSub }]}>{conflict.source_b}</Text>
              <Text style={[styles.confLabel, { color: T.success }]}>High Confidence</Text>
            </View>
          </View>

          <View style={[styles.resolutionBox, { backgroundColor: `${T.primary}08`, borderColor: `${T.primary}20` }]}>
            <View style={styles.resolutionHeader}>
              <Ionicons name="sparkles" size={14} color={T.primary} />
              <Text style={[styles.resolutionTitle, { color: T.primary }]}>AI Recommendation</Text>
            </View>
            <Text style={[styles.resolutionText, { color: T.text }]}>{conflict.recommendation}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.proceedBtn, { backgroundColor: T.success, shadowColor: T.success }]} onPress={() => navigation.navigate('Strategy')} activeOpacity={0.85}>
        <Ionicons name="checkmark" size={18} color="#fff" />
        <Text style={styles.proceedBtnText}>Proceed with Recommendation</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },

  title: { fontSize: 32, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { fontSize: 15, marginBottom: 24, marginTop: 4 },

  conflictBlock: {
    padding: 20, marginBottom: 20, borderWidth: 0,
  },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  metricBadge: {
    width: 26, height: 26, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  metricBadgeText: { fontWeight: '700', fontSize: 13 },
  metricName: { fontSize: 17, fontWeight: '700', flex: 1 },
  description: { fontSize: 13, marginBottom: 14, lineHeight: 18 },

  cardsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sourceCard: {
    flex: 1, padding: 14,
    borderRadius: 20, borderWidth: 1,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  cardHeadText: { fontWeight: '700', fontSize: 12 },
  sourceText: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  confLabel: { fontSize: 11, fontWeight: '700' },
  vsWrap: { justifyContent: 'center', paddingHorizontal: 2 },
  vsText: { fontWeight: '700', fontSize: 12 },

  resolutionBox: {
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  resolutionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  resolutionTitle: { fontWeight: '700', fontSize: 13 },
  resolutionText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },

  proceedBtn: {
    height: 58, borderRadius: 32,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 7,
  },
  proceedBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
