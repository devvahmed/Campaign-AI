import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCampaignStore } from '../store/campaignStore';
import { loadScenario, analyzeData } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import { FuturisticLoader } from '../components/FuturisticLoader';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/useTheme';

const scenarios = [
  { id: 'scenario1', label: 'Lahore Soap',    icon: 'cube-outline'        as const },
  { id: 'scenario2', label: 'Karachi E-com',  icon: 'storefront-outline'  as const },
  { id: 'scenario3', label: 'Restaurant',     icon: 'restaurant-outline'  as const },
];

export const UploadScreen = () => {
  const navigation  = useNavigation<any>();
  const T           = useTheme();
  const { setInputData, setScenario, setAnalysisResult, budget, setJobId, businessLevel, inputData } = useCampaignStore();
  const userProfile = useUserStore(state => state.userProfile);

  const [csvData,       setCsvData]       = useState('');
  const [newsUrl,       setNewsUrl]       = useState('');
  const [socialPosts,   setSocialPosts]   = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [jsonFeed,      setJsonFeed]      = useState('');
  const [loading,        setLoading]       = useState(false);
  const [loadingScenario,setLoadingScenario] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [error,          setError]         = useState('');
  const [activeStepIndex,setActiveStepIndex] = useState(-1);

  useEffect(() => {
    if (inputData && Object.keys(inputData).length > 0) {
      if (inputData.csv_sales_data) setCsvData(inputData.csv_sales_data);
      if (inputData.news_text) setNewsUrl(inputData.news_text);
      if (inputData.social_posts) setSocialPosts(inputData.social_posts);
      if (inputData.pdf_report) setSupplierEmail(inputData.pdf_report);
      if (inputData.web_url) setJsonFeed(inputData.web_url);
    }
  }, [inputData]);

  const loadingSteps = [
    { text: '🔍 Agent 1: Parsing multi-source data & extracting local trends...', delay: 0 },
    { text: '📊 Agent 1: Checking data contradictions and source credibility...',  delay: 8000 },
    { text: '🧠 Agent 2: Structuring marketing strategy and allocating budget...',  delay: 18000 },
    { text: '🎨 Agent 3: Writing localized ad copy and painting AI visual assets...', delay: 28000 },
    { text: '🎬 Agent 3: Generating cinematic 10-15s AI promo video via Fal.ai...', delay: 42000 },
  ];

  const handleLoadScenario = async (id: string) => {
    try {
      setLoadingScenario(id); setError('');
      const data = await loadScenario(id);
      setScenario(data.name);
      setSelectedScenarioId(id);
      setCsvData(data.inputs.csv_sales_data || '');
      setNewsUrl(data.inputs.news_article || '');
      setSocialPosts(data.inputs.social_posts || '');
      setSupplierEmail(data.inputs.supplier_email || '');
      setJsonFeed(data.inputs.json_feed_url || '');
    } catch {
      setError('Failed to load scenario. Is the backend running?');
    } finally {
      setLoadingScenario('');
    }
  };

  const handleTextChange = (text: string, setter: (val: string) => void) => {
    setter(text);
    if (selectedScenarioId) {
      setSelectedScenarioId('');
      setScenario('');
    }
  };

  const handleAnalyze = async () => {
    if (!csvData) { setError('Please provide at least the CSV Sales Data.'); return; }
    setLoading(true); setError(''); setActiveStepIndex(0);
    const timers = loadingSteps.map((_, i) => i === 0 ? null : setTimeout(() => setActiveStepIndex(i), _.delay));
    try {
      const inputs = {
        csv_sales_data: csvData, pdf_report: supplierEmail,
        news_text: newsUrl, social_posts: socialPosts, web_url: jsonFeed,
      };
      setInputData(inputs);
      const jobId = 'JOB-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      setJobId(jobId);
      const response = await analyzeData(
        jobId, 
        inputs, 
        budget, 
        businessLevel, 
        userProfile?.business_name, 
        userProfile?.brand_color,
        selectedScenarioId
      );
      setAnalysisResult(
        response.agent1_data.insights, response.agent1_data.contradictions,
        response.agent1_data.credibility_scores, response.agent1_data.temporal_trends,
        response.agent2_strategy, response.agent3_creative
      );
      navigation.navigate('Insight');
    } catch {
      setError('Analysis failed. Check your connection to the backend or increase timeout.');
    } finally {
      timers.forEach(t => t && clearTimeout(t));
      setLoading(false); setActiveStepIndex(-1);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={T.bg} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: T.text }]}>Apna Business Data Dain</Text>
        <Text style={[styles.subtitle, { color: T.textSub }]}>Apni details btain ya demo load karein</Text>

        {/* Error */}
        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: `${T.error}18`, borderColor: `${T.error}40` }]}>
            <Ionicons name="alert-circle" size={16} color={T.error} />
            <Text style={[styles.errorText, { color: T.error }]}>{error}</Text>
          </View>
        )}

        {/* Scenario Chips */}
        <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>QUICK DEMO SCENARIOS</Text>
        <View style={styles.scenariosRow}>
          {scenarios.map(s => {
            const isSelected = loadingScenario === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.scenarioBtn,
                  T.shadow,
                  { backgroundColor: T.surface, borderColor: T.border },
                  isSelected && { borderColor: T.primary, backgroundColor: T.pillBg },
                ]}
                onPress={() => handleLoadScenario(s.id)}
                activeOpacity={0.75}
              >
                {isSelected
                  ? <ActivityIndicator size="small" color={T.primary} />
                  : <Ionicons name={s.icon} size={16} color={T.primary} />
                }
                <Text style={[styles.scenarioBtnText, { color: T.text }]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Data Inputs Card */}
        <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>BUSINESS DATA INPUTS</Text>
        <View style={[styles.inputsCard, T.cardLg, T.shadow]}>
          {/* CSV Sales Data */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Ionicons name="document-text-outline" size={13} color={T.primary} />
              <Text style={[styles.inputLabelText, { color: T.textSub }]}>📊 CSV Sales Data</Text>
            </View>
            <View style={[styles.inputBox, { backgroundColor: T.surfaceCard, borderColor: T.border }]}>
              <TextInput
                style={[styles.input, styles.textArea, { color: T.text }]}
                multiline={true}
                placeholder="Paste CSV sales data..."
                placeholderTextColor={T.textTertiary}
                value={csvData}
                onChangeText={(text) => handleTextChange(text, setCsvData)}
              />
            </View>
          </View>
          
          <View style={[styles.divider, { backgroundColor: T.border }]} />

          {/* News / Competitor Updates */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Ionicons name="newspaper-outline" size={13} color={T.primary} />
              <Text style={[styles.inputLabelText, { color: T.textSub }]}>📰 News / Competitor Updates</Text>
            </View>
            <View style={[styles.inputBox, { backgroundColor: T.surfaceCard, borderColor: T.border }]}>
              <TextInput
                style={[styles.input, styles.textArea, { color: T.text }]}
                multiline={true}
                placeholder="Paste news articles or competitor updates..."
                placeholderTextColor={T.textTertiary}
                value={newsUrl}
                onChangeText={(text) => handleTextChange(text, setNewsUrl)}
              />
            </View>
          </View>
          
          <View style={[styles.divider, { backgroundColor: T.border }]} />

          {/* Social Posts / Feedback */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Ionicons name="chatbubbles-outline" size={13} color={T.primary} />
              <Text style={[styles.inputLabelText, { color: T.textSub }]}>💬 Social Posts / Feedback</Text>
            </View>
            <View style={[styles.inputBox, { backgroundColor: T.surfaceCard, borderColor: T.border }]}>
              <TextInput
                style={[styles.input, styles.textArea, { color: T.text }]}
                multiline={true}
                placeholder="Customer feedback or social posts..."
                placeholderTextColor={T.textTertiary}
                value={socialPosts}
                onChangeText={(text) => handleTextChange(text, setSocialPosts)}
              />
            </View>
          </View>
          
          <View style={[styles.divider, { backgroundColor: T.border }]} />

          {/* PDF Business Report */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Ionicons name="document-outline" size={13} color={T.primary} />
              <Text style={[styles.inputLabelText, { color: T.textSub }]}>📄 PDF Business Report</Text>
            </View>
            <View style={[styles.inputBox, { backgroundColor: T.surfaceCard, borderColor: T.border }]}>
              <TextInput
                style={[styles.input, styles.textArea, { color: T.text }]}
                multiline={true}
                placeholder="Paste text from PDF reports..."
                placeholderTextColor={T.textTertiary}
                value={supplierEmail}
                onChangeText={(text) => handleTextChange(text, setSupplierEmail)}
              />
            </View>
          </View>
          
          <View style={[styles.divider, { backgroundColor: T.border }]} />

          {/* Live Web URL */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Ionicons name="link-outline" size={13} color={T.primary} />
              <Text style={[styles.inputLabelText, { color: T.textSub }]}>🔗 Live Web URL</Text>
            </View>
            <View style={[styles.inputBox, { backgroundColor: T.surfaceCard, borderColor: T.border }]}>
              <TextInput
                style={[styles.input, { color: T.text }]}
                multiline={false}
                placeholder="https://..."
                placeholderTextColor={T.textTertiary}
                value={jsonFeed}
                onChangeText={(text) => handleTextChange(text, setJsonFeed)}
              />
            </View>
          </View>
        </View>

        {/* Loader / Analyze Button */}
        {loading ? (
          <View style={[styles.loaderCard, T.cardLg, { borderColor: T.primary }, T.shadow]}>
            <View style={styles.loaderHeader}>
              <FuturisticLoader />
              <Text style={[styles.loaderTitle, { color: T.text }]}>AI Agents Working...</Text>
            </View>
            <View style={styles.loaderSteps}>
              {loadingSteps.map((step, i) => {
                const isActive    = i === activeStepIndex;
                const isCompleted = i < activeStepIndex;
                return (
                  <View key={i} style={[styles.stepRow, i > activeStepIndex && { opacity: 0.35 }]}>
                    <View style={styles.stepIconWrap}>
                      {isCompleted
                        ? <Ionicons name="checkmark-circle" size={20} color={T.success} />
                        : isActive
                          ? <ActivityIndicator size="small" color={T.primary} />
                          : <Ionicons name="ellipse-outline" size={20} color={T.textTertiary} />
                      }
                    </View>
                    <Text style={[
                      styles.stepText,
                      { color: isActive ? T.primary : isCompleted ? T.text : T.textTertiary },
                      isActive && styles.stepTextActive,
                    ]}>
                      {step.text}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.analyzeBtn, { backgroundColor: T.primary, shadowColor: T.primary }]}
            onPress={handleAnalyze}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={styles.analyzeBtnText}>Run AI Analysis</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap:       { flex: 1 },
  container:  { flex: 1 },
  content:    { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 48 },

  title:      { fontSize: 28, fontWeight: '800', letterSpacing: 0.2, marginBottom: 4 },
  subtitle:   { fontSize: 15, marginBottom: 24 },

  errorBox:   {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    padding: 14, borderRadius: 24, marginBottom: 16, borderWidth: 1,
  },
  errorText:  { fontSize: 14, flex: 1, fontWeight: '600' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', marginBottom: 12, marginTop: 4,
  },

  scenariosRow:   { flexDirection: 'row', gap: 10, marginBottom: 24 },
  scenarioBtn:    {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 14,
    borderRadius: 99, borderWidth: 1,
  },
  scenarioBtnText:{ fontSize: 12, fontWeight: '700' },

  inputsCard:   { marginBottom: 28, overflow: 'hidden', borderWidth: 0 },
  inputGroup:   { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18 },
  inputLabel:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  inputLabelText:{ fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  inputBox:     {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  input:        { fontSize: 14, paddingBottom: 0, paddingTop: 0, minHeight: 40, backgroundColor: 'transparent' },
  textArea:     { minHeight: 76, textAlignVertical: 'top' },
  divider:      { height: 1, marginHorizontal: 20 },

  loaderCard:   { padding: 24, borderWidth: 1, marginBottom: 24 },
  loaderHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  loaderTitle:  { fontSize: 18, fontWeight: '700' },
  loaderSteps:  { gap: 16 },
  stepRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIconWrap: { width: 24, alignItems: 'center' },
  stepText:     { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  stepTextActive:{ fontWeight: '800' },

  analyzeBtn:   {
    paddingVertical: 18, borderRadius: 32,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
  },
  analyzeBtnText:{ color: '#fff', fontSize: 17, fontWeight: '700' },
});
