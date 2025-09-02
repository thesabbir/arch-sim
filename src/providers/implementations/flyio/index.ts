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
  ServiceCapabilities,
  Cost,
  Runtime,
  ScalingOption
} from '../../base/provider.interface';
import { AbstractService } from '../../base/service.interface';
import { DataLoader as DataLoaderImpl } from '../../../data/storage/data-loader';

// Fly.io Machine Service
class FlyMachineService extends AbstractService implements HostingService {
  supportedRuntimes: Runtime[] = [
    { name: 'Docker', version: 'latest', supported: true },
    { name: 'Node.js', version: '20', supported: true },
    { name: 'Python', version: '3.11', supported: true },
    { name: 'Go', version: '1.21', supported: true },
    { name: 'Ruby', version: '3.2', supported: true },
    { name: 'Rust', version: 'latest', supported: true },
    { name: 'Elixir', version: '1.14', supported: true },
    { name: '.NET', version: '7', supported: true }
  ];
  
  scalingOptions: ScalingOption[] = [
    { type: 'automatic', minInstances: 0, maxInstances: 100, scalingMetric: 'requests' },
    { type: 'manual', minInstances: 1, maxInstances: 100 }
  ];
  
  constructor() {
    super('Fly Machines');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: [
        'iad', 'ord', 'lax', 'sjc', 'sea', 'dfw', 'mia', 'bos', 'ewr', 'yyz',
        'ams', 'cdg', 'fra', 'lhr', 'mad', 'arn', 'waw',
        'nrt', 'sin', 'syd', 'hkg', 'bom', 'gru', 'eze', 'scl', 'jnb'
      ],
      features: [
        'auto-scaling-to-zero',
        'multi-region-deployment',
        'private-networking',
        'anycast-ip',
        'automatic-ssl',
        'custom-domains',
        'persistent-volumes',
        'gpu-support',
        'websockets',
        'http3-support'
      ],
      limits: {
        memory: 65536, // MB max
        cpu: 16, // shared CPUs
        regions: 30,
        machines: 100
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    // Shared CPU: 1 shared CPU, 256MB RAM
    const machineCost = this.calculateMachineCost(usage.compute || 0);
    const bandwidthCost = this.calculateBandwidthCost(usage.bandwidth || 0);
    
    return {
      amount: machineCost + bandwidthCost,
      currency: 'USD',
      breakdown: {
        machines: machineCost,
        bandwidth: bandwidthCost
      }
    };
  }
  
  private calculateMachineCost(hours: number): number {
    // Shared-cpu-1x: $0.0000008/second = $0.00288/hour = ~$2.07/month
    // Assuming 256MB RAM machine
    return (hours * 0.00288);
  }
  
  calculateBandwidthCost(gb: number): number {
    // First 100GB free per month
    if (gb <= 100) return 0;
    // $0.02 per GB after that
    return (gb - 100) * 0.02;
  }
  
  calculateComputeCost(hours: number): number {
    return this.calculateMachineCost(hours);
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.regions && config.regions.length > 30) {
      errors.push('Cannot deploy to more than 30 regions');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Fly PostgreSQL Service
class FlyPostgresService extends AbstractService implements DatabaseService {
  supportedEngines: string[] = ['postgresql'];
  
  constructor() {
    super('Fly Postgres');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['iad', 'ord', 'lax', 'ams', 'fra', 'sin', 'syd'],
      features: [
        'managed-postgres',
        'automatic-backups',
        'point-in-time-recovery',
        'high-availability',
        'read-replicas',
        'connection-pooling'
      ],
      limits: {
        storage: 1000, // GB
        connections: 200,
        replicas: 5
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    // Development cluster: 1 shared CPU, 256MB RAM
    const hours = usage.compute || 720;
    const machineCost = hours * 0.00288; // Same as app machine
    const storageCost = this.calculateStorageCost(usage.storage || 10);
    
    return {
      amount: machineCost + storageCost,
      currency: 'USD',
      breakdown: {
        compute: machineCost,
        storage: storageCost
      }
    };
  }
  
  calculateStorageCost(gb: number): number {
    // $0.15 per GB per month
    return gb * 0.15;
  }
  
  calculateOperationsCost(_operations: number): number {
    // Operations included
    return 0;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.replicas && config.replicas > 5) {
      errors.push('Cannot have more than 5 read replicas');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Fly Data Loader
class FlyDataLoader implements DataLoader {
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

// Fly Price Calculator
class FlyPriceCalculator implements PriceCalculator {
  calculateCost(usage: Usage, pricing: PricingData): CostBreakdown {
    const serviceCosts: Record<string, number> = {};
    
    // Machine costs (shared-cpu-1x with 256MB)
    const hours = usage.compute || 720;
    serviceCosts.machines = hours * 0.00288;
    
    // Database if storage is needed
    if (usage.storage && usage.storage > 0) {
      serviceCosts.database = hours * 0.00288; // Another machine for DB
      serviceCosts.storage = usage.storage * 0.15;
    }
    
    // Bandwidth
    if (usage.bandwidth && usage.bandwidth > 100) {
      serviceCosts.bandwidth = (usage.bandwidth - 100) * 0.02;
    }
    
    const totalCost = Object.values(serviceCosts).reduce((sum, cost) => sum + cost, 0);
    
    return {
      baseCost: 0, // Pay as you go
      serviceCosts,
      totalCost,
      currency: pricing.currency || 'USD',
      period: usage.period || 'monthly',
      details: [
        'Shared-cpu-1x: 256MB RAM',
        `Bandwidth: ${usage.bandwidth || 0}GB (100GB free)`,
        usage.storage ? `PostgreSQL with ${usage.storage}GB storage` : ''
      ].filter(Boolean)
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

// Fly Validator
class FlyValidator implements ProviderValidator {
  validate(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.app) {
      warnings.push('No app name specified');
    }
    
    if (config.machines && config.machines > 100) {
      errors.push('Cannot exceed 100 machines per app');
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

// Main Fly.io Provider
export class FlyProvider implements Provider {
  name = 'flyio';
  version = '1.0.0';
  
  services: ProviderServices = {
    hosting: new FlyMachineService(),
    database: new FlyPostgresService()
  };
  
  dataLoader = new FlyDataLoader();
  priceCalculator = new FlyPriceCalculator();
  validator = new FlyValidator();
  
  metadata: ProviderMetadata = {
    name: 'Fly.io',
    website: 'https://fly.io',
    regions: [
      'iad', 'ord', 'lax', 'sjc', 'sea', 'dfw', 'mia', 'bos', 'ewr', 'yyz',
      'ams', 'cdg', 'fra', 'lhr', 'mad', 'arn', 'waw',
      'nrt', 'sin', 'syd', 'hkg', 'bom', 'gru', 'eze', 'scl', 'jnb'
    ],
    supportedFrameworks: ['Docker', 'Node.js', 'Python', 'Go', 'Ruby', 'Rust', 'Elixir', '.NET'],
    pricingUrl: 'https://fly.io/docs/about/pricing/',
    description: 'Run apps close to users with VMs in 30+ regions'
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
      return true; // Excellent scaling with scale-to-zero
    }
    
    if (requirements.features) {
      const availableFeatures = [
        'containers',
        'scale-to-zero',
        'multi-region',
        'private-networking',
        'persistent-storage'
      ];
      
      return requirements.features.every(f => availableFeatures.includes(f));
    }
    
    return true;
  }
}

// Export default instance
export default new FlyProvider();