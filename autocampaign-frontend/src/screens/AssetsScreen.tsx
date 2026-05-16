import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { useCampaignStore } from '../store/campaignStore';
import { Ionicons } from '@expo/vector-icons';

export const AssetsScreen = () => {
  const navigation = useNavigation<any>();
  const { assets } = useCampaignStore();
  const [lang, setLang] = useState<'english' | 'urdu'>('urdu');

  if (!assets) return null;
  const { ad_copy, image_url, image_prompt } = assets;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Creative Assets</Text>
      <Text style={styles.subtitle}>Agent 3 Generated Content</Text>

      {/* Image */}
      <Text style={styles.sectionLabel}>AI AD IMAGE</Text>
      <View style={styles.imageCard}>
        {image_url ? (
          <Image source={{ uri: image_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.imagePlaceholderText}>Generating image...</Text>
          </View>
        )}
        {image_prompt ? (
          <View style={styles.promptBox}>
            <Text style={styles.promptText}>🎨 {image_prompt}</Text>
          </View>
        ) : null}
      </View>

      {/* Language Toggle */}
      <Text style={styles.sectionLabel}>AD COPY</Text>
      <View style={styles.langToggle}>
        {(['urdu', 'english'] as const).map(l => (
          <TouchableOpacity key={l} style={[styles.langBtn, lang === l && styles.langBtnActive]} onPress={() => setLang(l)} activeOpacity={0.8}>
            <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
              {l === 'urdu' ? 'اردو' : 'English'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Copy Card */}
      <View style={styles.copyCard}>
        <Text style={styles.copyMeta}>HEADLINE</Text>
        <Text style={[styles.headline, lang === 'urdu' && { textAlign: 'right' }]}>
          {lang === 'urdu' ? ad_copy.headline_urdu : ad_copy.headline_english}
        </Text>
        <View style={styles.copyDivider} />
        <Text style={styles.copyMeta}>BODY</Text>
        <Text style={[styles.bodyText, lang === 'urdu' && { textAlign: 'right' }]}>
          {lang === 'urdu' ? ad_copy.body_urdu : ad_copy.body_english}
        </Text>
        <TouchableOpacity style={styles.ctaMock} activeOpacity={0.8}>
          <Text style={styles.ctaText}>{lang === 'urdu' ? ad_copy.cta_urdu : ad_copy.cta_english}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.proceedBtn} onPress={() => navigation.navigate('Approval')} activeOpacity={0.85}>
        <Text style={styles.proceedBtnText}>Proceed to Approval</Text>
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
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textSecondary,
    letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 10,
  },

  imageCard: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 24,
  },
  image: { width: '100%', height: 200 },
  imagePlaceholder: { height: 180, justifyContent: 'center', alignItems: 'center', gap: 10 },
  imagePlaceholderText: { color: Colors.textTertiary, fontSize: 14 },
  promptBox: { padding: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  promptText: { color: Colors.textSecondary, fontSize: 12, fontStyle: 'italic' },

  langToggle: {
    flexDirection: 'row', backgroundColor: Colors.surfaceHigh,
    borderRadius: 12, padding: 4, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  langBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  langBtnActive: { backgroundColor: Colors.primary },
  langBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  langBtnTextActive: { color: '#fff' },

  copyCard: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 20,
  },
  copyMeta: {
    fontSize: 10, fontWeight: '700', color: Colors.primary,
    letterSpacing: 1.2, marginBottom: 6,
  },
  headline: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 12 },
  copyDivider: { height: 1, backgroundColor: Colors.borderLight, marginBottom: 12 },
  bodyText: { color: Colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 20 },
  ctaMock: {
    backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 24, alignSelf: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  proceedBtn: {
    backgroundColor: Colors.success, paddingVertical: 17, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  proceedBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
