import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Dynamic IP resolution for Emulators, Simulators, and Physical Devices
const getBackendUrl = (): string => {
  try {
    const metroHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.launchAsset?.url ?? '';
    const host = metroHost.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== '') {
      return `http://${host}:8000`;
    }
  } catch (_) {}

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  
  if (Platform.OS === 'ios') {
    return 'http://localhost:8000';
  }
  
  // Explicit route for desktop web browser testing (dynamically supports local IP routing)
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname && hostname !== '') {
        return `http://${hostname}:8000`;
      }
    }
    return 'http://localhost:8000';
  }

  return 'http://192.168.100.33:8000';
};

const BASE_URL = getBackendUrl();
console.log('[API Connection] Resolved Backend URL:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, 
});

export const loadScenario = async (id: string) => {
  try {
    const res = await api.post(`/api/load-scenario/${id}`);
    return res.data;
  } catch (error) {
    console.error("loadScenario Error:", error);
    throw error;
  }
};

export const analyzeData = async (jobId: string, inputs: any, budget: number, businessLevel: string, businessName?: string, brandColor?: string, scenarioId?: string) => {
  try {
    const payload: any = {
      job_id: jobId,
      budget,
      inputs,
      business_knowledge_level: businessLevel
    };
    if (businessName) payload.business_name = businessName;
    if (brandColor) payload.brand_color = brandColor;
    if (scenarioId) payload.scenario_id = scenarioId;

    const res = await api.post('/api/analyze', payload);
    return res.data;
  } catch (error) {
    console.error("analyzeData Error:", error);
    throw error;
  }
};

export const approveCampaign = async (
  jobId: string, 
  budget: number, 
  strategy: any, 
  customerLeads?: string[], 
  assets?: any,
  businessName?: string,
  brandColor?: string,
  websiteUrl?: string
) => {
  try {
    const payload: any = {
      job_id: jobId,
      budget,
      strategy
    };
    
    if (customerLeads) {
      payload.customerLeads = customerLeads;
    }
    
    if (assets) {
      payload.ad_copy = assets.ad_copy;
      payload.image_url = assets.image_url;
      payload.video_url = assets.video_url;
    }

    if (businessName) payload.business_name = businessName;
    if (brandColor) payload.brand_color = brandColor;
    if (websiteUrl) payload.website_url = websiteUrl;
    
    const res = await api.post('/api/approve', payload);
    return res.data;
  } catch (error) {
    console.error("approveCampaign Error:", error);
    throw error;
  }
};

export const getTrace = async (jobId: string) => {
  try {
    const res = await api.get(`/api/trace/${jobId}`);
    return res.data;
  } catch (error) {
    console.error("getTrace Error:", error);
    throw error;
  }
};

export const registerUser = async (email: string, password: string, businessName: string, websiteUrl: string, applyBrandTheme: boolean = true, businessType: string = "generic", products: string = "") => {
  try {
    const res = await api.post('/api/auth/register', {
      email,
      password,
      business_name: businessName,
      website_url: websiteUrl,
      apply_brand_theme: applyBrandTheme,
      business_type: businessType,
      products: products
    });
    return res.data;
  } catch (error) {
    console.error("registerUser Error:", error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const res = await api.post('/api/auth/login', {
      email,
      password
    });
    return res.data;
  } catch (error) {
    console.error("loginUser Error:", error);
    throw error;
  }
};

export const getLiveCompetitors = async (businessName: string) => {
  try {
    const res = await api.get('/api/competitors/live', {
      params: { business_name: businessName }
    });
    return res.data;
  } catch (error) {
    console.error("getLiveCompetitors Error:", error);
    throw error;
  }
};

export const approveCampaignMultipart = async (formData: FormData) => {
  try {
    const res = await api.post('/api/approve', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    });
    return res.data;
  } catch (error) {
    console.error("approveCampaignMultipart Error:", error);
    throw error;
  }
};
