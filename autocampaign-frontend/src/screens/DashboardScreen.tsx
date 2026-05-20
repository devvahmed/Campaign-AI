import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Image, ActivityIndicator, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AlertCard } from '../components/AlertCard';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/useTheme';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { useCampaignStore } from '../store/campaignStore';
import { getLiveCompetitors } from '../api/api';

const StatCard = ({ value, label, accent, T }: { value: string; label: string; accent?: string; T: any }) => (
  <View style={[styles.statCard, T.card, T.shadow]}>
    <Text style={[styles.statValue, { color: accent ?? T.text }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: T.textSub }]}>{label}</Text>
  </View>
);

export const DashboardScreen = () => {
  const navigation  = useNavigation<any>();

  // ── All hooks declared at the top (required by React Rules of Hooks) ─────────
  const T           = useTheme();
  const userProfile = useUserStore(state => state.userProfile);
  const toggleDark  = useUserStore(state => state.toggleDarkMode);
  const executionResult = useCampaignStore(state => state.executionResult);
  const campaigns = executionResult ? [executionResult] : [];

  const [competitors, setCompetitors] = useState<any>(null);
  const [compLoading, setCompLoading] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);

  // ── Generic category resolver (replaces narrow isFootwear check) ─────────────
  const resolvedCategory = (() => {
    const bt = (userProfile?.business_type || '').toLowerCase();
    if (bt.includes('footwear') || bt.includes('shoe')) return 'footwear';
    if (bt.includes('clothing') || bt.includes('apparel') || bt.includes('fashion')) return 'clothing';
    if (bt.includes('food') || bt.includes('restaurant') || bt.includes('chai')) return 'food';
    if (bt.includes('beauty') || bt.includes('cosmetics')) return 'beauty';
    if (bt.includes('electronics') || bt.includes('tech')) return 'electronics';
    if (bt.includes('sports') || bt.includes('fitness')) return 'sports';
    return 'generic';
  })();

  const NICHE_TAGLINES: Record<string, string> = {
    footwear:    '👟 Dominate the footwear market with AI!',
    clothing:    '👗 Elevate your apparel brand with AI!',
    food:        '🍔 Grow your restaurant chain with AI!',
    beauty:      '💄 Amplify your beauty brand with AI!',
    electronics: '📱 Lead the tech market with AI insights!',
    sports:      '🏃 Accelerate your sports brand with AI!',
    generic:     '⚡ Power your campaigns with AI!',
  };
  const nicheTagline = NICHE_TAGLINES[resolvedCategory] ?? NICHE_TAGLINES.generic;

  useEffect(() => {
    if (userProfile?.business_name) {
      const fetchCompetitors = async () => {
        try {
          setCompLoading(true);
          const data = await getLiveCompetitors(userProfile.business_name);
          setCompetitors(data);

          if (data?.brand_color) {
            useUserStore.getState().login({
              ...useUserStore.getState().userProfile,
              brand_color: data.brand_color
            });
          }
        } catch (err) {
          console.error("Error fetching live competitors:", err);
        } finally {
          setCompLoading(false);
        }
      };
      fetchCompetitors();
    }
  }, [userProfile?.business_name]);

  const alertCount = competitors
    ? ((competitors.competitorA?.active_deal ? 1 : 0) + (competitors.competitorB?.active_deal ? 1 : 0))
    : 0;

  const points = [60, 75, 55, 80, 70, 42, 45, 40];

  const computeROI = () => {
    if (campaigns.length === 0) return '0%';
    const first3 = points.slice(0, 3);
    const last3 = points.slice(-3);
    const firstAvg = first3.reduce((a, b) => a + b, 0) / first3.length;
    const lastAvg = last3.reduce((a, b) => a + b, 0) / last3.length;
    const rawDiff = firstAvg - lastAvg;
    const pct = Math.round((Math.abs(rawDiff) / lastAvg) * 44);
    return `+${pct}%`;
  };

  const handleAutoGenerateCounter = () => {
    if (!competitors) return;
    const nicheText = `Based on competitor monitoring:\n- ${competitors.competitorA.name} is offering "${competitors.competitorA.active_deal}".\n- ${competitors.competitorB.name} is offering "${competitors.competitorB.active_deal}".\n\nAI Strategy:\n${competitors.ai_counter_insight}`;
    
    const prefilledInputs = {
      csv_sales_data: `Week,Sales\n1,400\n2,380\n3,420\n4,390\n5,350\n6,310\n7,320\n8,300`,
      news_text: nicheText,
      social_posts: `Launched counter-campaign against ${competitors.competitorA.name} and ${competitors.competitorB.name} to reclaim DHA/Clifton market share!`,
      pdf_report: `Supplier status stable. Ready to shift inventory to match promotion demand.`,
      web_url: `https://www.${userProfile?.business_name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'autocampaign'}.com`
    };
    
    useCampaignStore.getState().setInputData(prefilledInputs);
    navigation.navigate('Upload');
  };

  const chartWidth = 310;
  const chartHeight = 100;
  const paddingY = 10;
  
  const minVal = 30;
  const maxVal = 90;
  
  const coords = points.map((val, i) => {
    const x = (i / (points.length - 1)) * chartWidth;
    const y = chartHeight - paddingY - ((val - minVal) / (maxVal - minVal)) * (chartHeight - 2 * paddingY);
    return { x, y };
  });

  let linePath = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const cp1x = coords[i - 1].x + (coords[i].x - coords[i - 1].x) / 2;
    const cp1y = coords[i - 1].y;
    const cp2x = coords[i - 1].x + (coords[i].x - coords[i - 1].x) / 2;
    const cp2y = coords[i].y;
    linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${coords[i].x} ${coords[i].y}`;
  }

  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${chartHeight} L ${coords[0].x} ${chartHeight} Z`;
  const lastPoint = coords[coords.length - 1];

  return (
    <View style={[styles.wrap, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={T.bg}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Row */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: T.textSub }]}>Welcome back 👋</Text>
            <Text style={[styles.titleLine, { color: T.text }]}>
              {userProfile?.business_name ?? 'AutoCampaign AI'}
            </Text>
            {/* Niche-reactive tagline — auto-shifts based on resolved brand category */}
            <Text style={[styles.nicheTagline, { color: T.primary }]} numberOfLines={1}>
              {nicheTagline}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {/* Dark mode toggle */}
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: T.surface, borderColor: T.border }]}
              onPress={toggleDark}
              activeOpacity={0.7}
            >
              <Ionicons
                name={T.isDarkMode ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={T.textSub}
              />
            </TouchableOpacity>
            {/* Brand glow badge — border color shifts with T.primary (brand color token) */}
            <View style={[styles.logoCircle, { backgroundColor: T.pillBg, borderColor: `${T.primary}30`, overflow: 'hidden' }]}>
              {userProfile?.website_url ? (
                <Image
                  source={{ uri: `https://www.google.com/s2/favicons?sz=128&domain=${userProfile.website_url.replace(/https?:\/\/(www\.)?/, '').split('/')[0]}` }}
                  style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                />
              ) : (
                <Ionicons name="flash" size={20} color={T.primary} />
              )}
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard value={String(campaigns.length)} label="Campaigns" T={T} />
          <TouchableOpacity 
            style={{ flex: 1 }} 
            onPress={() => setAlertModalVisible(true)}
            activeOpacity={0.7}
          >
            <StatCard value={String(alertCount)} label="Alerts" accent={T.warning} T={T} />
          </TouchableOpacity>
          <StatCard value={computeROI()} label="Avg ROI" accent={T.success} T={T} />
        </View>

        {campaigns.length === 0 ? (
          <View style={[styles.competitorCard, T.cardLg, T.shadow]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: T.text }]}>Competitor Intelligence Hub</Text>
              <View style={[styles.liveBadge, { backgroundColor: '#34C75918', borderColor: '#34C75950', borderWidth: 1 }]}>
                <View style={styles.pulseDot} />
                <Text style={[styles.liveBadgeText, { color: '#34C759' }]}>LIVE MONITORING</Text>
              </View>
            </View>

            {compLoading ? (
              <View style={styles.compLoadingContainer}>
                <ActivityIndicator size="large" color={T.primary} />
                <Text style={[styles.compLoadingText, { color: T.textSub }]}>Scanning Pakistan Social Ad Library...</Text>
              </View>
            ) : competitors ? (
              <View>
                {/* 2-column Competitor Grid */}
                <View style={styles.competitorGrid}>
                  {/* Competitor A Card */}
                  <View style={[styles.compCard, { backgroundColor: T.surface, borderColor: T.border }]}>
                    <View style={styles.compCardHeader}>
                      <Text style={[styles.compName, { color: T.text }]} numberOfLines={1}>{competitors.competitorA.name}</Text>
                      <View style={[styles.liveIndicator, { backgroundColor: '#34C75918' }]}>
                        <View style={[styles.pulseDot, { backgroundColor: '#34C759' }]} />
                        <Text style={styles.liveIndicatorText}>LIVE ADS</Text>
                      </View>
                    </View>
                    <Text style={[styles.compSectionTitle, { color: T.primary }]}>Active Deal</Text>
                    <Text style={[styles.compText, { color: T.text }]} numberOfLines={2}>{competitors.competitorA.active_deal}</Text>
                    <Text style={[styles.compSectionTitle, { color: T.primary }]}>Market Impact</Text>
                    <Text style={[styles.compText, { color: T.textSub }]} numberOfLines={2}>{competitors.competitorA.impact}</Text>
                  </View>

                  {/* Competitor B Card */}
                  <View style={[styles.compCard, { backgroundColor: T.surface, borderColor: T.border }]}>
                    <View style={styles.compCardHeader}>
                      <Text style={[styles.compName, { color: T.text }]} numberOfLines={1}>{competitors.competitorB.name}</Text>
                      <View style={[styles.liveIndicator, { backgroundColor: '#34C75918' }]}>
                        <View style={[styles.pulseDot, { backgroundColor: '#34C759' }]} />
                        <Text style={styles.liveIndicatorText}>LIVE ADS</Text>
                      </View>
                    </View>
                    <Text style={[styles.compSectionTitle, { color: T.primary }]}>Active Deal</Text>
                    <Text style={[styles.compText, { color: T.text }]} numberOfLines={2}>{competitors.competitorB.active_deal}</Text>
                    <Text style={[styles.compSectionTitle, { color: T.primary }]}>Market Impact</Text>
                    <Text style={[styles.compText, { color: T.textSub }]} numberOfLines={2}>{competitors.competitorB.impact}</Text>
                  </View>
                </View>

                {/* AI Counter-Insight Block */}
                <View style={[styles.insightBlock, { backgroundColor: T.pillBg, borderColor: `${T.primary}30` }]}>
                  <View style={styles.insightHeader}>
                    <Ionicons name="sparkles" size={16} color={T.primary} />
                    <Text style={[styles.insightTitle, { color: T.primary }]}>AI COUNTER-INSIGHT</Text>
                  </View>
                  <Text style={[styles.insightBody, { color: T.text }]}>{competitors.ai_counter_insight}</Text>
                </View>

                {/* CTA to auto-generate counter campaign */}
                <TouchableOpacity
                  style={[styles.counterCtaBtn, { backgroundColor: T.primary, shadowColor: T.primary }]}
                  onPress={handleAutoGenerateCounter}
                  activeOpacity={0.85}
                >
                  <Ionicons name="flash" size={18} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.counterCtaBtnText}>Auto-Generate Counter Campaign</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.compErrorContainer}>
                <Text style={[styles.compErrorText, { color: T.textSub }]}>Could not load live competitor insights.</Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { borderColor: T.primary }]}
                  onPress={async () => {
                    if (userProfile?.business_name) {
                      try {
                        setCompLoading(true);
                        const data = await getLiveCompetitors(userProfile.business_name);
                        setCompetitors(data);
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setCompLoading(false);
                      }
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: T.primary, fontWeight: '700' }}>Retry Scan</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* Sales Trend Chart Card */
          <View style={[styles.chartCard, T.cardLg, T.shadow]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: T.text }]}>Sales Trend</Text>
              <View style={[styles.chartBadge, { backgroundColor: T.surfaceCard }]}>
                <Text style={[styles.chartBadgeText, { color: T.textSub }]}>Last 8 Weeks</Text>
              </View>
            </View>
            {/* Dynamic Bezier curved line/area chart */}
            <View style={styles.chartContainer}>
              <Svg width={chartWidth} height={chartHeight}>
                <Defs>
                  <LinearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={T.primary} stopOpacity={0.18} />
                    <Stop offset="100%" stopColor={T.primary} stopOpacity={0.0} />
                  </LinearGradient>
                </Defs>
                
                {/* Translucent Area Fill */}
                <Path d={areaPath} fill="url(#brandGradient)" />
                
                {/* Fluid Bezier Wave Path */}
                <Path d={linePath} stroke={T.primary} strokeWidth={3} fill="none" />
                
                {/* Vertical Dashed Focus Indicator */}
                <Line
                  x1={lastPoint.x}
                  y1={lastPoint.y}
                  x2={lastPoint.x}
                  y2={chartHeight}
                  stroke={T.isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 17, 21, 0.08)'}
                  strokeWidth={1.5}
                  strokeDasharray="4,4"
                />
                
                {/* Glow Dot Concentric Rings */}
                <Circle cx={lastPoint.x} cy={lastPoint.y} r={10} fill={`${T.primary}22`} />
                <Circle cx={lastPoint.x} cy={lastPoint.y} r={7} fill="none" stroke={T.isDarkMode ? 'rgba(255, 255, 255, 0.45)' : 'rgba(15, 17, 21, 0.3)'} strokeWidth={1.5} />
                <Circle cx={lastPoint.x} cy={lastPoint.y} r={4.5} fill={T.primary} />
              </Svg>
            </View>
            <View style={[styles.chartFooter, { borderTopColor: T.border }]}>
              <Ionicons name="warning-outline" size={13} color={T.warning} />
              <Text style={[styles.chartNote, { color: T.warning }]}>
                Sales dip detected in weeks 6–8
              </Text>
            </View>
          </View>
        )}

        {/* Recent Alerts */}
        <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>RECENT ALERTS</Text>
        <AlertCard
          title="High CPC Detected"
          description="Facebook Ads CPC increased by 40% in the last 24h."
          severity="medium"
        />
        <AlertCard
          title="Inventory Critical"
          description="Product Y stock will deplete in 2 days at current velocity."
          severity="high"
        />

        {/* Brand Persona Chip (if set) */}
        {userProfile?.brand_persona && (
          <View style={[styles.personaChip, { backgroundColor: T.pillBg, borderColor: `${T.primary}30` }]}>
            <Ionicons name="sparkles" size={13} color={T.primary} />
            <Text style={[styles.personaText, { color: T.primary }]} numberOfLines={1}>
              {userProfile.brand_persona}
            </Text>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: T.primary, shadowColor: T.primary }]}
          onPress={() => navigation.navigate('Upload')}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.ctaBtnText}>Start New Analysis</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Interactive Bottom Sheet Alerts Modal */}
      <Modal
        visible={alertModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAlertModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity 
            style={styles.modalDismissArea} 
            activeOpacity={1} 
            onPress={() => setAlertModalVisible(false)}
          />
          <View style={[styles.modalSheet, T.cardLg, { backgroundColor: T.bg, borderTopColor: T.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <Ionicons name="notifications" size={20} color={T.warning} />
                <Text style={[styles.modalTitle, { color: T.text }]}>LIVE COMPETITOR ALERTS</Text>
              </View>
              <TouchableOpacity onPress={() => setAlertModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={T.textSub} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {competitors ? (
                <View style={{ gap: 16 }}>
                  {competitors.competitorA?.active_deal && (
                    <View style={[styles.alertItem, { backgroundColor: T.surface, borderColor: T.border }]}>
                      <View style={styles.alertItemHeader}>
                        <View style={[styles.alertBadge, { backgroundColor: `${T.warning}15`, borderWidth: 0 }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="warning" size={14} color={T.warning} />
                            <Text style={[styles.alertBadgeText, { color: T.warning, fontSize: 10, fontWeight: '800' }]}>HIGH IMPACT</Text>
                          </View>
                        </View>
                        <Text style={[styles.alertTime, { color: T.textSub }]}>~20 mins ago</Text>
                      </View>
                      <Text style={[styles.alertCompetitorName, { color: T.text }]}>
                        {competitors.competitorA.name}
                      </Text>
                      <Text style={[styles.alertDealText, { color: T.textSub }]}>
                        {competitors.competitorA.active_deal}
                      </Text>
                      <Text style={[styles.alertImpactText, { color: T.textSub }]}>
                        {competitors.competitorA.impact}
                      </Text>
                    </View>
                  )}

                  {competitors.competitorB?.active_deal && (
                    <View style={[styles.alertItem, { backgroundColor: T.surface, borderColor: T.border }]}>
                      <View style={styles.alertItemHeader}>
                        <View style={[styles.alertBadge, { backgroundColor: `${T.warning}15`, borderWidth: 0 }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="warning" size={14} color={T.warning} />
                            <Text style={[styles.alertBadgeText, { color: T.warning, fontSize: 10, fontWeight: '800' }]}>HIGH IMPACT</Text>
                          </View>
                        </View>
                        <Text style={[styles.alertTime, { color: T.textSub }]}>~20 mins ago</Text>
                      </View>
                      <Text style={[styles.alertCompetitorName, { color: T.text }]}>
                        {competitors.competitorB.name}
                      </Text>
                      <Text style={[styles.alertDealText, { color: T.textSub }]}>
                        {competitors.competitorB.active_deal}
                      </Text>
                      <Text style={[styles.alertImpactText, { color: T.textSub }]}>
                        {competitors.competitorB.impact}
                      </Text>
                    </View>
                  )}

                  {/* Insight Block */}
                  <View style={[styles.modalInsightBlock, { backgroundColor: T.pillBg, borderColor: `${T.primary}30` }]}>
                    <View style={styles.insightHeader}>
                      <Ionicons name="sparkles" size={16} color={T.primary} />
                      <Text style={[styles.insightTitle, { color: T.primary }]}>AI STRATEGIC INSIGHT</Text>
                    </View>
                    <Text style={[styles.insightBody, { color: T.text }]}>
                      {competitors.ai_counter_insight}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.modalCtaBtn, { backgroundColor: T.primary }]}
                    onPress={() => {
                      setAlertModalVisible(false);
                      handleAutoGenerateCounter();
                    }}
                  >
                    <Ionicons name="flash" size={18} color="#fff" />
                    <Text style={styles.modalCtaText}>Generate Counter Campaign</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="shield-checkmark" size={48} color={T.success} />
                  <Text style={[styles.modalEmptyTitle, { color: T.text }]}>All Quiet on the Front</Text>
                  <Text style={[styles.modalEmptySubtitle, { color: T.textSub }]}>
                    No active competitor ad alerts detected in your niche at the moment.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap:       { flex: 1 },
  container:  { flex: 1 },
  content:    { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  headerLeft: { flex: 1, marginRight: 12 },
  greeting:   { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, marginBottom: 2 },
  titleLine:  { fontSize: 26, fontWeight: '800', letterSpacing: 0.2 },
  nicheTagline: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn:    {
    width: 40, height: 40, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  logoCircle: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },

  statsRow:   { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard:   { flex: 1, padding: 18, alignItems: 'center', borderWidth: 0 },
  statValue:  { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  chartCard:  { padding: 24, marginBottom: 28, borderWidth: 0 },
  chartHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chartTitle: { fontSize: 18, fontWeight: '700' },
  chartBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  chartBadgeText: { fontSize: 12, fontWeight: '600' },
  chartContainer: { height: 100, marginBottom: 18, justifyContent: 'center', alignItems: 'center' },
  chartFooter:{ flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, paddingTop: 14 },
  chartNote:  { fontSize: 12, fontWeight: '600' },

  sectionLabel:{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },

  personaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1,
    marginBottom: 24,
  },
  personaText: { fontSize: 12, fontWeight: '700', maxWidth: 220 },

  ctaBtn: {
    paddingVertical: 18, borderRadius: 32,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
  },
  ctaBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  competitorGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  compCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  compCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  compName: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginRight: 4
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4
  },
  liveIndicatorText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#34C759',
    letterSpacing: 0.3
  },
  compSectionTitle: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  compText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    lineHeight: 16
  },
  insightBlock: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  insightTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  insightBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500'
  },
  counterCtaBtn: {
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  counterCtaBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  },
  compLoadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  compLoadingText: {
    fontSize: 13,
    fontWeight: '600'
  },
  compErrorContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10
  },
  compErrorText: {
    fontSize: 13,
    fontWeight: '600'
  },
  retryBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12
  },
  competitorCard: {
    padding: 24,
    marginBottom: 28,
    borderWidth: 0
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '80%',
    borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalContent: {
    marginBottom: 10,
  },
  alertItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  alertItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertCompetitorName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  alertDealText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  alertImpactText: {
    fontSize: 12,
    lineHeight: 16,
  },
  alertTime: {
    fontSize: 10,
    fontWeight: '600',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6
  },
  alertBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  modalInsightBlock: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  modalCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 30,
  },
  modalCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  modalEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalEmptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
