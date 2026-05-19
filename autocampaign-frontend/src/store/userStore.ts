import { create } from 'zustand';

// Premium default baseline colors (iOS dark theme)
const DEFAULT_BRAND_COLOR = '#0A84FF';

interface UserProfile {
  email: string;
  business_name: string;
  website_url: string;
  brand_color: string;
  brand_persona: string;
  apply_brand_theme: boolean;
}

interface UserState {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  isDarkMode: boolean;

  // Derived helper: returns the active accent color
  // If the user opted into brand theming → their custom brand_color
  // Otherwise → default premium iOS blue
  themeColor: () => string;

  login: (profile: UserProfile) => void;
  logout: () => void;
  toggleDarkMode: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  isAuthenticated: false,
  userProfile: null,
  isDarkMode: true, // Defaults to our beautiful dark theme

  themeColor: () => {
    const profile = get().userProfile;
    if (profile?.apply_brand_theme && profile?.brand_color) {
      return profile.brand_color;
    }
    return DEFAULT_BRAND_COLOR;
  },

  login: (userProfile) => set({ isAuthenticated: true, userProfile }),
  logout: () => set({ isAuthenticated: false, userProfile: null }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));
