import type {
  Provider,
  ProviderServices,
  ProviderMetadata,
  DataLoader,
  PriceCalculator,
  ProviderValidator,
  ValidationResult,
  PricingData,
  Usage,
  CostBreakdown,
  Override,
  Requirements,
  DatabaseService,
  StorageService,
  AuthService,
  ServiceCapabilities,
  Cost
} from '../../base/provider.interface';
import { AbstractService } from '../../base/service.interface';
import { DataLoader as DataLoaderImpl } from '../../../data/storage/data-loader';

// Supabase Database Service (PostgreSQL)
class SupabaseDatabaseService extends AbstractService implements DatabaseService {
  supportedEngines: string[] = ['postgresql'];
  
  constructor() {
    super('Supabase Database');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: [
        'us-east-1', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-west-2', 
        'eu-central-1', 'ap-southeast-1', 'ap-northeast-1', 'ap-south-1',
        'sa-east-1', 'ca-central-1', 'ap-southeast-2'
      ],
      features: [
        'postgresql-15',
        'realtime-subscriptions',
        'row-level-security',
        'database-functions',
        'triggers',
        'webhooks',
        'vector-embeddings',
        'full-text-search',
        'postgis-extension',
        'pg-graphql'
      ],
      limits: {
        database_size: 500, // MB free tier
        api_requests: 500000, // per month free
        concurrent_connections: 50, // free tier
        bandwidth: 2 // GB free tier
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const storageCost = this.calculateStorageCost(usage.storage || 0);
    const apiCost = this.calculateOperationsCost(usage.requests || 0);
    
    return {
      amount: storageCost + apiCost,
      currency: 'USD',
      breakdown: {
        storage: storageCost,
        api: apiCost
      }
    };
  }
  
  calculateStorageCost(gb: number): number {
    // Free tier: 500MB, Pro tier: 8GB included
    // Assuming Pro tier ($25/month base)
    if (gb <= 8) return 0; // Included in Pro
    // $0.125 per GB after 8GB
    return (gb - 8) * 0.125;
  }
  
  calculateOperationsCost(operations: number): number {
    // Free tier: 500k requests/month
    // Pro tier: 50M requests included
    if (operations <= 50000000) return 0; // Included in Pro
    // $2.50 per million requests after that
    return ((operations - 50000000) / 1000000) * 2.50;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.region && !this.getCapabilities().regions.includes(config.region)) {
      errors.push(`Invalid region: ${config.region}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Supabase Storage Service
class SupabaseStorageService extends AbstractService implements StorageService {
  constructor() {
    super('Supabase Storage');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global'],
      features: [
        's3-compatible',
        'automatic-image-optimization',
        'on-the-fly-transformations',
        'cdn-caching',
        'signed-urls',
        'resumable-uploads',
        'row-level-security',
        'bucket-policies'
      ],
      limits: {
        storage: 1, // GB free tier
        bandwidth: 2, // GB free tier
        file_size: 50, // MB free tier
        transformations: 100 // per month free
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const storageCost = this.calculateStorageCost(usage.storage || 0);
    const bandwidthCost = this.calculateBandwidthCost(usage.bandwidth || 0);
    
    return {
      amount: storageCost + bandwidthCost,
      currency: 'USD',
      breakdown: {
        storage: storageCost,
        bandwidth: bandwidthCost
      }
    };
  }
  
  calculateStorageCost(gb: number): number {
    // Pro tier includes 100GB
    if (gb <= 100) return 0;
    // $0.021 per GB after 100GB
    return (gb - 100) * 0.021;
  }
  
  private calculateBandwidthCost(gb: number): number {
    // Pro tier includes 50GB
    if (gb <= 50) return 0;
    // $0.09 per GB after 50GB
    return (gb - 50) * 0.09;
  }
  
  calculateOperationsCost(_operations: number): number {
    // Operations included in storage pricing
    return 0;
  }
  
  validateConfiguration(_config: any): ValidationResult {
    return { valid: true };
  }
}

// Supabase Auth Service
class SupabaseAuthService extends AbstractService implements AuthService {
  constructor() {
    super('Supabase Auth');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global'],
      features: [
        'email-password',
        'magic-links',
        'phone-auth',
        'oauth-providers',
        'social-logins',
        'jwt-tokens',
        'row-level-security',
        'multi-factor-auth',
        'custom-smtp',
        'webhook-events'
      ],
      limits: {
        users: 50000, // MAU free tier
        social_providers: -1 // Unlimited
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const userCost = this.calculateUserCost(usage.users || 0);
    
    return {
      amount: userCost,
      currency: 'USD',
      breakdown: {
        users: userCost
      }
    };
  }
  
  calculateUserCost(_users: number): number {
    // Free tier: 50k MAU
    // Pro tier: Unlimited MAU included
    // No additional charges for auth on Pro plan
    return 0;
  }
  
  calculateAuthenticationCost(_authentications: number): number {
    // All auth operations included
    return 0;
  }
  
  validateConfiguration(_config: any): ValidationResult {
    return { valid: true };
  }
}

// Supabase Data Loader
class SupabaseDataLoader implements DataLoader {
  private dataLoader: DataLoaderImpl;
  
  constructor() {
    this.dataLoader = new DataLoaderImpl();
  }
  
  async loadProviderData(provider: string): Promise<PricingData> {
    return this.dataLoader.loadProviderData(provider);
  }
  
  async loadBaseData(provider: string): Promise<PricingData> {
    return this.dataLoader.loadBaseData(provider);
  }
  
  async loadGlobalOverrides(): Promise<Override[]> {
    return this.dataLoader.loadGlobalOverrides();
  }
  
  async loadProviderOverrides(provider: string): Promise<Override[]> {
    return this.dataLoader.loadProviderOverrides(provider);
  }
  
  async loadLocalOverrides(provider: string): Promise<Override[]> {
    return this.dataLoader.loadLocalOverrides(provider);
  }
}

// Supabase Price Calculator
class SupabasePriceCalculator implements PriceCalculator {
  calculateCost(usage: Usage, pricing: PricingData): CostBreakdown {
    const serviceCosts: Record<string, number> = {};
    
    // Check if free tier or pro tier
    const needsPro = this.needsProTier(usage);
    
    if (needsPro) {
      serviceCosts.base = 25; // Pro tier base cost
      
      // Database storage over 8GB
      if (usage.storage && usage.storage > 8) {
        serviceCosts.dbStorage = (usage.storage - 8) * 0.125;
      }
      
      // Storage over 100GB
      if (usage.storage && usage.storage > 100) {
        serviceCosts.fileStorage = (usage.storage - 100) * 0.021;
      }
      
      // Bandwidth over 50GB
      if (usage.bandwidth && usage.bandwidth > 50) {
        serviceCosts.bandwidth = (usage.bandwidth - 50) * 0.09;
      }
      
      // API requests over 50M
      if (usage.requests && usage.requests > 50000000) {
        serviceCosts.apiRequests = ((usage.requests - 50000000) / 1000000) * 2.50;
      }
    } else {
      // Free tier
      serviceCosts.base = 0;
    }
    
    const totalCost = Object.values(serviceCosts).reduce((sum, cost) => sum + cost, 0);
    
    return {
      baseCost: needsPro ? 25 : 0,
      serviceCosts,
      totalCost,
      currency: pricing.currency || 'USD',
      period: usage.period || 'monthly',
      details: [
        needsPro ? 'Pro tier: $25/month' : 'Free tier',
        'Database: 8GB included (Pro), 500MB (Free)',
        'Storage: 100GB included (Pro), 1GB (Free)',
        'Bandwidth: 50GB included (Pro), 2GB (Free)',
        'Auth: Unlimited MAU (Pro), 50k MAU (Free)'
      ]
    };
  }
  
  private needsProTier(usage: Usage): boolean {
    // Check if usage exceeds free tier limits
    if (usage.storage && usage.storage > 0.5) return true; // 500MB database
    if (usage.bandwidth && usage.bandwidth > 2) return true;
    if (usage.requests && usage.requests > 500000) return true;
    if (usage.users && usage.users > 50000) return true;
    return false;
  }
  
  calculateMonthlyEstimate(usage: Usage, pricing: PricingData): number {
    const breakdown = this.calculateCost({ ...usage, period: 'monthly' }, pricing);
    return breakdown.totalCost;
  }
  
  calculateYearlyEstimate(usage: Usage, pricing: PricingData): number {
    const monthly = this.calculateMonthlyEstimate(usage, pricing);
    return monthly * 12;
  }
}

// Supabase Validator
class SupabaseValidator implements ProviderValidator {
  validate(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.projectRef) {
      warnings.push('No project reference specified');
    }
    
    if (config.plan && !['free', 'pro', 'team', 'enterprise'].includes(config.plan)) {
      errors.push('Invalid plan specified');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  validatePricing(pricing: any): ValidationResult {
    const errors: string[] = [];
    
    if (!pricing.tiers || pricing.tiers.length === 0) {
      errors.push('No pricing tiers defined');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Main Supabase Provider
export class SupabaseProvider implements Provider {
  name = 'supabase';
  version = '1.0.0';
  
  services: ProviderServices = {
    database: new SupabaseDatabaseService(),
    storage: new SupabaseStorageService(),
    auth: new SupabaseAuthService()
  };
  
  dataLoader = new SupabaseDataLoader();
  priceCalculator = new SupabasePriceCalculator();
  validator = new SupabaseValidator();
  
  metadata: ProviderMetadata = {
    name: 'Supabase',
    website: 'https://supabase.com',
    regions: [
      'us-east-1', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-west-2',
      'eu-central-1', 'ap-southeast-1', 'ap-northeast-1', 'ap-south-1'
    ],
    supportedFrameworks: ['React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'SvelteKit', 'Flutter'],
    pricingUrl: 'https://supabase.com/pricing',
    description: 'Open source Firebase alternative with PostgreSQL, Auth, Storage, and Realtime'
  };
  
  async initialize(): Promise<void> {
    console.log(`Initializing ${this.name} provider v${this.version}`);
  }
  
  meetsRequirements(requirements: Requirements): boolean {
    if (requirements.regions && requirements.regions.length > 0) {
      const hasRegion = requirements.regions.some(r => 
        this.metadata.regions.includes(r)
      );
      if (!hasRegion) return false;
    }
    
    if (requirements.scalability === 'high') {
      return true; // Good scalability
    }
    
    if (requirements.features) {
      const availableFeatures = [
        'postgresql',
        'realtime',
        'authentication',
        'storage',
        'vector-search',
        'edge-functions'
      ];
      
      return requirements.features.every(f => availableFeatures.includes(f));
    }
    
    return true;
  }
}

// Export default instance
export default new SupabaseProvider();