import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { useCampaignStore } from '../store/campaignStore';
import { Ionicons } from '@expo/vector-icons';

export const ContradictionScreen = () => {
  const navigation = useNavigation<any>();
  const { contradictions } = useCampaignStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Data Conflicts</Text>
      <Text style={styles.subtitle}>AI has identified and resolved the following contradictions.</Text>

      {contradictions.map((conflict, index) => (
        <View key={index} style={styles.conflictBlock}>
          <View style={styles.metricRow}>
            <View style={styles.metricBadge}>
              <Text style={styles.metricBadgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.metricName}>{conflict.metric}</Text>
          </View>
          {conflict.description ? <Text style={styles.description}>{conflict.description}</Text> : null}

          <View style={styles.cardsRow}>
            <View style={[styles.sourceCard, { borderColor: 'rgba(255,69,58,0.4)' }]}>
              <View style={styles.cardHead}>
                <Ionicons name="close-circle" size={16} color={Colors.error} />
                <Text style={[styles.cardHeadText, { color: Colors.error }]}>Source A</Text>
              </View>
              <Text style={styles.sourceText}>{conflict.source_a}</Text>
              <Text style={[styles.confLabel, { color: Colors.error }]}>Low Confidence</Text>
            </View>

            <View style={styles.vsWrap}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={[styles.sourceCard, { borderColor: 'rgba(48,209,88,0.4)' }]}>
              <View style={styles.cardHead}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={[styles.cardHeadText, { color: Colors.success }]}>Source B</Text>
              </View>
              <Text style={styles.sourceText}>{conflict.source_b}</Text>
              <Text style={[styles.confLabel, { color: Colors.success }]}>High Confidence</Text>
            </View>
          </View>

          <View style={styles.resolutionBox}>
            <View style={styles.resolutionHeader}>
              <Ionicons name="sparkles" size={14} color={Colors.primary} />
              <Text style={styles.resolutionTitle}>AI Recommendation</Text>
            </View>
            <Text style={styles.resolutionText}>{conflict.recommendation}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.proceedBtn} onPress={() => navigation.navigate('Strategy')} activeOpacity={0.85}>
        <Ionicons name="checkmark" size={18} color="#fff" />
        <Text style={styles.proceedBtnText}>Proceed with Recommendation</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },

  title: { fontSize: 32, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 24, marginTop: 4 },

  conflictBlock: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 16,
  },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  metricBadge: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: 'rgba(10,132,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  metricBadgeText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  metricName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  description: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14 },

  cardsRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  sourceCard: {
    flex: 1, backgroundColor: Colors.surfaceCard, padding: 12,
    borderRadius: 12, borderWidth: 1,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  cardHeadText: { fontWeight: '600', fontSize: 12 },
  sourceText: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: 8 },
  confLabel: { fontSize: 11, fontWeight: '700' },
  vsWrap: { justifyContent: 'center', paddingHorizontal: 2 },
  vsText: { color: Colors.textTertiary, fontWeight: '700', fontSize: 12 },

  resolutionBox: {
    backgroundColor: 'rgba(10,132,255,0.08)', padding: 12,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(10,132,255,0.2)',
  },
  resolutionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  resolutionTitle: { color: Colors.primary, fontWeight: '600', fontSize: 13 },
  resolutionText: { color: Colors.textPrimary, fontSize: 13, lineHeight: 19 },

  proceedBtn: {
    backgroundColor: Colors.success, paddingVertical: 17, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  proceedBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
