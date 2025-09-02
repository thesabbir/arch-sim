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

// Render Web Service
class RenderWebService extends AbstractService implements HostingService {
  supportedRuntimes: Runtime[] = [
    { name: 'Node.js', version: '20', supported: true },
    { name: 'Python', version: '3.11', supported: true },
    { name: 'Ruby', version: '3.2', supported: true },
    { name: 'Go', version: '1.21', supported: true },
    { name: 'Rust', version: 'latest', supported: true },
    { name: 'PHP', version: '8.2', supported: true },
    { name: 'Docker', version: 'latest', supported: true },
    { name: 'Static Sites', version: 'all', supported: true }
  ];
  
  scalingOptions: ScalingOption[] = [
    { type: 'manual', minInstances: 1, maxInstances: 100 },
    { type: 'automatic', minInstances: 1, maxInstances: 100, scalingMetric: 'cpu' }
  ];
  
  constructor() {
    super('Render Web Services');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['oregon', 'ohio', 'virginia', 'frankfurt', 'singapore'],
      features: [
        'zero-downtime-deploys',
        'automatic-ssl',
        'custom-domains',
        'private-services',
        'preview-environments',
        'auto-deploy',
        'github-gitlab-integration',
        'docker-support',
        'health-checks',
        'ddos-protection'
      ],
      limits: {
        memory: 32768, // MB max
        cpu: 4, // vCPUs max per instance
        instances: 100,
        bandwidth: 100 // GB included in free tier
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    // Starter instance: 512MB RAM, 0.5 vCPU
    const instanceCost = this.calculateInstanceCost();
    const bandwidthCost = this.calculateBandwidthCost(usage.bandwidth || 0);
    
    return {
      amount: instanceCost + bandwidthCost,
      currency: 'USD',
      breakdown: {
        instance: instanceCost,
        bandwidth: bandwidthCost
      }
    };
  }
  
  private calculateInstanceCost(): number {
    // Starter: $7/month per instance
    return 7;
  }
  
  calculateBandwidthCost(gb: number): number {
    // First 100GB free
    if (gb <= 100) return 0;
    // $0.10 per GB after that
    return (gb - 100) * 0.10;
  }
  
  calculateComputeCost(_hours: number): number {
    // Render charges per instance, not per hour
    return this.calculateInstanceCost();
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.plan && !['free', 'starter', 'standard', 'pro'].includes(config.plan)) {
      errors.push('Invalid plan selected');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Render Database Service
class RenderDatabaseService extends AbstractService implements DatabaseService {
  supportedEngines: string[] = [
    'postgresql',
    'redis'
  ];
  
  constructor() {
    super('Render Databases');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['oregon', 'ohio', 'virginia', 'frankfurt', 'singapore'],
      features: [
        'automated-backups',
        'point-in-time-recovery',
        'high-availability',
        'read-replicas',
        'connection-pooling',
        'ssl-connections',
        'daily-backups'
      ],
      limits: {
        storage: 1024, // GB max
        connections: 97, // PostgreSQL connections
        memory: 16384 // MB max
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    // Starter PostgreSQL: 256MB RAM, 1GB storage
    const baseCost = 7; // $7/month
    const storageCost = this.calculateStorageCost(Math.max((usage.storage || 1) - 1, 0)); // 1GB included
    
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
    // $0.25 per GB per month after included storage
    return gb * 0.25;
  }
  
  calculateOperationsCost(_operations: number): number {
    // Operations included in base price
    return 0;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.engine && !this.supportedEngines.includes(config.engine)) {
      errors.push(`Unsupported database engine: ${config.engine}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Render Static Site Service (also handles storage-like functionality)
class RenderStaticService extends AbstractService implements StorageService {
  constructor() {
    super('Render Static Sites');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global-cdn'],
      features: [
        'static-hosting',
        'automatic-builds',
        'instant-cache-invalidation',
        'custom-headers',
        'redirects',
        'pull-request-previews',
        'rollbacks'
      ],
      limits: {
        sites: 100,
        bandwidth: 100, // GB free tier
        builds: 400 // minutes free tier
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    // Static sites are free up to 100GB bandwidth
    const bandwidthCost = usage.bandwidth && usage.bandwidth > 100 
      ? (usage.bandwidth - 100) * 0.10 
      : 0;
    
    return {
      amount: bandwidthCost,
      currency: 'USD',
      breakdown: {
        bandwidth: bandwidthCost
      }
    };
  }
  
  calculateStorageCost(_gb: number): number {
    // Storage included in static site hosting
    return 0;
  }
  
  calculateOperationsCost(_operations: number): number {
    // Operations included
    return 0;
  }
  
  validateConfiguration(_config: any): ValidationResult {
    return { valid: true };
  }
}

// Render Data Loader
class RenderDataLoader implements DataLoader {
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

// Render Price Calculator
class RenderPriceCalculator implements PriceCalculator {
  calculateCost(usage: Usage, pricing: PricingData): CostBreakdown {
    const serviceCosts: Record<string, number> = {};
    
    // Determine if static or dynamic site
    const isStatic = usage.compute === 0;
    
    if (isStatic) {
      // Static site (free tier)
      serviceCosts.hosting = 0;
      if (usage.bandwidth && usage.bandwidth > 100) {
        serviceCosts.bandwidth = (usage.bandwidth - 100) * 0.10;
      }
    } else {
      // Web service (Starter plan)
      serviceCosts.hosting = 7; // $7/month for Starter
      
      // Database if storage is needed
      if (usage.storage && usage.storage > 0) {
        serviceCosts.database = 7; // PostgreSQL Starter
        if (usage.storage > 1) {
          serviceCosts.dbStorage = (usage.storage - 1) * 0.25;
        }
      }
      
      // Bandwidth
      if (usage.bandwidth && usage.bandwidth > 100) {
        serviceCosts.bandwidth = (usage.bandwidth - 100) * 0.10;
      }
    }
    
    const totalCost = Object.values(serviceCosts).reduce((sum, cost) => sum + cost, 0);
    
    return {
      baseCost: isStatic ? 0 : 7,
      serviceCosts,
      totalCost,
      currency: pricing.currency || 'USD',
      period: usage.period || 'monthly',
      details: [
        isStatic ? 'Static Site (Free)' : 'Web Service Starter: $7/month',
        'Starter: 512MB RAM, 0.5 vCPU',
        usage.storage ? `PostgreSQL Starter: ${usage.storage}GB storage` : '',
        `Bandwidth: ${usage.bandwidth || 0}GB (100GB included)`
      ].filter(Boolean)
    };
  }
  
  calculateMonthlyEstimate(usage: Usage, pricing: PricingData): number {
    const breakdown = this.calculateCost({ ...usage, period: 'monthly' }, pricing);
    return breakdown.totalCost;
  }
  
  calculateYearlyEstimate(usage: Usage, pricing: PricingData): number {
    const monthly = this.calculateMonthlyEstimate(usage, pricing);
    // 20% discount for annual billing on paid plans
    return monthly > 0 ? monthly * 12 * 0.8 : 0;
  }
}

// Render Validator
class RenderValidator implements ProviderValidator {
  validate(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.serviceType) {
      warnings.push('No service type specified (web/static/background/cron)');
    }
    
    if (config.region && !['oregon', 'ohio', 'virginia', 'frankfurt', 'singapore'].includes(config.region)) {
      errors.push('Invalid region selected');
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

// Main Render Provider
export class RenderProvider implements Provider {
  name = 'render';
  version = '1.0.0';
  
  services: ProviderServices = {
    hosting: new RenderWebService(),
    database: new RenderDatabaseService(),
    storage: new RenderStaticService()
  };
  
  dataLoader = new RenderDataLoader();
  priceCalculator = new RenderPriceCalculator();
  validator = new RenderValidator();
  
  metadata: ProviderMetadata = {
    name: 'Render',
    website: 'https://render.com',
    regions: ['oregon', 'ohio', 'virginia', 'frankfurt', 'singapore'],
    supportedFrameworks: ['Node.js', 'Python', 'Ruby', 'Go', 'Rust', 'PHP', 'Docker', 'Static Sites'],
    pricingUrl: 'https://render.com/pricing',
    description: 'Cloud platform for hosting web apps, static sites, databases, and cron jobs'
  };
  
  async initialize(): Promise<void> {
    console.log(`Initializing ${this.name} provider v${this.version}`);
  }
  
  meetsRequirements(requirements: Requirements): boolean {
    if (requirements.regions && requirements.regions.length > 0) {
      const hasRegion = requirements.regions.some(r => 
        this.metadata.regions.includes(r) || r === 'us' || r === 'eu'
      );
      if (!hasRegion) return false;
    }
    
    if (requirements.scalability) {
      return true; // Good scalability options
    }
    
    if (requirements.features) {
      const availableFeatures = [
        'web-hosting',
        'static-sites',
        'databases',
        'background-jobs',
        'cron-jobs',
        'private-services',
        'auto-deploy'
      ];
      
      return requirements.features.every(f => availableFeatures.includes(f));
    }
    
    return true;
  }
}

// Export default instance
export default new RenderProvider();