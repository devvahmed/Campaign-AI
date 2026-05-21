import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Switch, StatusBar, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/useTheme';
import { registerUser, loginUser } from '../api/api';

// ─────────────────────────────────────────────────────────────
//  NICHE → PRODUCTS mapping  (fully dynamic, universal)
// ─────────────────────────────────────────────────────────────
const NICHE_PRODUCT_MAP: Record<string, string[]> = {
  'Food & Restaurant': [
    'Pizza', 'Burgers', 'Shawarma', 'BBQ / Grills', 'Desi Food / Karahi',
    'Biryani', 'Wraps & Sandwiches', 'Fried Chicken', 'Sushi / Chinese',
    'Seafood', 'Family Platters', 'Breakfast Items', 'Healthy Bowls',
    'Desserts & Cakes', 'Cold Beverages', 'Hot Beverages / Chai',
  ],
  'Café & Beverages': [
    'Espresso / Americano', 'Latte / Cappuccino', 'Cold Brew', 'Chai / Karak Tea',
    'Smoothies & Shakes', 'Fresh Juices', 'Waffles', 'Pastries & Croissants',
    'Sandwiches', 'Cheesecakes', 'Iced Beverages', 'Specialty Coffee',
  ],
  'Dessert & Confectionery': [
    'Gelato / Ice Cream', 'Waffles', 'Churros', 'Cakes & Cupcakes',
    'Brownies', 'Mithai / Traditional Sweets', 'Chocolate Boxes',
    'Custom Gift Boxes', 'Cheesecakes', 'Mousse', 'Donuts', 'Macarons',
  ],
  'Fashion & Apparel': [
    'Lawn Suits', 'Unstitched Fabric', 'Stitched Pret', 'Kurtis / Kurtas',
    'Shalwar Kameez', 'Western Wear / Dresses', 'Abayas / Modest Wear',
    'Men\'s Formal', 'Men\'s Casual', 'Kids Clothing', 'Dupattas / Scarves',
    'Chiffon / Silk Collection', 'Linen Collection', 'Winter Collection',
  ],
  'Footwear': [
    'Sneakers / Sports Shoes', 'Formal Shoes', 'Heels / Pumps', 'Sandals / Slippers',
    'Boots / Ankle Boots', 'Loafers', 'Chappal / Traditional', 'Kids Shoes',
    'Outdoor / Hiking Shoes', 'Flats', 'Wedges',
  ],
  'Beauty & Cosmetics': [
    'Skincare Serums', 'Moisturizers / Creams', 'Face Wash / Cleansers',
    'Foundation / BB Cream', 'Lipsticks / Lip Gloss', 'Mascaras / Eye Makeup',
    'Perfumes / Fragrances', 'Hair Care Products', 'Nail Care', 'Organic / Herbal Skincare',
    'Sunscreens', 'Body Lotions', 'Makeup Kits / Gift Sets',
  ],
  'Electronics & Tech': [
    'Smartphones / Mobiles', 'Laptops / Tablets', 'Earphones / Earbuds',
    'Smart Watches', 'Home Appliances (AC / Fan / Fridge)', 'Smart TVs',
    'Gaming Consoles / Accessories', 'Chargers & Cables', 'Cameras',
    'Printers / Office Tech', 'Smart Home Devices',
  ],
  'Health & Fitness': [
    'Protein Supplements', 'Vitamins & Health Supplements', 'Gym Equipment',
    'Activewear / Gym Wear', 'Yoga Mats / Accessories', 'Sports Nutrition',
    'Fitness Trackers', 'Running Shoes', 'Resistance Bands', 'Health Monitors',
  ],
  'Automotive': [
    'Cars (Sedans / SUVs)', 'Electric Vehicles (EVs)', 'Motorcycles',
    'Car Accessories', 'Auto Parts / Spares', 'Car Care Products',
    'Tires & Rims', 'Car Audio / Infotainment', 'Electric Bikes',
  ],
  'Education & E-Learning': [
    'Online Courses', 'Tutoring Services', 'Books & Stationery',
    'Test Prep Programs', 'Language Learning', 'Professional Certifications',
    'Kids\' Learning Kits', 'Workshops & Seminars', 'Educational Apps',
  ],
  'Home & Furniture': [
    'Sofas / Living Room Furniture', 'Beds / Mattresses', 'Kitchen Appliances',
    'Home Décor / Accessories', 'Curtains & Blinds', 'Rugs & Carpets',
    'Lighting / Lamps', 'Storage Solutions', 'Outdoor Furniture',
  ],
  'Grocery & Supermarket': [
    'Fresh Produce / Vegetables', 'Dairy Products', 'Packaged Foods / Snacks',
    'Beverages & Juices', 'Meat & Poultry', 'Bakery Items',
    'Cleaning Supplies', 'Baby Products', 'Organic / Health Food',
  ],
  'Real Estate & Property': [
    'Residential Plots', 'Commercial Plots', 'Apartments / Flats',
    'Houses / Villas', 'Office Spaces', 'Shops / Retail Units',
    'Agricultural Land', 'Housing Schemes / Projects',
  ],
  'Jewelry & Accessories': [
    'Gold Jewelry', 'Silver Jewelry', 'Imitation / Fashion Jewelry',
    'Diamond / Precious Stones', 'Bridal Sets', 'Men\'s Accessories',
    'Watches', 'Handbags / Clutches', 'Belts & Wallets',
  ],
  'Travel & Hospitality': [
    'Flight Bookings', 'Hotel Reservations', 'Tour Packages',
    'Hajj / Umrah Packages', 'Corporate Travel', 'Event Venues',
    'Car Rentals', 'Travel Insurance', 'Cruises',
  ],
  'Digital Services': [
    'Web Development', 'Mobile App Development', 'Graphic Design',
    'Social Media Management', 'SEO / Digital Marketing', 'Video Editing',
    'Content Writing', 'IT Support / Cloud Services', 'SaaS Products',
  ],
  'Retail / E-Commerce (General)': [
    'Mixed Electronics', 'Mixed Clothing', 'Mixed Home Products',
    'Gift Items', 'Seasonal Products', 'Imported Goods', 'Wholesale Goods',
  ],
};

