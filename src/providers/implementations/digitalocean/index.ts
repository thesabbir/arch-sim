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
  HostingService,
  DatabaseService,
  StorageService,
  ServiceCapabilities,
  Cost,
  Runtime,
  ScalingOption
} from '../../base/provider.interface';
import { AbstractService } from '../../base/service.interface';
import { DataLoader as DataLoaderImpl } from '../../../data/storage/data-loader';

// DigitalOcean App Platform Service
class DigitalOceanAppService extends AbstractService implements HostingService {
  supportedRuntimes: Runtime[] = [
    { name: 'Node.js', version: '18', supported: true },
    { name: 'Python', version: '3.11', supported: true },
    { name: 'Go', version: '1.21', supported: true },
    { name: 'Ruby', version: '3.2', supported: true },
    { name: 'PHP', version: '8.2', supported: true },
    { name: 'Docker', version: 'latest', supported: true },
    { name: 'Static Sites', version: 'all', supported: true }
  ];
  
  scalingOptions: ScalingOption[] = [
    { type: 'manual', minInstances: 1, maxInstances: 10 },
    { type: 'automatic', minInstances: 1, maxInstances: 10, scalingMetric: 'cpu' }
  ];
  
  constructor() {
    super('DigitalOcean App Platform');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: [
        'nyc1', 'nyc3', 'sfo1', 'sfo2', 'sfo3', 'ams3', 'sgp1', 
        'lon1', 'fra1', 'tor1', 'blr1', 'syd1'
      ],
      features: [
        'automatic-deployments',
        'github-gitlab-integration',
        'custom-domains',
        'automatic-ssl',
        'container-registry',
        'managed-databases',
        'cdn-included',
        'vertical-horizontal-scaling',
        'zero-downtime-deploys',
        'rollback-support'
      ],
      limits: {
        static_sites: 3, // free tier
        bandwidth: 100, // GB free for static
        build_minutes: 100, // per month free
        containers: 2 // free tier
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const appCost = this.calculateAppCost();
    const bandwidthCost = this.calculateBandwidthCost(usage.bandwidth || 0);
    
    return {
      amount: appCost + bandwidthCost,
      currency: 'USD',
      breakdown: {
        app: appCost,
        bandwidth: bandwidthCost
      }
    };
  }
  
  private calculateAppCost(): number {
    // Basic app: $5/month
    return 5;
  }
  
  calculateBandwidthCost(gb: number): number {
    // First 100GB included with Basic
    if (gb <= 100) return 0;
    // First 1TB included with Professional ($12/mo)
    if (gb <= 1000) return 7; // Upgrade to Professional
    // $0.01 per GB after 1TB
    return 12 + (gb - 1000) * 0.01;
  }
  
  calculateComputeCost(_hours: number): number {
    // App Platform charges per month, not per hour
    return this.calculateAppCost();
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.region && !this.getCapabilities().regions.includes(config.region)) {
      errors.push(`Invalid region: ${config.region}`);
    }
    
    if (config.instances && config.instances > 10) {
      errors.push('Cannot exceed 10 instances per component');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// DigitalOcean Managed Database Service
class DigitalOceanDatabaseService extends AbstractService implements DatabaseService {
  supportedEngines: string[] = ['postgresql', 'mysql', 'redis', 'mongodb'];
  
  constructor() {
    super('DigitalOcean Managed Databases');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: [
        'nyc1', 'nyc3', 'sfo2', 'sfo3', 'ams3', 'sgp1',
        'lon1', 'fra1', 'tor1', 'blr1'
      ],
      features: [
        'automated-backups',
        'point-in-time-recovery',
        'high-availability',
        'read-replicas',
        'connection-pooling',
        'ssl-connections',
        'automatic-updates',
        'monitoring-alerts'
      ],
      limits: {
        storage: 10, // GB minimum
        connections: 75, // Basic tier
        replicas: 2 // Basic tier
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    // Basic database: $15/month (1GB RAM, 10GB storage)
    const baseCost = 15;
    const storageCost = this.calculateStorageCost(Math.max((usage.storage || 10) - 10, 0));
    
    return {
      amount: baseCost + storageCost,
      currency: 'USD',
      breakdown: {
        base: baseCost,
        storage: storageCost
      }
    };
  }
  
  calculateStorageCost(gb: number): number {
    // $0.20 per GB per month after included storage
    return gb * 0.20;
  }
  
  calculateOperationsCost(_operations: number): number {
    // Operations included in base price
    return 0;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (config.engine && !this.supportedEngines.includes(config.engine)) {
      errors.push(`Unsupported database engine: ${config.engine}`);
    }
    
    if (config.size && !['db-s-1vcpu-1gb', 'db-s-1vcpu-2gb', 'db-s-2vcpu-4gb'].includes(config.size)) {
      warnings.push('Unknown database size');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
}

// DigitalOcean Spaces (Object Storage)
class DigitalOceanSpacesService extends AbstractService implements StorageService {
  constructor() {
    super('DigitalOcean Spaces');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['nyc3', 'sfo3', 'ams3', 'sgp1', 'fra1'],
      features: [
        's3-compatible',
        'cdn-included',
        'custom-domains',
        'cors-support',
        'lifecycle-policies',
        'spaces-cdn',
        'large-file-support',
        'versioning'
      ],
      limits: {
        storage: 250, // GB included
        bandwidth: 1000, // GB included
        requests: -1 // Unlimited
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const baseCost = 5; // $5/month includes 250GB storage, 1TB transfer
    let additionalCost = 0;
    
    if (usage.storage && usage.storage > 250) {
      additionalCost += (usage.storage - 250) * 0.02; // $0.02 per GB
    }
    
    if (usage.bandwidth && usage.bandwidth > 1000) {
      additionalCost += (usage.bandwidth - 1000) * 0.01; // $0.01 per GB
    }
    
    return {
      amount: baseCost + additionalCost,
      currency: 'USD',
      breakdown: {
        base: baseCost,
        additional: additionalCost
      }
    };
  }
  
  calculateStorageCost(gb: number): number {
    if (gb <= 250) return 5; // Base plan
    return 5 + (gb - 250) * 0.02;
  }
  
  calculateOperationsCost(_operations: number): number {
    // Operations included in base price
    return 0;
  }
  
  validateConfiguration(_config: any): ValidationResult {
    return { valid: true };
  }
}

// DigitalOcean Data Loader
class DigitalOceanDataLoader implements DataLoader {
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

// DigitalOcean Price Calculator
class DigitalOceanPriceCalculator implements PriceCalculator {
  calculateCost(usage: Usage, pricing: PricingData): CostBreakdown {
    const serviceCosts: Record<string, number> = {};
    
    // App Platform costs
    if (usage.compute === 0) {
      // Static site (free for 3 sites)
      serviceCosts.app = 0;
    } else {
      // Basic app: $5/month
      serviceCosts.app = 5;
      
      // Professional if high bandwidth
      if (usage.bandwidth && usage.bandwidth > 100) {
        serviceCosts.app = 12; // Professional tier
      }
    }
    
    // Database costs
    if (usage.storage && usage.storage > 0) {
      serviceCosts.database = 15; // Basic PostgreSQL
      if (usage.storage > 10) {
        serviceCosts.dbStorage = (usage.storage - 10) * 0.20;
      }
    }
    
    // Spaces (object storage) - only if lots of storage needed
    if (usage.storage && usage.storage > 100) {
      serviceCosts.spaces = 5; // Base Spaces plan
      if (usage.storage > 250) {
        serviceCosts.spacesExtra = (usage.storage - 250) * 0.02;
      }
    }
    
    // Bandwidth costs (if exceeding tier limits)
    if (usage.bandwidth && usage.bandwidth > 1000) {
      serviceCosts.bandwidth = (usage.bandwidth - 1000) * 0.01;
    }
    
    const totalCost = Object.values(serviceCosts).reduce((sum, cost) => sum + cost, 0);
    
    return {
      baseCost: serviceCosts.app || 0,
      serviceCosts,
      totalCost,
      currency: pricing.currency || 'USD',
      period: usage.period || 'monthly',
      details: [
        'App Platform: $5/mo Basic, $12/mo Professional',
        'Database: $15/mo Basic (1GB RAM, 10GB storage)',
        'Spaces: $5/mo (250GB storage, 1TB transfer)',
        'Static sites: 3 free'
      ]
    };
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

// DigitalOcean Validator
class DigitalOceanValidator implements ProviderValidator {
  validate(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.name) {
      warnings.push('No app name specified');
    }
    
    if (config.tier && !['starter', 'basic', 'professional'].includes(config.tier)) {
      errors.push('Invalid tier: must be starter, basic, or professional');
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

// Main DigitalOcean Provider
export class DigitalOceanProvider implements Provider {
  name = 'digitalocean';
  version = '1.0.0';
  
  services: ProviderServices = {
    hosting: new DigitalOceanAppService(),
    database: new DigitalOceanDatabaseService(),
    storage: new DigitalOceanSpacesService()
  };
  
  dataLoader = new DigitalOceanDataLoader();
  priceCalculator = new DigitalOceanPriceCalculator();
  validator = new DigitalOceanValidator();
  
  metadata: ProviderMetadata = {
    name: 'DigitalOcean',
    website: 'https://digitalocean.com',
    regions: [
      'nyc1', 'nyc3', 'sfo1', 'sfo2', 'sfo3', 'ams3', 'sgp1',
      'lon1', 'fra1', 'tor1', 'blr1', 'syd1'
    ],
    supportedFrameworks: ['Node.js', 'Python', 'Go', 'Ruby', 'PHP', 'Docker', 'Static Sites'],
    pricingUrl: 'https://www.digitalocean.com/pricing',
    description: 'Simple cloud platform with App Platform, Droplets, Databases, and Spaces'
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
    
    if (requirements.scalability) {
      return true; // Good scalability for most apps
    }
    
    if (requirements.features) {
      const availableFeatures = [
        'app-platform',
        'managed-databases',
        'object-storage',
        'kubernetes',
        'load-balancers'
      ];
      
      return requirements.features.every(f => availableFeatures.includes(f));
    }
    
    return true;
  }
}

// Export default instance
export default new DigitalOceanProvider();