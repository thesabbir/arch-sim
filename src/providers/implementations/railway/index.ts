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

// Railway App Service
class RailwayAppService extends AbstractService implements HostingService {
  supportedRuntimes: Runtime[] = [
    { name: 'Node.js', version: '18', supported: true },
    { name: 'Python', version: '3.11', supported: true },
    { name: 'Go', version: '1.21', supported: true },
    { name: 'Ruby', version: '3.2', supported: true },
    { name: 'Java', version: '17', supported: true },
    { name: 'PHP', version: '8.2', supported: true },
    { name: 'Rust', version: 'latest', supported: true },
    { name: '.NET', version: '7', supported: true },
    { name: 'Docker', version: 'latest', supported: true }
  ];
  
  scalingOptions: ScalingOption[] = [
    { type: 'automatic', minInstances: 1, maxInstances: 10, scalingMetric: 'cpu' },
    { type: 'manual', minInstances: 1, maxInstances: 20 }
  ];
  
  constructor() {
    super('Railway App Service');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['us-west-1', 'us-east-1', 'eu-west-1'],
      features: [
        'auto-deploy',
        'preview-environments',
        'private-networking',
        'custom-domains',
        'automatic-ssl',
        'github-integration',
        'environment-variables',
        'logs-monitoring',
        'metrics',
        'rollbacks'
      ],
      limits: {
        memory: 8192, // MB per service
        cpu: 8, // vCPUs per service
        services: 100, // per project
        egress: 100 // GB included
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    // Railway uses resource-based pricing
    const memoryCost = this.calculateMemoryCost(usage.compute || 0);
    const cpuCost = this.calculateCPUCost(usage.compute || 0);
    const bandwidthCost = this.calculateBandwidthCost(usage.bandwidth || 0);
    
    return {
      amount: memoryCost + cpuCost + bandwidthCost,
      currency: 'USD',
      breakdown: {
        memory: memoryCost,
        cpu: cpuCost,
        bandwidth: bandwidthCost
      }
    };
  }
  
  private calculateMemoryCost(hours: number): number {
    // $0.000463 per GB per hour
    // Assuming 1GB for standard web app
    return hours * 1 * 0.000463 * 1000; // Convert to dollars
  }
  
  private calculateCPUCost(hours: number): number {
    // $0.000463 per vCPU per hour
    // Assuming 0.5 vCPU for standard web app
    return hours * 0.5 * 0.000463 * 1000; // Convert to dollars
  }
  
  calculateBandwidthCost(gb: number): number {
    // First 100GB included
    if (gb <= 100) return 0;
    // $0.10 per GB after that
    return (gb - 100) * 0.10;
  }
  
  calculateComputeCost(hours: number): number {
    return this.calculateMemoryCost(hours) + this.calculateCPUCost(hours);
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.memory && config.memory > 8192) {
      errors.push('Memory cannot exceed 8GB per service');
    }
    
    if (config.cpu && config.cpu > 8) {
      errors.push('CPU cannot exceed 8 vCPUs per service');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Railway Database Service
class RailwayDatabaseService extends AbstractService implements DatabaseService {
  supportedEngines: string[] = [
    'postgresql',
    'mysql',
    'redis',
    'mongodb'
  ];
  
  constructor() {
    super('Railway Database');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['us-west-1', 'us-east-1', 'eu-west-1'],
      features: [
        'automated-backups',
        'point-in-time-recovery',
        'connection-pooling',
        'ssl-connections',
        'private-networking',
        'database-insights'
      ],
      limits: {
        storage: 100, // GB
        connections: 100,
        memory: 8192 // MB
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    // PostgreSQL pricing
    const memoryCost = (usage.compute || 720) * 0.5 * 0.000463 * 1000; // 0.5GB memory
    const cpuCost = (usage.compute || 720) * 0.25 * 0.000463 * 1000; // 0.25 vCPU
    const storageCost = this.calculateStorageCost(usage.storage || 10);
    
    return {
      amount: memoryCost + cpuCost + storageCost,
      currency: 'USD',
      breakdown: {
        memory: memoryCost,
        cpu: cpuCost,
        storage: storageCost
      }
    };
  }
  
  calculateStorageCost(gb: number): number {
    // $0.25 per GB per month
    return gb * 0.25;
  }
  
  calculateOperationsCost(_operations: number): number {
    // Operations included in resource pricing
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

// Railway Volume Storage Service
class RailwayStorageService extends AbstractService implements StorageService {
  constructor() {
    super('Railway Volumes');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['us-west-1', 'us-east-1', 'eu-west-1'],
      features: [
        'persistent-storage',
        'ssd-storage',
        'snapshots',
        'auto-scaling',
        'encryption'
      ],
      limits: {
        volumeSize: 100, // GB per volume
        volumes: 10 // per service
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const storageCost = this.calculateStorageCost(usage.storage || 0);
    
    return {
      amount: storageCost,
      currency: 'USD',
      breakdown: {
        storage: storageCost
      }
    };
  }
  
  calculateStorageCost(gb: number): number {
    // $0.25 per GB per month
    return gb * 0.25;
  }
  
  calculateOperationsCost(_operations: number): number {
    // Operations included
    return 0;
  }
  
  validateConfiguration(_config: any): ValidationResult {
    return { valid: true };
  }
}

// Railway Data Loader
class RailwayDataLoader implements DataLoader {
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

// Railway Price Calculator
class RailwayPriceCalculator implements PriceCalculator {
  calculateCost(usage: Usage, pricing: PricingData): CostBreakdown {
    const serviceCosts: Record<string, number> = {};
    
    // Base subscription (Hobby plan)
    serviceCosts.base = 5; // $5/month hobby plan
    
    // Calculate resource usage
    const hours = usage.compute || 720; // Default full month
    
    // App service (0.5 vCPU, 1GB RAM)
    serviceCosts.appMemory = hours * 1 * 0.000463;
    serviceCosts.appCpu = hours * 0.5 * 0.000463;
    
    // Database (0.25 vCPU, 0.5GB RAM)
    if (usage.storage && usage.storage > 0) {
      serviceCosts.dbMemory = hours * 0.5 * 0.000463;
      serviceCosts.dbCpu = hours * 0.25 * 0.000463;
      serviceCosts.dbStorage = Math.max(usage.storage, 10) * 0.25; // Min 10GB
    }
    
    // Bandwidth
    if (usage.bandwidth && usage.bandwidth > 100) {
      serviceCosts.bandwidth = (usage.bandwidth - 100) * 0.10;
    }
    
    const totalCost = Object.values(serviceCosts).reduce((sum, cost) => sum + cost, 0);
    
    return {
      baseCost: 5,
      serviceCosts,
      totalCost,
      currency: pricing.currency || 'USD',
      period: usage.period || 'monthly',
      details: [
        'Hobby plan: $5/month',
        'App: 0.5 vCPU, 1GB RAM',
        'Database: 0.25 vCPU, 0.5GB RAM',
        `Bandwidth: ${usage.bandwidth || 0}GB (100GB included)`
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

// Railway Validator
class RailwayValidator implements ProviderValidator {
  validate(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.projectName) {
      warnings.push('No project name specified');
    }
    
    if (config.services && config.services > 100) {
      errors.push('Cannot exceed 100 services per project');
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

// Main Railway Provider
export class RailwayProvider implements Provider {
  name = 'railway';
  version = '1.0.0';
  
  services: ProviderServices = {
    hosting: new RailwayAppService(),
    database: new RailwayDatabaseService(),
    storage: new RailwayStorageService()
  };
  
  dataLoader = new RailwayDataLoader();
  priceCalculator = new RailwayPriceCalculator();
  validator = new RailwayValidator();
  
  metadata: ProviderMetadata = {
    name: 'Railway',
    website: 'https://railway.app',
    regions: ['us-west-1', 'us-east-1', 'eu-west-1'],
    supportedFrameworks: ['Node.js', 'Python', 'Go', 'Ruby', 'Java', 'PHP', 'Rust', '.NET', 'Docker'],
    pricingUrl: 'https://railway.app/pricing',
    description: 'Modern platform for deploying applications with minimal configuration'
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
      return true; // Good for small to medium scale
    }
    
    if (requirements.features) {
      const availableFeatures = [
        'containers',
        'databases',
        'auto-deploy',
        'private-networking',
        'monitoring'
      ];
      
      return requirements.features.every(f => availableFeatures.includes(f));
    }
    
    return true;
  }
}

// Export default instance
export default new RailwayProvider();