const ALL_NICHES = Object.keys(NICHE_PRODUCT_MAP);

// ─────────────────────────────────────────────────────────────
//  Reusable Components
// ─────────────────────────────────────────────────────────────
const InputField = ({
  icon, placeholder, value, onChangeText,
  keyboardType, secureTextEntry, autoCapitalize, editable,
}: any) => {
  const T = useTheme();
  return (
    <View style={[styles.inputWrapper, { backgroundColor: T.surfaceCard, borderColor: T.border }]}>
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

interface DropdownProps {
  icon: string;
  placeholder: string;
  value: string;
  options: string[];
  onSelect: (val: string) => void;
  disabled?: boolean;
  multiSelect?: boolean;
  selectedItems?: string[];
  onMultiSelect?: (items: string[]) => void;
}

const DropdownField = ({
  icon, placeholder, value, options, onSelect, disabled,
  multiSelect, selectedItems, onMultiSelect,
}: DropdownProps) => {
  const T = useTheme();
  const [open, setOpen] = useState(false);

  const displayValue = multiSelect && selectedItems && selectedItems.length > 0
    ? selectedItems.join(', ')
    : value;

  const toggleItem = (item: string) => {
    if (!onMultiSelect || !selectedItems) return;
    if (selectedItems.includes(item)) {
      onMultiSelect(selectedItems.filter(i => i !== item));
    } else {
      onMultiSelect([...selectedItems, item]);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.inputWrapper, {
          backgroundColor: disabled ? `${T.surfaceCard}88` : T.surfaceCard,
          borderColor: T.border,
        }]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.8}
      >
        <Ionicons name={icon as any} size={18} color={disabled ? T.textTertiary : T.textSub} style={styles.inputIcon} />
        <Text style={[styles.dropdownValue, {
          color: displayValue ? T.text : T.textTertiary,
          flex: 1,
        }]} numberOfLines={1}>
          {displayValue || placeholder}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={disabled ? T.textTertiary : T.textSub}
        />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: T.border }]}>
              <Text style={[styles.modalTitle, { color: T.text }]}>
                {multiSelect ? 'Select Products (multiple)' : placeholder}
              </Text>
              {multiSelect && selectedItems && selectedItems.length > 0 && (
                <TouchableOpacity onPress={() => onMultiSelect && onMultiSelect([])}>
                  <Text style={[styles.clearText, { color: T.primary }]}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={options}
              keyExtractor={item => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = multiSelect
                  ? selectedItems?.includes(item)
                  : value === item;
                return (
                  <TouchableOpacity
                    style={[styles.optionRow, {
                      backgroundColor: isSelected ? `${T.primary}18` : 'transparent',
                      borderBottomColor: T.border,
                    }]}
                    onPress={() => {
                      if (multiSelect) {
                        toggleItem(item);
                      } else {
                        onSelect(item);
                        setOpen(false);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optionText, { color: isSelected ? T.primary : T.text }]}>
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={T.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
            {multiSelect && (
              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: T.primary }]}
                onPress={() => setOpen(false)}
              >
                <Text style={styles.doneBtnText}>
                  Done {selectedItems && selectedItems.length > 0 ? `(${selectedItems.length} selected)` : ''}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────
//  Main Auth Screen
// ─────────────────────────────────────────────────────────────
export const AuthScreen = () => {
  const T     = useTheme();
  const login = useUserStore(state => state.login);

  const [activeTab, setActiveTab]           = useState<'login' | 'signup'>('login');
  const [loading, setLoading]               = useState(false);
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [businessName, setBusinessName]     = useState('');
  const [websiteUrl, setWebsiteUrl]         = useState('');
  const [businessType, setBusinessType]     = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [applyBrandTheme, setApplyBrandTheme]   = useState(true);

  const availableProducts = businessType ? NICHE_PRODUCT_MAP[businessType] || [] : [];

  // Clear products when niche changes
  const handleNicheSelect = (niche: string) => {
    setBusinessType(niche);
    setSelectedProducts([]);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Required Fields', 'Please fill in your Email and Password.');
      return;
    }
    if (activeTab === 'signup') {
      if (!businessName) {
        Alert.alert('Required Fields', 'Please enter your Business Name.');
        return;
      }
      if (!websiteUrl) {
        Alert.alert('Required Fields', 'Please enter your Website URL.');
        return;
      }
      if (!businessType) {
        Alert.alert('Required Fields', 'Please select your Niche / Industry.');
        return;
      }
      if (selectedProducts.length === 0) {
        Alert.alert('Required Fields', 'Please select at least one Main Product.');
        return;
      }
    }

    setLoading(true);
    try {
      if (activeTab === 'login') {
        const response = await loginUser(email, password);
        if (response.status === 'success') login(response.user);
      } else {
        const productsString = selectedProducts.join(', ');
        const response = await registerUser(
          email, password, businessName, websiteUrl,
          applyBrandTheme, businessType, productsString,
        );
        if (response.status === 'success') {
          login(response.user);
          if (applyBrandTheme) {
            Alert.alert(
              '🎨 Brand Profile Created!',
              `Color: ${response.user.brand_color}\nPersona: ${response.user.brand_persona}`,
            );
          } else {
            Alert.alert('✅ Account Created!', `Welcome, ${response.user.business_name}!`);
          }
        }
      }
    } catch (error: any) {
      console.error('Auth Error:', error);
      let msg = 'Authentication failed. Please check credentials.';
      const targetUrl = error.config?.baseURL || 'http://localhost:8000';

      if (error.response?.data?.detail) {
        msg = typeof error.response.data.detail === 'string'
          ? error.response.data.detail
          : JSON.stringify(error.response.data.detail);
      } else if (error.message?.toLowerCase().includes('network')) {
        msg = `Network connection failed.\n\nPlease verify the backend is running at:\n${targetUrl}`;
      } else if (!error.response) {
        msg = `Unable to reach the server.\n\nPlease ensure the backend is running at:\n${targetUrl}`;
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
      <StatusBar barStyle={T.isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={T.bg} />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
        <View style={[styles.card, T.cardLg, T.shadow]}>

          <Text style={[styles.fieldLabel, { color: T.textSub }]}>Email Address</Text>
          <InputField icon="mail-outline" placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" editable={!loading} />

          <Text style={[styles.fieldLabel, { color: T.textSub }]}>Password</Text>
          <InputField icon="lock-closed-outline" placeholder="Your password" value={password} onChangeText={setPassword} secureTextEntry editable={!loading} />

          {activeTab === 'signup' && (
            <>
              <Text style={[styles.fieldLabel, { color: T.textSub }]}>Business Name</Text>
              <InputField icon="business-outline" placeholder="e.g. Sizzling Grill DHA" value={businessName} onChangeText={setBusinessName} autoCapitalize="words" editable={!loading} />

              <Text style={[styles.fieldLabel, { color: T.textSub }]}>Website URL</Text>
              <InputField icon="globe-outline" placeholder="https://yourbrand.pk" value={websiteUrl} onChangeText={setWebsiteUrl} keyboardType="url" editable={!loading} />

              {/* Niche Dropdown */}
              <Text style={[styles.fieldLabel, { color: T.textSub }]}>Niche / Industry</Text>
              <DropdownField
                icon="pricetags-outline"
                placeholder="Select your Industry / Niche"
                value={businessType}
                options={ALL_NICHES}
                onSelect={handleNicheSelect}
                disabled={loading}
              />
              {businessType ? (
                <Text style={[styles.nicheHint, { color: T.primary }]}>
                  ✓ {businessType}
                </Text>
              ) : null}

              {/* Products Multi-Select Dropdown */}
              <Text style={[styles.fieldLabel, { color: T.textSub }]}>Main Products</Text>
              <DropdownField
                icon="cart-outline"
                placeholder={businessType ? 'Select products (choose multiple)' : 'Select Niche first'}
                value={selectedProducts.join(', ')}
                options={availableProducts}
                onSelect={() => {}}
                disabled={loading || !businessType}
                multiSelect
                selectedItems={selectedProducts}
                onMultiSelect={setSelectedProducts}
              />
              {selectedProducts.length > 0 && (
                <View style={styles.pillsRow}>
                  {selectedProducts.map(p => (
                    <View key={p} style={[styles.pill, { backgroundColor: `${T.primary}20`, borderColor: `${T.primary}40` }]}>
                      <Text style={[styles.pillText, { color: T.primary }]}>{p}</Text>
                      <TouchableOpacity onPress={() => setSelectedProducts(selectedProducts.filter(x => x !== p))}>
                        <Ionicons name="close-circle" size={14} color={T.primary} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

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
  container:        { flex: 1 },
  scrollContainer:  { flexGrow: 1, justifyContent: 'center', padding: 24 },
  headerBlock:      { alignItems: 'center', marginBottom: 28 },
  logoContainer:    {
    width: 76, height: 76, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 16,
  },
  appTitle:         { fontSize: 28, fontWeight: '800', letterSpacing: 0.4 },
  appSubtitle:      { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  tabContainer:     {
    flexDirection: 'row', borderRadius: 99, padding: 5,
    marginBottom: 24, borderWidth: 1,
  },
  tabButton:        { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 99 },
  activeTabButton:  {},
  tabText:          { fontSize: 14, fontWeight: '700' },
  card:             { padding: 24, borderWidth: 0 },
  fieldLabel:       {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.6,
    textTransform: 'uppercase', marginBottom: 8, marginTop: 16,
  },
  inputWrapper:     {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 24, borderWidth: 1, paddingHorizontal: 16, marginBottom: 2,
    minHeight: 52,
  },
  inputIcon:        { marginRight: 10 },
  input:            { flex: 1, height: 52, fontSize: 14 },
  dropdownValue:    { fontSize: 14, paddingVertical: 16 },
  nicheHint:        { fontSize: 11, fontWeight: '600', marginTop: 4, marginLeft: 8, marginBottom: 2 },
  pillsRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 4 },
  pill:             {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4,
  },
  pillText:         { fontSize: 11, fontWeight: '600' },
  toggleRow:        {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 24, paddingTop: 20, borderTopWidth: 1, gap: 12,
  },
  toggleTextBlock:  { flex: 1 },
  toggleTitle:      { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  toggleSubtitle:   { fontSize: 12, lineHeight: 16 },
  actionBtn:        {
    borderRadius: 32, height: 58, alignItems: 'center', justifyContent: 'center', marginTop: 28,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
  },
  actionBtnText:    { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  scrapingBox:      { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingHorizontal: 4 },
  scrapingLoader:   { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },

  // Modal Dropdown styles
  modalBackdrop:    {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet:       {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, maxHeight: '72%',
  },
  modalHeader:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitle:       { fontSize: 15, fontWeight: '700' },
  clearText:        { fontSize: 13, fontWeight: '600' },
  optionRow:        {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5,
  },
  optionText:       { fontSize: 14, flex: 1 },
  doneBtn:          {
    margin: 16, borderRadius: 24, height: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  doneBtnText:      { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
