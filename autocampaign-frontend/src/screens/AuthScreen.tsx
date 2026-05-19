import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Switch, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/useTheme';
import { registerUser, loginUser } from '../api/api';

export const AuthScreen = () => {
  const T       = useTheme();
  const login   = useUserStore(state => state.login);
  const [activeTab, setActiveTab]       = useState<'login' | 'signup'>('login');
  const [loading, setLoading]           = useState(false);
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [businessName, setBusinessName] = useState('');
  const [websiteUrl, setWebsiteUrl]     = useState('');
  const [applyBrandTheme, setApplyBrandTheme] = useState(true);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Required Fields', 'Please fill in your Email and Password.');
      return;
    }
    if (activeTab === 'signup' && (!businessName || !websiteUrl)) {
      Alert.alert('Required Fields', 'Please enter your Business Name and Website URL.');
      return;
    }
    setLoading(true);
    try {
      if (activeTab === 'login') {
        const response = await loginUser(email, password);
        if (response.status === 'success') login(response.user);
      } else {
        const response = await registerUser(email, password, businessName, websiteUrl, applyBrandTheme);
        if (response.status === 'success') {
          login(response.user);
          if (applyBrandTheme) {
            Alert.alert(
              '🎨 Brand Profile Created!',
              `Color: ${response.user.brand_color}\nPersona: ${response.user.brand_persona}`
            );
          } else {
            Alert.alert('✅ Account Created!', `Welcome, ${response.user.business_name}!`);
          }
        }
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Authentication failed. Please check credentials.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({
    icon, placeholder, value, onChangeText,
    keyboardType, secureTextEntry, autoCapitalize
  }: any) => (
    <View style={[styles.inputWrapper, {
      backgroundColor: T.surfaceCard,
      borderColor: T.border,
    }]}>
      <Ionicons name={icon} size={18} color={T.textSub} style={styles.inputIcon} />
      <TextInput
        style={[styles.input, { color: T.text }]}
        placeholder={placeholder}
        placeholderTextColor={T.textTertiary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'none'}
        editable={!loading}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: T.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar
        barStyle={T.isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={T.bg}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.headerBlock}>
          <View style={[styles.logoContainer, { backgroundColor: T.pillBg, borderColor: `${T.primary}28` }]}>
            <Ionicons name="sparkles" size={34} color={T.primary} />
          </View>
          <Text style={[styles.appTitle, { color: T.text }]}>AutoCampaign AI</Text>
          <Text style={[styles.appSubtitle, { color: T.textSub }]}>
            Autonomous Trend-Aware Marketing & Dispatch
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabContainer, { backgroundColor: T.surface, borderColor: T.border }]}>
          {(['login', 'signup'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && [styles.activeTabButton, { backgroundColor: T.surfaceCard }]]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? T.primary : T.textSub }]}>
                {tab === 'login' ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form Card */}
        <View style={[styles.card, T.card, T.shadow]}>

          <Text style={[styles.fieldLabel, { color: T.textSub }]}>Email Address</Text>
          <InputField icon="mail-outline" placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" />

          <Text style={[styles.fieldLabel, { color: T.textSub }]}>Password</Text>
          <InputField icon="lock-closed-outline" placeholder="Your password" value={password} onChangeText={setPassword} secureTextEntry />

          {activeTab === 'signup' && (
            <>
              <Text style={[styles.fieldLabel, { color: T.textSub }]}>Business Name</Text>
              <InputField icon="business-outline" placeholder="e.g. Sizzling Pizza DHA" value={businessName} onChangeText={setBusinessName} autoCapitalize="words" />

              <Text style={[styles.fieldLabel, { color: T.textSub }]}>Website URL</Text>
              <InputField icon="globe-outline" placeholder="https://yourbrand.pk" value={websiteUrl} onChangeText={setWebsiteUrl} keyboardType="url" />

              {/* Brand Theme Toggle */}
              <View style={[styles.toggleRow, { borderTopColor: T.border }]}>
                <View style={styles.toggleTextBlock}>
                  <Text style={[styles.toggleTitle, { color: T.text }]}>✨ Match App Theme with Brand Colors</Text>
                  <Text style={[styles.toggleSubtitle, { color: T.textSub }]}>
                    {applyBrandTheme
                      ? 'Gemini will analyze your website & generate a custom brand palette.'
                      : 'The app will use the premium default dark theme.'}
                  </Text>
                </View>
                <Switch
                  value={applyBrandTheme}
                  onValueChange={setApplyBrandTheme}
                  trackColor={{ false: T.surfaceCard, true: `${T.primary}66` }}
                  thumbColor={applyBrandTheme ? T.primary : T.textTertiary}
                  disabled={loading}
                />
              </View>
            </>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: T.primary, shadowColor: T.primary }, loading && { opacity: 0.8 }]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={styles.actionBtnText}>
                  {activeTab === 'login' ? 'Sign In →' : applyBrandTheme ? '🎨 Deduce Brand & Register' : '🚀 Register'}
                </Text>
            }
          </TouchableOpacity>
        </View>

        {activeTab === 'signup' && loading && applyBrandTheme && (
          <View style={styles.scrapingBox}>
            <ActivityIndicator size="small" color={T.warning} style={{ marginRight: 10 }} />
            <Text style={[styles.scrapingLoader, { color: T.warning }]}>
              🔮 Gemini is scanning your website to deduce brand color palette and persona...
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1 },
  scrollContainer:{ flexGrow: 1, justifyContent: 'center', padding: 24 },
  headerBlock:    { alignItems: 'center', marginBottom: 32 },
  logoContainer:  {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 16,
  },
  appTitle:       { fontSize: 27, fontWeight: '800', letterSpacing: 0.4 },
  appSubtitle:    { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  tabContainer:   {
    flexDirection: 'row', borderRadius: 14, padding: 4,
    marginBottom: 20, borderWidth: 1,
  },
  tabButton:      { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTabButton:{},
  tabText:        { fontSize: 14, fontWeight: '700' },
  card:           { padding: 20 },
  fieldLabel:     {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.6,
    textTransform: 'uppercase', marginBottom: 8, marginTop: 16,
  },
  inputWrapper:   {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, marginBottom: 2,
  },
  inputIcon:      { marginRight: 10 },
  input:          { flex: 1, height: 48, fontSize: 14 },
  toggleRow:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 20, paddingTop: 18, borderTopWidth: 1, gap: 12,
  },
  toggleTextBlock:{ flex: 1 },
  toggleTitle:    { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  toggleSubtitle: { fontSize: 12, lineHeight: 16 },
  actionBtn:      {
    borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 24,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  actionBtnText:  { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  scrapingBox:    { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingHorizontal: 4 },
  scrapingLoader: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '500' },
});
