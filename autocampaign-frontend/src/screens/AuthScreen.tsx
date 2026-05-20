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

const InputField = ({
  icon, placeholder, value, onChangeText,
  keyboardType, secureTextEntry, autoCapitalize, editable
}: any) => {
  const T = useTheme();
  return (
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
        editable={editable}
      />
    </View>
  );
};

export const AuthScreen = () => {
  const T       = useTheme();
  const login   = useUserStore(state => state.login);
  const [activeTab, setActiveTab]       = useState<'login' | 'signup'>('login');
  const [loading, setLoading]           = useState(false);
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [businessName, setBusinessName] = useState('');
  const [websiteUrl, setWebsiteUrl]     = useState('');
  const [businessType, setBusinessType] = useState('');
  const [products, setProducts]         = useState('');
  const [applyBrandTheme, setApplyBrandTheme] = useState(true);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Required Fields', 'Please fill in your Email and Password.');
      return;
    }
    if (activeTab === 'signup' && (!businessName || !websiteUrl || !businessType || !products)) {
      Alert.alert('Required Fields', 'Please enter your Business Name, Website URL, Industry Niche, and Main Products.');
      return;
    }
    setLoading(true);
    try {
      if (activeTab === 'login') {
        const response = await loginUser(email, password);
        if (response.status === 'success') login(response.user);
      } else {
        const response = await registerUser(email, password, businessName, websiteUrl, applyBrandTheme, businessType, products);
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
      console.error("Auth Error:", error);
      let msg = 'Authentication failed. Please check credentials.';
      const targetUrl = error.config?.baseURL || 'http://192.168.100.33:8000';
      
      if (error.response?.data?.detail) {
        msg = typeof error.response.data.detail === 'string'
          ? error.response.data.detail
          : JSON.stringify(error.response.data.detail);
      } else if (error.message && error.message.toLowerCase().includes('network')) {
        msg = `Network connection failed.\n\nPlease verify that your backend server is running and accessible at:\n${targetUrl}\n\nAlso check that both your dev machine and mobile device are on the same Wi-Fi network and that port 8000 is open.`;
      } else if (!error.response) {
        msg = `Unable to reach the server.\n\nPlease check your internet connection and ensure the backend is running at:\n${targetUrl}`;
      }
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };



  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: T.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar
        barStyle={T.isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={T.bg}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

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
              style={[
                styles.tabButton,
                activeTab === tab && [styles.activeTabButton, { backgroundColor: T.surfaceCard }]
              ]}
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
        <View style={[styles.card, T.cardLg, T.shadow]}>

          <Text style={[styles.fieldLabel, { color: T.textSub }]}>Email Address</Text>
          <InputField icon="mail-outline" placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" editable={!loading} />

          <Text style={[styles.fieldLabel, { color: T.textSub }]}>Password</Text>
          <InputField icon="lock-closed-outline" placeholder="Your password" value={password} onChangeText={setPassword} secureTextEntry editable={!loading} />

          {activeTab === 'signup' && (
            <>
              <Text style={[styles.fieldLabel, { color: T.textSub }]}>Business Name</Text>
              <InputField icon="business-outline" placeholder="e.g. Sizzling Pizza DHA" value={businessName} onChangeText={setBusinessName} autoCapitalize="words" editable={!loading} />

              <Text style={[styles.fieldLabel, { color: T.textSub }]}>Website URL</Text>
              <InputField icon="globe-outline" placeholder="https://yourbrand.pk" value={websiteUrl} onChangeText={setWebsiteUrl} keyboardType="url" editable={!loading} />

              <Text style={[styles.fieldLabel, { color: T.textSub }]}>Niche / Industry</Text>
              <InputField icon="pricetags-outline" placeholder="e.g. Fashion, Food, Footwear, Tech, Beauty" value={businessType} onChangeText={setBusinessType} editable={!loading} />

              <Text style={[styles.fieldLabel, { color: T.textSub }]}>Main Products</Text>
              <InputField icon="cart-outline" placeholder="e.g. Lawn, Kurta, Pizza, Burgers, Shoes" value={products} onChangeText={setProducts} editable={!loading} />

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
  headerBlock:    { alignItems: 'center', marginBottom: 28 },
  logoContainer:  {
    width: 76, height: 76, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 16,
  },
  appTitle:       { fontSize: 28, fontWeight: '800', letterSpacing: 0.4 },
  appSubtitle:    { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  tabContainer:   {
    flexDirection: 'row', borderRadius: 99, padding: 5,
    marginBottom: 24, borderWidth: 1,
  },
  tabButton:      { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 99 },
  activeTabButton:{},
  tabText:        { fontSize: 14, fontWeight: '700' },
  card:           { padding: 24, borderWidth: 0 },
  fieldLabel:     {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.6,
    textTransform: 'uppercase', marginBottom: 8, marginTop: 16,
  },
  inputWrapper:   {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 24, borderWidth: 1, paddingHorizontal: 16, marginBottom: 2,
  },
  inputIcon:      { marginRight: 10 },
  input:          { flex: 1, height: 52, fontSize: 14 },
  toggleRow:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 24, paddingTop: 20, borderTopWidth: 1, gap: 12,
  },
  toggleTextBlock:{ flex: 1 },
  toggleTitle:    { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  toggleSubtitle: { fontSize: 12, lineHeight: 16 },
  actionBtn:      {
    borderRadius: 32, height: 58, alignItems: 'center', justifyContent: 'center', marginTop: 28,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
  },
  actionBtnText:  { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  scrapingBox:    { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingHorizontal: 4 },
  scrapingLoader: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
});
