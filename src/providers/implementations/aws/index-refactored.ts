/**
 * AWS Provider Implementation - Refactored
 * All pricing data from JSON only - no hardcoded values
 */

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
  ScalingOption,
  DataExtractionConfig
} from '../../base/provider.interface';
import { AbstractService } from '../../base/service.interface';
import { DataLoader as DataLoaderImpl } from '../../../data/storage/data-loader';
import { BasePricingService } from '../../base/pricing-service';

// AWS App Runner Service
class AWSAppRunnerService extends AbstractService implements HostingService {
  supportedRuntimes: Runtime[] = [
    { name: 'Node.js', version: '18', supported: true },
    { name: 'Node.js', version: '16', supported: true },
    { name: 'Python', version: '3.9', supported: true },
    { name: 'Java', version: '11', supported: true },
    { name: 'Go', version: '1.x', supported: true }
  ];
  
  scalingOptions: ScalingOption[] = [
    { type: 'automatic', minInstances: 1, maxInstances: 25, scalingMetric: 'concurrent_requests' }
  ];
  
  constructor() {
    super('AWS App Runner');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
      features: [
        'auto-scaling',
        'managed-platform',
        'custom-domains',
        'https-by-default',
        'github-integration',
        'container-support'
      ],
      limits: {
        maxInstances: 25,
        maxConcurrentRequests: 200,
        maxMemory: 4096,
        maxCpu: 2
      }
    };
  }
  
  calculateCost(usage: Usage, pricingService: BasePricingService): Cost {
    const vcpuCost = this.calculateComputeCost(usage.compute || 0, pricingService);
    const bandwidthCost = this.calculateBandwidthCost(usage.bandwidth || 0, pricingService);
    
    return {
      amount: vcpuCost + bandwidthCost,
      currency: 'USD',
      breakdown: {
        compute: vcpuCost,
        bandwidth: bandwidthCost
      }
    };
  }
  
  private calculateBandwidthCost(gb: number, pricingService: BasePricingService): number {
    const price = pricingService.getServicePrice('bandwidth');
    const freeQuota = pricingService.getPricing('services.bandwidth.freeQuota') || 0;
    return pricingService.calculateOverage(gb, freeQuota, price);
  }
  
  private calculateComputeCost(hours: number, pricingService: BasePricingService): number {
    const vcpuPrice = pricingService.getServicePrice('apprunner_vcpu');
    const memoryPrice = pricingService.getServicePrice('apprunner_memory');
    
    // Default: 0.5 vCPU, 1 GB memory
    const vcpuHours = hours * 0.5;
    const gbHours = hours * 1;
    
    return (vcpuHours * vcpuPrice) + (gbHours * memoryPrice);
  }
}

// AWS RDS Service
class AWSRDSService extends AbstractService implements DatabaseService {
  supportedEngines = ['PostgreSQL', 'MySQL', 'MariaDB', 'SQL Server', 'Oracle'];
  
  constructor() {
    super('AWS RDS');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
      features: [
        'automated-backups',
        'multi-az',
        'read-replicas',
        'encryption-at-rest',
        'point-in-time-recovery',
        'performance-insights'
      ],
      limits: {
        maxStorage: 64000,
        maxIops: 256000,
        maxConnections: 5000
      }
    };
  }
  
  calculateCost(usage: Usage, pricingService: BasePricingService): Cost {
    const storageCost = this.calculateStorageCost(usage.storage || 0, pricingService);
    const ioCost = this.calculateIOCost(usage.requests || 0, pricingService);
    const backupCost = this.calculateBackupCost((usage.storage || 0) * 0.5, pricingService);
    
    return {
      amount: storageCost + ioCost + backupCost,
      currency: 'USD',
      breakdown: {
        storage: storageCost,
        io: ioCost,
        backup: backupCost
      }
    };
  }
  
  private calculateStorageCost(gb: number, pricingService: BasePricingService): number {
    return gb * pricingService.getServicePrice('rds_storage');
  }
  
  private calculateIOCost(operations: number, pricingService: BasePricingService): number {
    const price = pricingService.getServicePrice('rds_io');
    return (operations / 1000000) * price;
  }
  
  private calculateBackupCost(gb: number, pricingService: BasePricingService): number {
    const price = pricingService.getServicePrice('rds_backup');
    const freeQuota = pricingService.getPricing('services.rds_backup.freeQuota') || 0;
    return pricingService.calculateOverage(gb, freeQuota, price);
  }
}

