import axios from 'axios';

const BASE_URL = 'https://polite-cobras-bet.loca.lt'; // localtunnel public URL

const api = axios.create({
  baseURL: BASE_URL,
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

export const analyzeData = async (jobId: string, inputs: any, budget: number) => {
  try {
    const res = await api.post('/api/analyze', {
      job_id: jobId,
      budget,
      inputs
    });
    return res.data;
  } catch (error) {
    console.error("analyzeData Error:", error);
    throw error;
  }
};

export const generateAssets = async (jobId: string, strategy: any) => {
  try {
    const res = await api.post('/api/generate-assets', {
      job_id: jobId,
      strategy
    });
    return res.data;
  } catch (error) {
    console.error("generateAssets Error:", error);
    throw error;
  }
};

export const approveCampaign = async (jobId: string, budget: number, strategy: any) => {
  try {
    const res = await api.post('/api/approve', {
      job_id: jobId,
      budget,
      strategy
    });
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
