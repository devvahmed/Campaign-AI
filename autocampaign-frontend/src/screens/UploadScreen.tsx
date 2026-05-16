import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { useCampaignStore } from '../store/campaignStore';
import { loadScenario, analyzeData } from '../api/api';
import { Ionicons } from '@expo/vector-icons';

const scenarios = [
  { id: 'scenario1', label: 'Lahore Soap', icon: 'cube-outline' as const },
  { id: 'scenario2', label: 'Karachi E-com', icon: 'storefront-outline' as const },
  { id: 'scenario3', label: 'Restaurant', icon: 'restaurant-outline' as const },
];

interface InputFieldProps {
  label: string;
  icon: any;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder: string;
}

const InputField = ({ label, icon, value, onChange, multiline, placeholder }: InputFieldProps) => (
  <View style={styles.inputGroup}>
    <View style={styles.inputLabel}>
      <Ionicons name={icon} size={14} color={Colors.primary} />
      <Text style={styles.inputLabelText}>{label}</Text>
    </View>
    <TextInput
      style={[styles.input, multiline && styles.textArea]}
      multiline={multiline}
      placeholder={placeholder}
      placeholderTextColor={Colors.textTertiary}
      value={value}
      onChangeText={onChange}
    />
  </View>
);

export const UploadScreen = () => {
  const navigation = useNavigation<any>();
  const { setInputData, setScenario, setAnalysisResult, budget, setJobId } = useCampaignStore();
  const [csvData, setCsvData] = useState('');
  const [newsUrl, setNewsUrl] = useState('');
  const [socialPosts, setSocialPosts] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [jsonFeed, setJsonFeed] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingScenario, setLoadingScenario] = useState('');
  const [error, setError] = useState('');

  const handleLoadScenario = async (id: string) => {
    try {
      setLoadingScenario(id);
      setError('');
      const data = await loadScenario(id);
      setScenario(data.name);
      setCsvData(data.inputs.csv_sales_data);
      setNewsUrl(data.inputs.news_article);
      setSocialPosts(data.inputs.social_posts);
      setSupplierEmail(data.inputs.supplier_email);
      setJsonFeed(data.inputs.json_feed_url);
    } catch {
      setError('Failed to load scenario. Is the backend running?');
    } finally {
      setLoadingScenario('');
    }
  };

  const handleAnalyze = async () => {
    if (!csvData) { setError('Please provide at least CSV Sales Data'); return; }
    setLoading(true); setError('');
    try {
      const inputs = { csv_sales_data: csvData, news_article: newsUrl, social_posts: socialPosts, supplier_email: supplierEmail, json_feed_url: jsonFeed };
      setInputData(inputs);
      const jobId = 'JOB-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      setJobId(jobId);
      const response = await analyzeData(jobId, inputs, budget);
      setAnalysisResult(response.agent1_data.insights, response.agent1_data.contradictions, response.agent1_data.credibility_scores, response.agent1_data.temporal_trends, response.agent2_strategy);
      navigation.navigate('Insight');
    } catch {
      setError('Analysis failed. Check your connection to the backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Data Sources</Text>
      <Text style={styles.subtitle}>Load a scenario or enter your own data</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Scenarios */}
      <Text style={styles.sectionLabel}>QUICK DEMO SCENARIOS</Text>
      <View style={styles.scenariosRow}>
        {scenarios.map(s => (
          <TouchableOpacity
            key={s.id}
            style={[styles.scenarioBtn, loadingScenario === s.id && styles.scenarioBtnActive]}
            onPress={() => handleLoadScenario(s.id)}
            activeOpacity={0.75}
          >
            {loadingScenario === s.id
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Ionicons name={s.icon} size={18} color={Colors.primary} />
            }
            <Text style={styles.scenarioBtnText}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Inputs */}
      <Text style={styles.sectionLabel}>INPUT DATA</Text>
      <View style={styles.inputsCard}>
        <InputField label="CSV Sales Data" icon="document-text-outline" value={csvData} onChange={setCsvData} multiline placeholder="week,sales&#10;Week 1,1000..." />
        <View style={styles.divider} />
        <InputField label="News Article" icon="newspaper-outline" value={newsUrl} onChange={setNewsUrl} placeholder="Paste article or URL..." />
        <View style={styles.divider} />
        <InputField label="Social Media Posts" icon="chatbubbles-outline" value={socialPosts} onChange={setSocialPosts} multiline placeholder="Customer1: ..." />
        <View style={styles.divider} />
        <InputField label="Supplier Email" icon="mail-outline" value={supplierEmail} onChange={setSupplierEmail} multiline placeholder="Subject: ..." />
        <View style={styles.divider} />
        <InputField label="JSON Feed URL" icon="code-slash-outline" value={jsonFeed} onChange={setJsonFeed} placeholder="https://..." />
      </View>

      <TouchableOpacity style={[styles.analyzeBtn, loading && { opacity: 0.7 }]} onPress={handleAnalyze} disabled={loading} activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={styles.analyzeBtnText}>Run AI Analysis</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },

  title: { fontSize: 32, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.2 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 24, marginTop: 4 },

  errorBox: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: 'rgba(255,69,58,0.12)', padding: 14,
    borderRadius: 12, marginBottom: 16, borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.25)',
  },
  errorText: { color: Colors.error, fontSize: 14, flex: 1, fontWeight: '500' },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textSecondary,
    letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 10, marginTop: 8,
  },

  scenariosRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  scenarioBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.surfaceHigh, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight,
  },
  scenarioBtnActive: { borderColor: Colors.primary, backgroundColor: 'rgba(10,132,255,0.1)' },
  scenarioBtnText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '600' },

  inputsCard: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.borderLight, overflow: 'hidden', marginBottom: 20,
  },
  inputGroup: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  inputLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  inputLabelText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.2 },
  input: {
    color: Colors.textPrimary, fontSize: 15, paddingBottom: 14,
    paddingTop: 0, backgroundColor: 'transparent',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: 16 },

  analyzeBtn: {
    backgroundColor: Colors.primary, paddingVertical: 17,
    borderRadius: 14, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 8,
  },
  analyzeBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
