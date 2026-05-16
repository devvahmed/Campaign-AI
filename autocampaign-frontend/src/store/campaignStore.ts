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
  
  setScenario: (scenario: string) => void;
  setInputData: (data: any) => void;
  setAnalysisResult: (insights: any[], contradictions: any[], credibilityScores: any[], temporalTrends: any[], strategy: any) => void;
  setAssets: (assets: any) => void;
  setExecutionResult: (result: any) => void;
  setBudget: (budget: number) => void;
  setJobId: (id: string) => void;
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

  setScenario: (scenario) => set({ scenario }),
  setInputData: (inputData) => set({ inputData }),
  setAnalysisResult: (insights, contradictions, credibilityScores, temporalTrends, strategy) => 
    set({ insights, contradictions, credibilityScores, temporalTrends, strategy }),
  setAssets: (assets) => set({ assets }),
  setExecutionResult: (executionResult) => set({ executionResult }),
  setBudget: (budget) => set({ budget }),
  setJobId: (jobId) => set({ jobId }),
  appendTrace: (trace) => set((state) => ({ traceLog: [...state.traceLog, trace] })),
}));
