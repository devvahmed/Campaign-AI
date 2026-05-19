import { create } from 'zustand';

interface CampaignState {
  scenario: string;
  inputData: any;
  insights: any[];
  contradictions: any[];
  credibilityScores: any[];
  temporalTrends: any[];
  strategy: any;
  assets: any;
  traceLog: any[];
  executionResult: any;
  budget: number;
  jobId: string;
  businessLevel: string;
  loadingStatus: string;
  
  setScenario: (scenario: string) => void;
  setInputData: (data: any) => void;
  setAnalysisResult: (insights: any[], contradictions: any[], credibilityScores: any[], temporalTrends: any[], strategy: any, assets: any) => void;
  setAssets: (assets: any) => void;
  setExecutionResult: (result: any) => void;
  setBudget: (budget: number) => void;
  setJobId: (id: string) => void;
  setBusinessLevel: (level: string) => void;
  setLoadingStatus: (status: string) => void;
  appendTrace: (trace: any) => void;
}

export const useCampaignStore = create<CampaignState>((set) => ({
  scenario: '',
  inputData: {},
  insights: [],
  contradictions: [],
  credibilityScores: [],
  temporalTrends: [],
  strategy: null,
  assets: null,
  traceLog: [],
  executionResult: null,
  budget: 15000,
  jobId: '',
  businessLevel: 'beginner',
  loadingStatus: '',

  setScenario: (scenario) => set({ scenario }),
  setInputData: (inputData) => set({ inputData }),
  setAnalysisResult: (insights, contradictions, credibilityScores, temporalTrends, strategy, assets) => 
    set({ insights, contradictions, credibilityScores, temporalTrends, strategy, assets }),
  setAssets: (assets) => set({ assets }),
  setExecutionResult: (executionResult) => set({ executionResult }),
  setBudget: (budget) => set({ budget }),
  setJobId: (jobId) => set({ jobId }),
  setBusinessLevel: (businessLevel) => set({ businessLevel }),
  setLoadingStatus: (loadingStatus) => set({ loadingStatus }),
  appendTrace: (trace) => set((state) => ({ traceLog: [...state.traceLog, trace] })),
}));
