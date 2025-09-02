// Core exports
export { ProviderRegistry, getRegistry, resetRegistry } from './core/provider-registry';
export { createCostEngine } from './core/cost-engine';
import { resetConfigLoader } from './config/config-loader';

// Provider interfaces and types
export type {
  Provider,
  ProviderServices,
  ProviderMetadata,
  ProviderValidator,
  DataLoader,
  PriceCalculator,
  PricingData,
  Tier,
  ServicePricing,
  Usage,
  CostBreakdown,
  Requirements,
  Override,
  ValidationResult,
  BaseService,
  HostingService,
  DatabaseService,
  CacheService,
  CDNService,
  AuthService,
  MonitoringService,
  FunctionsService,
  StorageService,
  ServiceCapabilities,
  Cost,
  Runtime,
  ScalingOption,
  DataExtractionConfig
} from './providers/base/provider.interface';

// Service base class
export { AbstractService } from './providers/base/service.interface';

// Data management
export { DataLoader as DataLoaderImpl, getDataLoader, resetDataLoader } from './data/storage/data-loader';
export { DefaultOverrideManager, createOverrideManager } from './data/storage/override-manager';
export type { OverrideManager, TierConfig } from './data/storage/override-manager';

// Validation
export { Validator, getValidator, resetValidator } from './data/validation/validator';
export type { ValidationRule, ValidationSchema, BatchValidationResult } from './data/validation/validator';

// Cost engine types
export type {
  CostEstimate,
  ComparisonResult
} from './core/cost-engine';

// Registry types
export type {
  ProviderInfo,
  RegistryConfig
} from './core/provider-registry';

// Intelligence exports - AI-only recommendations
export { 
  UnifiedAIProvider, 
  getAIProvider, 
  resetAIProvider,
  RecommendationSystem 
} from './intelligence';
export type { 
  AIResponse,
  RecommendationRequest,
  RecommendationResponse,
  ProviderComparison
} from './intelligence';

// Config exports
export { ConfigLoader, getConfigLoader, resetConfigLoader } from './config/config-loader';
export type { Config } from './config/config-loader';

// Architecture interface
export type { Architecture } from './providers/base/architecture.interface';

// Version
export const VERSION = '2.0.0';

// Initialize default instance
import { getRegistry, resetRegistry } from './core/provider-registry';
import { getDataLoader, resetDataLoader } from './data/storage/data-loader';
import { createCostEngine } from './core/cost-engine';
import { resetValidator } from './data/validation/validator';
import { resetAIProvider } from './intelligence';
import type { CostEngine } from './core/cost-engine';

let defaultEngine: CostEngine | null = null;

export function getDefaultCostEngine(): CostEngine {
  if (!defaultEngine) {
    const registry = getRegistry();
    const dataLoader = getDataLoader();
    defaultEngine = createCostEngine(registry, dataLoader);
  }
  return defaultEngine;
}

export function resetAll(): void {
  defaultEngine = null;
  resetRegistry();
  resetDataLoader();
  resetValidator();
  resetAIProvider();
  resetConfigLoader();
}

// CLI entry point
export { cli } from './cli/index';

// Re-export CostEngine type
export type { CostEngine };