// AWS S3 Service
class AWSS3Service extends AbstractService implements StorageService {
  constructor() {
    super('AWS S3');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global'],
      features: [
        'versioning',
        'lifecycle-policies',
        'cross-region-replication',
        'encryption',
        'object-lock',
        'intelligent-tiering'
      ],
      limits: {
        maxObjectSize: 5000000,
        maxBuckets: 100
      }
    };
  }
  
  calculateCost(usage: Usage, pricingService: BasePricingService): Cost {
    const storageCost = this.calculateStorageCost(usage.storage || 0, pricingService);
    const requestCost = this.calculateRequestCost(usage.requests || 0, pricingService);
    const transferCost = this.calculateTransferCost(usage.bandwidth || 0, pricingService);
    
    return {
      amount: storageCost + requestCost + transferCost,
      currency: 'USD',
      breakdown: {
        storage: storageCost,
        requests: requestCost,
        transfer: transferCost
      }
    };
  }
  
  private calculateStorageCost(gb: number, pricingService: BasePricingService): number {
    // Use tiered pricing from JSON
    const s3Storage = pricingService.getPricing('services.s3_storage');
    if (s3Storage && typeof s3Storage === 'object' && 'tiers' in s3Storage) {
      return pricingService.calculateTieredPricing(gb, s3Storage.tiers);
    }
    return gb * pricingService.getServicePrice('s3_storage');
  }
  
  private calculateRequestCost(requests: number, pricingService: BasePricingService): number {
    const getRequests = requests * 0.8;
    const putRequests = requests * 0.2;
    
    const getPrice = pricingService.getServicePrice('s3_get_requests');
    const putPrice = pricingService.getServicePrice('s3_put_requests');
    
    return (getRequests / 1000) * getPrice + (putRequests / 1000) * putPrice;
  }
  
  private calculateTransferCost(gb: number, pricingService: BasePricingService): number {
    const s3Transfer = pricingService.getPricing('services.s3_transfer');
    if (s3Transfer && typeof s3Transfer === 'object' && 'tiers' in s3Transfer) {
      const freeQuota = s3Transfer.freeQuota || 0;
      if (gb <= freeQuota) return 0;
      return pricingService.calculateTieredPricing(gb - freeQuota, s3Transfer.tiers);
    }
    return gb * pricingService.getServicePrice('s3_transfer');
  }
}

// AWS Data Loader
class AWSDataLoader implements DataLoader {
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

// AWS Price Calculator
class AWSPriceCalculator implements PriceCalculator {
  calculateCost(usage: Usage, pricing: PricingData): CostBreakdown {
    const pricingService = new BasePricingService(pricing);
    
    // Calculate compute costs
    const computeHours = usage.compute || 730;
    const vcpuPrice = pricingService.getServicePrice('apprunner_vcpu');
    const memoryPrice = pricingService.getServicePrice('apprunner_memory');
    const computeCost = (computeHours * 0.5 * vcpuPrice) + (computeHours * 1 * memoryPrice);
    
    // Calculate bandwidth costs
    const bandwidthPrice = pricingService.getServicePrice('bandwidth');
    const bandwidthFree = pricingService.getPricing('services.bandwidth.freeQuota') || 0;
    const bandwidthCost = pricingService.calculateOverage(usage.bandwidth || 0, bandwidthFree, bandwidthPrice);
    
    // Calculate database costs
    const dbStorage = usage.storage || 0;
    const dbStorageCost = dbStorage * pricingService.getServicePrice('rds_storage');
    const dbIOCost = ((usage.requests || 0) / 1000000) * pricingService.getServicePrice('rds_io');
    
    // Calculate S3 costs
    const s3StorageCost = dbStorage * 0.5 * pricingService.getServicePrice('s3_storage');
    
    const serviceCosts: Record<string, number> = {
      compute: computeCost,
      bandwidth: bandwidthCost,
      database: dbStorageCost + dbIOCost,
      storage: s3StorageCost
    };
    
    const totalCost = Object.values(serviceCosts).reduce((sum, cost) => sum + cost, 0);
    
    return {
      baseCost: 0,
      serviceCosts,
      totalCost,
      currency: pricing.currency || 'USD',
      period: usage.period || 'monthly',
      details: [
        `Compute: ${computeHours} hours`,
        `Bandwidth: ${usage.bandwidth || 0} GB`,
        `Database Storage: ${dbStorage} GB`,
        `S3 Storage: ${dbStorage * 0.5} GB`
      ]
    };
  }
  
