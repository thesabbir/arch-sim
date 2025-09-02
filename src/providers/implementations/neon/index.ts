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
  ServiceCapabilities,
  Cost
} from '../../base/provider.interface';
import { AbstractService } from '../../base/service.interface';
import { DataLoader as DataLoaderImpl } from '../../../data/storage/data-loader';

// Neon Database Service (Serverless PostgreSQL)
class NeonDatabaseService extends AbstractService implements DatabaseService {
  supportedEngines: string[] = ['postgresql'];
  
  constructor() {
    super('Neon Database');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: [
        'us-east-1', 'us-east-2', 'us-west-2', 'eu-central-1',
        'ap-southeast-1', 'ap-southeast-2'
      ],
      features: [
        'serverless-postgres',
        'instant-branching',
        'auto-scaling',
        'scale-to-zero',
        'point-in-time-recovery',
        'connection-pooling',
        'read-replicas',
        'data-branching',
        'time-travel-queries',
        'github-integration'
      ],
      limits: {
        storage: 3, // GB free tier
        compute_hours: 100, // per month free
        branches: 10, // free tier
        projects: 1, // free tier
        databases: 100 // per project
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const storageCost = this.calculateStorageCost(usage.storage || 0);
    const computeCost = this.calculateComputeCost(usage.compute || 0);
    
    return {
      amount: storageCost + computeCost,
      currency: 'USD',
      breakdown: {
        storage: storageCost,
        compute: computeCost
      }
    };
  }
  
  calculateStorageCost(gb: number): number {
    // Pro tier includes 10GB
    if (gb <= 10) return 0;
    // $0.35 per GB/month after 10GB
    return (gb - 10) * 0.35;
  }
  
  calculateOperationsCost(_operations: number): number {
    // Operations are billed through compute hours
    return 0;
  }
  
  private calculateComputeCost(hours: number): number {
    // Pro tier includes 300 compute hours
    if (hours <= 300) return 0;
    // $0.09 per compute hour after 300
    return (hours - 300) * 0.09;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (config.region && !this.getCapabilities().regions.includes(config.region)) {
      errors.push(`Invalid region: ${config.region}`);
    }
    
    if (config.branches && config.branches > 100) {
      warnings.push('High number of branches may impact performance');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
}

// Neon Data Loader
class NeonDataLoader implements DataLoader {
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

// Neon Price Calculator
class NeonPriceCalculator implements PriceCalculator {
  calculateCost(usage: Usage, pricing: PricingData): CostBreakdown {
    const serviceCosts: Record<string, number> = {};
    
    // Determine if needs Pro tier
    const needsPro = this.needsProTier(usage);
    
    if (needsPro) {
      serviceCosts.base = 19; // Pro tier base cost
      
      // Storage over 10GB
      if (usage.storage && usage.storage > 10) {
        serviceCosts.storage = (usage.storage - 10) * 0.35;
      }
      
      // Compute hours over 300
      const computeHours = usage.compute || 720; // Default full month
      if (computeHours > 300) {
        serviceCosts.compute = (computeHours - 300) * 0.09;
      }
    } else {
      // Free tier
      serviceCosts.base = 0;
      
      // Free tier limits
      if (usage.storage && usage.storage > 3) {
        // Must upgrade to Pro
        return this.calculateCost(usage, pricing); // Recursive call with Pro pricing
      }
      
      if (usage.compute && usage.compute > 100) {
        // Must upgrade to Pro
        return this.calculateCost(usage, pricing);
      }
    }
    
    const totalCost = Object.values(serviceCosts).reduce((sum, cost) => sum + cost, 0);
    
    return {
      baseCost: needsPro ? 19 : 0,
      serviceCosts,
      totalCost,
      currency: pricing.currency || 'USD',
      period: usage.period || 'monthly',
      details: [
        needsPro ? 'Pro tier: $19/month' : 'Free tier',
        'Serverless PostgreSQL with branching',
        'Storage: 10GB included (Pro), 3GB (Free)',
        'Compute: 300 hours included (Pro), 100 hours (Free)',
        'Scale to zero when inactive'
      ]
    };
  }
  
  private needsProTier(usage: Usage): boolean {
    // Check if usage exceeds free tier limits
    if (usage.storage && usage.storage > 3) return true;
    if (usage.compute && usage.compute > 100) return true;
    if (usage.users && usage.users > 1000) return true; // Assuming connection limits
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

// Neon Validator
class NeonValidator implements ProviderValidator {
  validate(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.projectId) {
      warnings.push('No project ID specified');
    }
    
    if (config.plan && !['free', 'pro', 'custom'].includes(config.plan)) {
      errors.push('Invalid plan: must be free, pro, or custom');
    }
    
    if (config.computeSize && !['0.25', '0.5', '1', '2', '4', '8'].includes(config.computeSize)) {
      errors.push('Invalid compute size');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  validatePricing(pricing: any): ValidationResult {
    const errors: string[] = [];
    
    if (!pricing.services || pricing.services.length === 0) {
      errors.push('No service pricing defined');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Main Neon Provider
export class NeonProvider implements Provider {
  name = 'neon';
  version = '1.0.0';
  
  services: ProviderServices = {
    database: new NeonDatabaseService()
  };
  
  dataLoader = new NeonDataLoader();
  priceCalculator = new NeonPriceCalculator();
  validator = new NeonValidator();
  
  metadata: ProviderMetadata = {
    name: 'Neon',
    website: 'https://neon.tech',
    regions: [
      'us-east-1', 'us-east-2', 'us-west-2', 'eu-central-1',
      'ap-southeast-1', 'ap-southeast-2'
    ],
    supportedFrameworks: ['Any PostgreSQL-compatible'],
    pricingUrl: 'https://neon.tech/pricing',
    description: 'Serverless PostgreSQL with branching, scale-to-zero, and instant provisioning'
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
      return true; // Excellent auto-scaling
    }
    
    if (requirements.features) {
      const availableFeatures = [
        'postgresql',
        'serverless',
        'branching',
        'scale-to-zero',
        'time-travel'
      ];
      
      return requirements.features.every(f => availableFeatures.includes(f));
    }
    
    return true;
  }
}

// Export default instance
export default new NeonProvider();