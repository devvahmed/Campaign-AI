import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Linking, Share, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { useCampaignStore } from '../store/campaignStore';
import { Ionicons } from '@expo/vector-icons';

export const AssetsScreen = () => {
  const navigation = useNavigation<any>();
  const { assets } = useCampaignStore();
  const [lang, setLang] = useState<'english' | 'urdu'>('urdu');
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>AI Ad Assets</Text>
          <Text style={styles.subtitle}>Pakistani Trend-Driven Campaign 🇵🇰</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>LIVE</Text>
        </View>
      </View>

      {/* ── Image Section ─────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>📸 AI AD IMAGE</Text>
      <View style={styles.imageCard}>
        {image_url && !imageError ? (
          <>
            {imageLoading && (
              <View style={styles.imageLoadingOverlay}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.imageLoadingText}>Generating Pakistani Ad...</Text>
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
            style={styles.actionBtn}
            onPress={() => Linking.openURL(image_url)}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={16} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Open Image</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={16} color={Colors.primary} />
          <Text style={styles.actionBtnText}>Share Copy</Text>
        </TouchableOpacity>
      </View>

      {/* ── Video Section ─────────────────────────────────────── */}
      {video_url ? (
        <>
          <Text style={styles.sectionLabel}>🎥 AI AD VIDEO</Text>
          <TouchableOpacity
            style={styles.videoPlaceholderCard}
            onPress={() => Linking.openURL(video_url)}
            activeOpacity={0.9}
          >
            <View style={styles.videoGradient}>
              <View style={styles.playCircle}>
                <Ionicons name="play" size={32} color="#fff" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.playText}>Play Cinematic Promo Video</Text>
              <Text style={styles.playSub}>Tap to stream in high-end native player</Text>
            </View>
          </TouchableOpacity>



          {/* Video Actions Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(video_url)}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-chrome" size={16} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Open Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={async () => {
                try {
                  await Share.share({ message: `Check out our AI Campaign Video: ${video_url}` });
                } catch (e) {
                  console.error(e);
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={16} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {/* ── Ad Copy Section ────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>📝 AD COPY</Text>

      {/* Language Toggle */}
      <View style={styles.langToggle}>
        {(['urdu', 'english'] as const).map(l => (
          <TouchableOpacity
            key={l}
            style={[styles.langBtn, lang === l && styles.langBtnActive]}
            onPress={() => setLang(l)}
            activeOpacity={0.8}
          >
            <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
              {l === 'urdu' ? '🇵🇰 Roman Urdu' : '🇬🇧 English'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Copy Card */}
      <View style={styles.copyCard}>
        <View style={styles.copySection}>
          <Text style={styles.copyMeta}>HEADLINE</Text>
          <Text style={[styles.headline, lang === 'urdu' && styles.rtlText]}>
            {lang === 'urdu' ? ad_copy.headline_urdu : ad_copy.headline_english}
          </Text>
        </View>

        <View style={styles.copyDivider} />

        <View style={styles.copySection}>
          <Text style={styles.copyMeta}>BODY COPY</Text>
          <Text style={[styles.bodyText, lang === 'urdu' && styles.rtlText]}>
            {lang === 'urdu' ? ad_copy.body_urdu : ad_copy.body_english}
          </Text>
        </View>

        <View style={styles.copyDivider} />

        {/* CTA Button */}
        <TouchableOpacity style={styles.ctaButton} activeOpacity={0.8}>
          <Text style={styles.ctaText}>
            {lang === 'urdu' ? ad_copy.cta_urdu : ad_copy.cta_english}
          </Text>
        </TouchableOpacity>
      </View>

      {/* All 3 variants preview */}
      <Text style={styles.sectionLabel}>🔀 ALL AD COPY VARIANTS</Text>
      <View style={styles.variantsCard}>
        <View style={styles.variantRow}>
          <Text style={styles.variantLabel}>Headline (Urdu)</Text>
          <Text style={styles.variantValue}>{ad_copy.headline_urdu}</Text>
        </View>
        <View style={styles.variantRow}>
          <Text style={styles.variantLabel}>Headline (EN)</Text>
          <Text style={styles.variantValue}>{ad_copy.headline_english}</Text>
        </View>
        <View style={styles.variantRow}>
          <Text style={styles.variantLabel}>CTA (Urdu)</Text>
          <Text style={styles.variantValue}>{ad_copy.cta_urdu}</Text>
        </View>
        <View style={styles.variantRow}>
          <Text style={styles.variantLabel}>CTA (EN)</Text>
          <Text style={styles.variantValue}>{ad_copy.cta_english}</Text>
        </View>
      </View>

      {/* Proceed Button */}
      <TouchableOpacity
        style={styles.proceedBtn}
        onPress={() => navigation.navigate('Approval')}
        activeOpacity={0.85}
      >
        <Text style={styles.proceedBtnText}>Proceed to Approval</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 3 },
  badge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textSecondary,
    letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
  },

  // ── Image ─────────────────────────────────────────────────────
  imageCard: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
    minHeight: 260,
  },
  image: { width: '100%', height: 300 },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHigh,
    zIndex: 10,
    gap: 12,
    minHeight: 260,
  },
  imageLoadingText: { color: Colors.textSecondary, fontSize: 14 },

  imageFallback: {
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fallbackGradient: {
    width: '100%',
    backgroundColor: '#1e3a8a',
    borderRadius: 16,
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
    fontSize: 14, color: '#93c5fd',
    textAlign: 'center', lineHeight: 20,
  },
  fallbackBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24, paddingVertical: 8,
    borderRadius: 20,
  },
  fallbackBadgeText: { color: '#1e1b4b', fontWeight: '900', fontSize: 20 },
  fallbackCta: {
    fontSize: 16, fontWeight: '700', color: '#86efac',
    textAlign: 'center',
  },
  fallbackNote: {
    fontSize: 11, color: '#6b7280', marginTop: 4,
  },

  // ── Image Prompt ──────────────────────────────────────────────
  promptCard: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  promptLabel: {
    fontSize: 10, fontWeight: '700', color: Colors.primary,
    letterSpacing: 1, marginBottom: 6,
  },
  promptText: {
    fontSize: 12, color: Colors.textSecondary,
    lineHeight: 18, fontStyle: 'italic',
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
    backgroundColor: Colors.surfaceHigh,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionBtnText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },

  // ── Video Card ─────────────────────────────────────────────
  videoPlaceholderCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  videoGradient: {
    backgroundColor: '#1E1E2E', // Elegant slate dark background
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
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 12, padding: 4, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  langBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  langBtnActive: { backgroundColor: Colors.primary },
  langBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  langBtnTextActive: { color: '#fff' },

  // ── Copy Card ─────────────────────────────────────────────────
  copyCard: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 20,
  },
  copySection: { marginBottom: 4 },
  copyMeta: {
    fontSize: 10, fontWeight: '800', color: Colors.primary,
    letterSpacing: 1.3, marginBottom: 8,
  },
  headline: {
    color: Colors.textPrimary, fontSize: 22, fontWeight: '800',
    lineHeight: 30, marginBottom: 12,
  },
  copyDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 14 },
  bodyText: {
    color: Colors.textSecondary, fontSize: 15, lineHeight: 24, marginBottom: 16,
  },
  rtlText: { textAlign: 'right' },
  ctaButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 28, alignSelf: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // ── Variants Card ─────────────────────────────────────────────
  variantsCard: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.borderLight,
    marginBottom: 24, overflow: 'hidden',
  },
  variantRow: {
    flexDirection: 'row', padding: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    alignItems: 'flex-start',
  },
  variantLabel: {
    width: 90, fontSize: 11, fontWeight: '700',
    color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  variantValue: {
    flex: 1, fontSize: 13, color: Colors.textPrimary, lineHeight: 18,
  },

  // ── Proceed ───────────────────────────────────────────────────
  proceedBtn: {
    backgroundColor: Colors.success, paddingVertical: 17, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  proceedBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