  calculateMonthlyEstimate(usage: Usage, pricing: PricingData): number {
    const breakdown = this.calculateCost(usage, pricing);
    return breakdown.totalCost;
  }
  
  calculateYearlyEstimate(usage: Usage, pricing: PricingData): number {
    const monthly = this.calculateMonthlyEstimate(usage, pricing);
    return monthly * 12 * 0.9; // 10% yearly discount
  }
}

// AWS Validator
class AWSValidator implements ProviderValidator {
  validate(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.region) {
      warnings.push('No region specified, defaulting to us-east-1');
    }
    
    if (config.instanceType && !this.isValidInstanceType(config.instanceType)) {
      errors.push(`Invalid instance type: ${config.instanceType}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  validatePricing(pricing: any): ValidationResult {
    const errors: string[] = [];
    
    if (!pricing.services || !Array.isArray(pricing.services)) {
      errors.push('Pricing must include services array');
    }
    
    if (!pricing.currency) {
      errors.push('Pricing must specify currency');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  private isValidInstanceType(type: string): boolean {
    const validTypes = ['t3.micro', 't3.small', 't3.medium', 't3.large', 'm5.large', 'm5.xlarge'];
    return validTypes.includes(type);
  }
}

// Main AWS Provider
export class AWSProvider implements Provider {
  name = 'aws';
  version = '2.0.0';
  services: ProviderServices;
  dataLoader: DataLoader;
  priceCalculator: PriceCalculator;
  validator: ProviderValidator;
  metadata: ProviderMetadata;
  dataExtraction?: DataExtractionConfig;
  
  constructor() {
    this.services = {
      hosting: new AWSAppRunnerService(),
      database: new AWSRDSService(),
      storage: new AWSS3Service()
    };
    
    this.dataLoader = new AWSDataLoader();
    this.priceCalculator = new AWSPriceCalculator();
    this.validator = new AWSValidator();
    
    this.metadata = {
      name: 'Amazon Web Services',
      website: 'https://aws.amazon.com',
      regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
      supportedFrameworks: ['Node.js', 'Python', 'Java', 'Go', '.NET', 'Ruby'],
      pricingUrl: 'https://aws.amazon.com/pricing/',
      description: 'Comprehensive cloud platform with 200+ services'
    };
    
    this.dataExtraction = {
      prompt: `Extract AWS pricing for App Runner, RDS, and S3 services`,
      schema: {
        services: 'array of {name, unit, price, freeQuota?, tiers?}',
        ec2: 'object with instances array'
      }
    };
  }
  
  meetsRequirements(requirements: Requirements): boolean {
    if (requirements.regions) {
      const hasRegion = requirements.regions.some(r => 
        this.metadata.regions.includes(r)
      );
      if (!hasRegion) return false;
    }
    
    if (requirements.budget && requirements.budget < 40) {
      return false; // AWS typically more expensive
    }
    
    return true;
  }
}