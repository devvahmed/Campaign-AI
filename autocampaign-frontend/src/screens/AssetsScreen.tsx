import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Linking, Share, ActivityIndicator, Alert, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCampaignStore } from '../store/campaignStore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { useUserStore } from '../store/userStore';
import { approveCampaign, approveCampaignMultipart } from '../api/api';
import * as DocumentPicker from 'expo-document-picker';

export const AssetsScreen = () => {
  const navigation = useNavigation<any>();
  const T = useTheme();
  const { assets, strategy, budget, jobId } = useCampaignStore();
  const userProfile = useUserStore(state => state.userProfile);
  const [lang, setLang] = useState<'english' | 'urdu'>('urdu');
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Broadcast states
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [parsedEmailCount, setParsedEmailCount] = useState(0);

  const handleEmailBroadcast = async () => {
    if (!jobId || !strategy) return;
    try {
      // Step 1: Open the OS file picker for CSV files
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      // User cancelled the picker
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedFile = result.assets[0];
      const fileUri = selectedFile.uri;
      const fileName = selectedFile.name || 'emails.csv';

      setBroadcasting(true);
      setBroadcastStatus('idle');

      // Step 2: Read and parse the CSV to verify email content locally
      let parsedEmails: string[] = [];
      try {
        const fileResponse = await fetch(fileUri);
        const fileText = await fileResponse.text();
        // Parse CSV: extract anything that looks like an email
        const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
        const matches = fileText.match(emailRegex);
        if (matches) {
          parsedEmails = [...new Set(matches)]; // deduplicate
        }
      } catch (parseErr) {
        console.warn('[AssetsScreen] Local CSV parse warning:', parseErr);
      }

      setParsedEmailCount(parsedEmails.length);

      if (parsedEmails.length === 0) {
        Alert.alert('No Emails Found', 'The selected CSV file does not contain any valid email addresses. Please select a valid CSV file.');
        setBroadcasting(false);
        return;
      }

      // Step 3: Package into FormData for multipart upload
      const formData = new FormData();
      formData.append('job_id', jobId);
      formData.append('budget', String(budget));
      formData.append('strategy', JSON.stringify(strategy));

      if (assets?.ad_copy) formData.append('ad_copy', JSON.stringify(assets.ad_copy));
      if (assets?.image_url) formData.append('image_url', assets.image_url);
      if (assets?.video_url) formData.append('video_url', assets.video_url);
      if (userProfile?.business_name) formData.append('business_name', userProfile.business_name);
      if (userProfile?.brand_color) formData.append('brand_color', userProfile.brand_color);
      if (userProfile?.website_url) formData.append('website_url', userProfile.website_url);

      // Attach the CSV file
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: 'text/csv',
      } as any);

      // Step 4: Submit via multipart API
      await approveCampaignMultipart(formData);
      setBroadcastStatus('success');
    } catch (err) {
      console.error('Email broadcast failure:', err);
      setBroadcastStatus('error');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleMetaAdSetup = () => {
    Linking.openURL('https://adsmanager.facebook.com/');
  };

  const handleWhatsAppShare = () => {
    if (!ad_copy) return;
    const adText = lang === 'urdu'
      ? `${ad_copy.headline_urdu}\n\n${ad_copy.body_urdu}\n\n${ad_copy.cta_urdu}`
      : `${ad_copy.headline_english}\n\n${ad_copy.body_english}\n\n${ad_copy.cta_english}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(adText)}`;
    Linking.openURL(whatsappUrl);
  };

  if (!assets) return null;
  const { ad_copy, image_url, image_prompt, video_url, video_prompt } = assets;

  const handleShare = async () => {
    try {
      const adText = lang === 'urdu'
        ? `${ad_copy.headline_urdu}\n\n${ad_copy.body_urdu}\n\n${ad_copy.cta_urdu}`
        : `${ad_copy.headline_english}\n\n${ad_copy.body_english}\n\n${ad_copy.cta_english}`;
      await Share.share({ message: adText });
    } catch (error) {
      console.error(error);
    }
  };

  const isImageAvailable = image_url && !imageError;

  return (
    <ScrollView style={[styles.container, { backgroundColor: T.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: T.text }]}>AI Ad Assets</Text>
          <Text style={[styles.subtitle, { color: T.textSub }]}>Pakistani Trend-Driven Campaign 🇵🇰</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: T.success }]}>
          <Text style={styles.badgeText}>LIVE</Text>
        </View>
      </View>

      {/* ── Image Section ─────────────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>📸 AI AD IMAGE</Text>
      <View style={[styles.imageCard, T.cardLg, T.shadow]}>
        {image_url && !imageError ? (
          <>
            {imageLoading && (
              <View style={[styles.imageLoadingOverlay, { backgroundColor: T.surface }]}>
                <ActivityIndicator size="large" color={T.primary} />
                <Text style={[styles.imageLoadingText, { color: T.textSub }]}>Generating Pakistani Ad...</Text>
              </View>
            )}
            <Image
              source={{ uri: image_url }}
              style={[styles.image, imageLoading && { opacity: 0 }]}
              resizeMode="cover"
              onLoad={() => setImageLoading(false)}
              onError={(e) => {
                console.log('[AssetsScreen] Image load error:', e.nativeEvent.error, 'URL:', image_url);
                setImageError(true);
                setImageLoading(false);
              }}
            />
          </>
        ) : (
          <View style={styles.imageFallback}>
            {/* Decorative Pakistani-themed placeholder */}
            <View style={styles.fallbackGradient}>
              <Text style={styles.fallbackEmoji}>🇵🇰</Text>
              <Text style={styles.fallbackTitle}>Pakistan Ka #1 Ad</Text>
              <Text style={styles.fallbackSubtitle}>
                {ad_copy?.headline_urdu || 'AI Ad Generation'}
              </Text>
              <View style={styles.fallbackBadge}>
                <Text style={styles.fallbackBadgeText}>15% OFF</Text>
              </View>
              <Text style={styles.fallbackCta}>
                {ad_copy?.cta_urdu || 'Abhi Order Karein!'}
              </Text>
              {imageError && (
                <Text style={styles.fallbackNote}>
                  Image URL: {image_url ? '✓ Generated' : '✗ Pending'}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {image_url ? (
          <TouchableOpacity
            style={[styles.actionBtn, T.card, T.shadow]}
            onPress={() => Linking.openURL(image_url)}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={16} color={T.primary} />
            <Text style={[styles.actionBtnText, { color: T.text }]}>Open Image</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={[styles.actionBtn, T.card, T.shadow]} onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={16} color={T.primary} />
          <Text style={[styles.actionBtnText, { color: T.text }]}>Share Copy</Text>
        </TouchableOpacity>
      </View>

      {/* ── Video Section ─────────────────────────────────────── */}
      {video_url ? (
        <>
          <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>🎥 AI AD VIDEO</Text>
          <TouchableOpacity 
            style={[styles.videoPlaceholderCard, T.cardLg, T.shadow, { height: 260, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}
            activeOpacity={0.9}
            onPress={() => Linking.openURL(video_url)}
          >
            {image_url ? (
               <Image source={{ uri: image_url }} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.7 }} resizeMode="cover" />
            ) : null}
            <Ionicons name="play-circle" size={64} color={T.primary} style={{ zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 }} />
          </TouchableOpacity>

          {/* Video Actions Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, T.card, T.shadow]}
              onPress={() => Linking.openURL(video_url)}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-chrome" size={16} color={T.primary} />
              <Text style={[styles.actionBtnText, { color: T.text }]}>Open Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, T.card, T.shadow]}
              onPress={async () => {
                try {
                  await Share.share({ message: `Check out our AI Campaign Video: ${video_url}` });
                } catch (e) {
                  console.error(e);
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={16} color={T.primary} />
              <Text style={[styles.actionBtnText, { color: T.text }]}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {/* ── Ad Copy Section ────────────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>📝 AD COPY</Text>

      {/* Language Toggle */}
      <View style={[styles.langToggle, { backgroundColor: T.surfaceCard, borderColor: T.border }]}>
        {(['urdu', 'english'] as const).map(l => (
          <TouchableOpacity
            key={l}
            style={[styles.langBtn, lang === l && { backgroundColor: T.primary }]}
            onPress={() => setLang(l)}
            activeOpacity={0.8}
          >
            <Text style={[styles.langBtnText, { color: lang === l ? T.primaryText : T.textSub }]}>
              {l === 'urdu' ? '🇵🇰 Roman Urdu' : '🇬🇧 English'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Copy Card */}
      <View style={[styles.copyCard, T.cardLg, T.shadow]}>
        <View style={styles.copySection}>
          <Text style={[styles.copyMeta, { color: T.primary }]}>HEADLINE</Text>
          <Text style={[styles.headline, { color: T.text }, lang === 'urdu' && styles.rtlText]}>
            {lang === 'urdu' ? ad_copy.headline_urdu : ad_copy.headline_english}
          </Text>
        </View>

        <View style={[styles.copyDivider, { backgroundColor: T.border }]} />

        <View style={styles.copySection}>
          <Text style={[styles.copyMeta, { color: T.primary }]}>BODY COPY</Text>
          <Text style={[styles.bodyText, { color: T.textSub }, lang === 'urdu' && styles.rtlText]}>
            {lang === 'urdu' ? ad_copy.body_urdu : ad_copy.body_english}
          </Text>
        </View>

        <View style={[styles.copyDivider, { backgroundColor: T.border }]} />

        {/* CTA Button */}
        <TouchableOpacity style={[styles.ctaButton, { backgroundColor: T.primary }]} activeOpacity={0.8}>
          <Text style={[styles.ctaText, { color: T.primaryText }]}>
            {lang === 'urdu' ? ad_copy.cta_urdu : ad_copy.cta_english}
          </Text>
        </TouchableOpacity>
      </View>

      {/* All 3 variants preview */}
      <Text style={[styles.sectionLabel, { color: T.textTertiary }]}>🔀 ALL AD COPY VARIANTS</Text>
      <View style={[styles.variantsCard, T.cardLg, T.shadow]}>
        <View style={[styles.variantRow, { borderBottomColor: T.border }]}>
          <Text style={[styles.variantLabel, { color: T.textSub }]}>Headline (Urdu)</Text>
          <Text style={[styles.variantValue, { color: T.text }]}>{ad_copy.headline_urdu}</Text>
        </View>
        <View style={[styles.variantRow, { borderBottomColor: T.border }]}>
          <Text style={[styles.variantLabel, { color: T.textSub }]}>Headline (EN)</Text>
          <Text style={[styles.variantValue, { color: T.text }]}>{ad_copy.headline_english}</Text>
        </View>
        <View style={[styles.variantRow, { borderBottomColor: T.border }]}>
          <Text style={[styles.variantLabel, { color: T.textSub }]}>CTA (Urdu)</Text>
          <Text style={[styles.variantValue, { color: T.text }]}>{ad_copy.cta_urdu}</Text>
        </View>
        <View style={[styles.variantRow, { borderBottomColor: 'transparent' }]}>
          <Text style={[styles.variantLabel, { color: T.textSub }]}>CTA (EN)</Text>
          <Text style={[styles.variantValue, { color: T.text }]}>{ad_copy.cta_english}</Text>
        </View>
      </View>

      {/* Proceed Button */}
      <TouchableOpacity
        style={[styles.proceedBtn, { backgroundColor: T.success, shadowColor: T.success }]}
        onPress={() => navigation.navigate('Approval')}
        activeOpacity={0.85}
      >
        <Text style={styles.proceedBtnText}>Proceed to Approval</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>

      {/* 🚀 Campaign Distribution Panel */}
      <Text style={[styles.sectionLabel, { color: T.textTertiary, marginTop: 24 }]}>🚀 CAMPAIGN DISTRIBUTION PANEL</Text>
      <View style={[styles.distributionCard, T.cardLg, T.shadow]}>
        <Text style={[styles.distributionDesc, { color: T.textSub }]}>
          Apne assets ko dynamic channels par distribute karein:
        </Text>

        {/* Email Broadcast Button */}
        <TouchableOpacity
          style={[styles.distBtn, { backgroundColor: T.primary }]}
          onPress={handleEmailBroadcast}
          disabled={broadcasting}
          activeOpacity={0.8}
        >
          {broadcasting ? (
            <ActivityIndicator size="small" color={T.primaryText} style={{ marginRight: 6 }} />
          ) : (
            <Ionicons name="mail" size={18} color={T.primaryText} style={{ marginRight: 6 }} />
          )}
          <Text style={[styles.distBtnText, { color: T.primaryText }]}>
            {broadcasting ? "Broadcasting Email..." : "Launch Email Broadcast"}
          </Text>
        </TouchableOpacity>

        {/* Broadcast Status feedback message */}
        {broadcastStatus === 'success' && (
          <View style={[styles.statusMsgBox, { backgroundColor: '#34C75918', borderColor: '#34C75940' }]}>
            <Ionicons name="checkmark-circle" size={14} color="#34C759" />
            <Text style={[styles.statusMsgText, { color: '#34C759' }]}>
              {parsedEmailCount > 0
                ? `${parsedEmailCount} emails parsed & broadcast dispatched via Resend!`
                : 'Emails broadcast successfully via Resend!'}
            </Text>
          </View>
        )}
        {broadcastStatus === 'error' && (
          <View style={[styles.statusMsgBox, { backgroundColor: '#FF3B3018', borderColor: '#FF3B3040' }]}>
            <Ionicons name="alert-circle" size={14} color="#FF3B30" />
            <Text style={[styles.statusMsgText, { color: '#FF3B30' }]}>Email broadcast failed. Backend status error.</Text>
          </View>
        )}

        {/* Meta Ads Manager Redirect */}
        <TouchableOpacity
          style={[styles.distBtn, { backgroundColor: '#1877F2', marginTop: 12 }]}
          onPress={handleMetaAdSetup}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-facebook" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.distBtnText}>Launch Meta Ad Setup (Facebook)</Text>
        </TouchableOpacity>

        {/* WhatsApp Dispatch */}
        <TouchableOpacity
          style={[styles.distBtn, { backgroundColor: '#25D366', marginTop: 12 }]}
          onPress={handleWhatsAppShare}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.distBtnText}>Share Copy via WhatsApp</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { fontSize: 14, marginTop: 3 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700',
    letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 12, marginTop: 4,
  },

  // ── Image ─────────────────────────────────────────────────────
  imageCard: {
    overflow: 'hidden',
    marginBottom: 16,
    minHeight: 260,
    borderWidth: 0,
  },
  image: { width: '100%', height: 300 },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    gap: 12,
    minHeight: 260,
  },
  imageLoadingText: { fontSize: 14, fontWeight: '600' },

  imageFallback: {
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fallbackGradient: {
    width: '100%',
    backgroundColor: '#1E3A8A',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  fallbackEmoji: { fontSize: 48 },
  fallbackTitle: {
    fontSize: 22, fontWeight: '800', color: '#ffffff',
    textAlign: 'center',
  },
  fallbackSubtitle: {
    fontSize: 14, color: '#93C5FD',
    textAlign: 'center', lineHeight: 20,
  },
  fallbackBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24, paddingVertical: 8,
    borderRadius: 20,
  },
  fallbackBadgeText: { color: '#1E1B4B', fontWeight: '900', fontSize: 20 },
  fallbackCta: {
    fontSize: 16, fontWeight: '700', color: '#86EFAC',
    textAlign: 'center',
  },
  fallbackNote: {
    fontSize: 11, color: '#94A3B8', marginTop: 4,
  },

  // ── Action Buttons ────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 0,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },

  // ── Video Card ─────────────────────────────────────────────
  videoPlaceholderCard: {
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 0,
  },
  videoGradient: {
    paddingVertical: 45,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  playCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  playText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  playSub: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Language Toggle ───────────────────────────────────────────
  langToggle: {
    flexDirection: 'row',
    borderRadius: 99, padding: 5, marginBottom: 16,
    borderWidth: 1,
  },
  langBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 99 },
  langBtnText: { fontWeight: '700', fontSize: 13 },

  // ── Copy Card ─────────────────────────────────────────────────
  copyCard: {
    padding: 24, marginBottom: 24, borderWidth: 0,
  },
  copySection: { marginBottom: 4 },
  copyMeta: {
    fontSize: 10, fontWeight: '800',
    letterSpacing: 1.3, marginBottom: 8,
  },
  headline: {
    fontSize: 22, fontWeight: '800',
    lineHeight: 30, marginBottom: 12,
  },
  copyDivider: { height: 1, marginVertical: 16 },
  bodyText: {
    fontSize: 15, lineHeight: 24, marginBottom: 16,
  },
  rtlText: { textAlign: 'right' },
  ctaButton: {
    paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 24, alignSelf: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // ── Variants Card ─────────────────────────────────────────────
  variantsCard: {
    marginBottom: 24, overflow: 'hidden', borderWidth: 0,
  },
  variantRow: {
    flexDirection: 'row', padding: 16, gap: 12,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
  },
  variantLabel: {
    width: 90, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  variantValue: {
    flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600',
  },

  // ── Proceed ───────────────────────────────────────────────────
  proceedBtn: {
    height: 58, borderRadius: 32,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 7,
  },
  proceedBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // ── Campaign Distribution Panel Styles ──────────────────────────
  distributionCard: {
    padding: 20,
    marginBottom: 24,
    borderWidth: 0,
  },
  distributionDesc: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 18,
  },
  distBtn: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  distBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  statusMsgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    gap: 6,
  },
  statusMsgText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
