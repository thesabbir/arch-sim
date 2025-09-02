// Intelligence Module - AI-powered recommendations
export { UnifiedAIProvider, getAIProvider, resetAIProvider } from './unified-ai-provider';
export type { AIResponse } from './unified-ai-provider';

export { RecommendationSystem } from './recommendation-system';
export type { 
  RecommendationRequest, 
  RecommendationResponse, 
  ProviderComparison 
} from './recommendation-system';