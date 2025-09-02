export interface ProviderMetadata {
  name: string;
  website: string;
  regions: string[];
  supportedFrameworks?: string[];
  pricingUrl: string;
  description?: string;
}

export interface ProviderValidator {
  validate(config: any): ValidationResult;
  validatePricing(pricing: any): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface DataLoader {
  loadProviderData(provider: string): Promise<PricingData>;
  loadBaseData(provider: string): Promise<PricingData>;
  loadGlobalOverrides(): Promise<Override[]>;
  loadProviderOverrides(provider: string): Promise<Override[]>;
  loadLocalOverrides(provider: string): Promise<Override[]>;
}

export interface PriceCalculator {
  calculateCost(usage: Usage, pricing: PricingData): CostBreakdown;
  calculateMonthlyEstimate(usage: Usage, pricing: PricingData): number;
  calculateYearlyEstimate(usage: Usage, pricing: PricingData): number;
}

export interface DataExtractionConfig {
  prompt: string;
  schema: any;
  exampleResponse?: any;
}

export interface Provider {
  name: string;
  version: string;
  services: ProviderServices;
  dataLoader: DataLoader;
  priceCalculator: PriceCalculator;
  validator?: ProviderValidator;
  metadata: ProviderMetadata;
  dataExtraction?: DataExtractionConfig;
  initialize?(): Promise<void>;
  meetsRequirements?(requirements: Requirements): boolean;
}

export interface ProviderServices {
  hosting?: HostingService;
  database?: DatabaseService;
  cache?: CacheService;
  cdn?: CDNService;
  auth?: AuthService;
  monitoring?: MonitoringService;
  functions?: FunctionsService;
  storage?: StorageService;
}

// Common data types
export interface PricingData {
  provider: string;
  lastUpdated: string;
  tiers: Tier[];
  services: ServicePricing[];
  billingPeriod: 'monthly' | 'yearly' | 'hourly';
  currency: string;
}

export interface Tier {
  name: string;
  basePrice: number;
  limits: Record<string, number>;
  features: string[];
}

export interface ServicePricing {
  name: string;
  unit: string;
  price: number;
  freeQuota?: number;
}

export interface Usage {
  bandwidth?: number; // GB
  storage?: number; // GB
  compute?: number; // hours
  requests?: number;
  users?: number;
  databases?: number;
  functions?: number;
  period: 'monthly' | 'yearly';
}

export interface CostBreakdown {
  baseCost: number;
  serviceCosts: Record<string, number>;
  totalCost: number;
  currency: string;
  period: string;
  details?: string[];
}

export interface Requirements {
  budget?: number;
  traffic?: number;
  storage?: number;
  regions?: string[];
  features?: string[];
  scalability?: 'low' | 'medium' | 'high';
  performance?: 'standard' | 'high' | 'ultra';
}

export interface Override {
  path: string;
  value: any;
  reason?: string;
  appliedAt: string;
  priority?: number;
}

// Service interfaces
export interface BaseService {
  getName(): string;
  getCapabilities(): ServiceCapabilities;
  calculateCost(usage: Usage): Cost;
  validateConfiguration(config: any): ValidationResult;
}

export interface ServiceCapabilities {
  scalable: boolean;
  regions: string[];
  features: string[];
  limits?: Record<string, number>;
}

export interface Cost {
  amount: number;
  currency: string;
  breakdown?: Record<string, number>;
}

export interface HostingService extends BaseService {
  supportedRuntimes: Runtime[];
  scalingOptions: ScalingOption[];
  calculateBandwidthCost(gb: number): number;
  calculateComputeCost(hours: number): number;
}

export interface DatabaseService extends BaseService {
  supportedEngines: string[];
  calculateStorageCost(gb: number): number;
  calculateOperationsCost(operations: number): number;
}

export interface CacheService extends BaseService {
  calculateMemoryCost(gb: number): number;
  calculateRequestCost(requests: number): number;
}

export interface CDNService extends BaseService {
  calculateBandwidthCost(gb: number): number;
  calculateRequestCost(requests: number): number;
  edgeLocations: string[];
}

export interface AuthService extends BaseService {
  calculateUserCost(users: number): number;
  calculateAuthenticationCost(authentications: number): number;
}

export interface MonitoringService extends BaseService {
  calculateMetricsCost(metrics: number): number;
  calculateLogsCost(gb: number): number;
}

export interface FunctionsService extends BaseService {
  calculateInvocationCost(invocations: number): number;
  calculateComputeCost(gbSeconds: number): number;
}

export interface StorageService extends BaseService {
  calculateStorageCost(gb: number): number;
  calculateOperationsCost(operations: number): number;
}

// Runtime and scaling types
export interface Runtime {
  name: string;
  version: string;
  supported: boolean;
}

export interface ScalingOption {
  type: 'manual' | 'automatic' | 'serverless';
  minInstances?: number;
  maxInstances?: number;
  scalingMetric?: string;
}