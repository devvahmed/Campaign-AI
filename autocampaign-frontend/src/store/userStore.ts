import { create } from 'zustand';

// Premium default baseline colors (iOS dark theme)
const DEFAULT_BRAND_COLOR = '#0A84FF';

export interface UserProfile {
  email: string;
  business_name: string;
  website_url: string;
  brand_color: string;
  brand_persona: string;
  business_type: string;          // resolved vertical: footwear | clothing | food | beauty | electronics | sports | generic
  apply_brand_theme: boolean;
  logo_url?: string;
}

interface UserState {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  isDarkMode: boolean;
  brandColor: string | null;
  logoUrl: string | null;
  businessName: string | null;
  brand_color: string | null;
  logo_url: string | null;
  business_name: string | null;

  // Derived helper: returns the active accent color
  // If the user opted into brand theming → their custom brand_color
  // Otherwise → default premium iOS blue
  themeColor: (() => string) & { toString: () => string; valueOf: () => string };

  login: (profile: any) => void;
  logout: () => void;
  toggleDarkMode: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  isAuthenticated: false,
  userProfile: null,
  isDarkMode: false, // Defaults to our beautiful light theme
  brandColor: null,
  logoUrl: null,
  businessName: null,
  brand_color: null,
  logo_url: null,
  business_name: null,

  themeColor: (() => {
    const fn = () => {
      const profile = get().userProfile;
      if (profile?.apply_brand_theme && profile?.brand_color) {
        return profile.brand_color;
      }
      return get().brandColor || DEFAULT_BRAND_COLOR;
    };
    fn.toString = () => {
      const profile = get().userProfile;
      if (profile?.apply_brand_theme && profile?.brand_color) {
        return profile.brand_color;
      }
      return get().brandColor || DEFAULT_BRAND_COLOR;
    };
    fn.valueOf = fn.toString;
    return fn as any;
  })(),

  login: (profile) => {
    const bColor = profile.brand_color || profile.brandColor || '';
    const lUrl = profile.logo_url || profile.logoUrl || '';
    const bName = profile.business_name || profile.businessName || '';
    const bType = profile.business_type || profile.businessType || 'generic';

    set({
      isAuthenticated: true,
      userProfile: {
        email: profile.email || '',
        business_name: bName,
        website_url: profile.website_url || profile.websiteUrl || '',
        brand_color: bColor,
        brand_persona: profile.brand_persona || profile.brandPersona || '',
        business_type: bType,
        apply_brand_theme: profile.apply_brand_theme !== undefined ? profile.apply_brand_theme : true,
        logo_url: lUrl,
      },
      brandColor: bColor,
      logoUrl: lUrl,
      businessName: bName,
      brand_color: bColor,
      logo_url: lUrl,
      business_name: bName,
    });
  },

  logout: () => set({
    isAuthenticated: false,
    userProfile: null,
    brandColor: null,
    logoUrl: null,
    businessName: null,
    brand_color: null,
    logo_url: null,
    business_name: null,
  }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));

