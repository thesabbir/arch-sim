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

// AWS App Runner Service (Container/Web App Hosting)
class AWSAppRunnerService extends AbstractService implements HostingService {
  supportedRuntimes: Runtime[] = [
    { name: 'Node.js', version: '18', supported: true },
    { name: 'Node.js', version: '16', supported: true },
    { name: 'Python', version: '3.11', supported: true },
    { name: 'Python', version: '3.10', supported: true },
    { name: 'Java', version: '11', supported: true },
    { name: 'Java', version: '8', supported: true },
    { name: '.NET', version: '6', supported: true },
    { name: 'Go', version: '1.x', supported: true },
    { name: 'Ruby', version: '3.x', supported: true },
    { name: 'PHP', version: '8.1', supported: true },
    { name: 'Docker', version: 'latest', supported: true }
  ];
  
  scalingOptions: ScalingOption[] = [
    { type: 'automatic', minInstances: 1, maxInstances: 25, scalingMetric: 'concurrent-requests' },
    { type: 'manual', minInstances: 1, maxInstances: 10 }
  ];
  
  constructor() {
    super('AWS App Runner');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'],
      features: [
        'automatic-scaling',
        'managed-tls',
        'custom-domains',
        'vpc-connector',
        'github-integration',
        'ecr-integration',
        'load-balancing',
        'health-checks',
        'zero-downtime-deployment'
      ],
      limits: {
        memory: 4096, // MB per instance
        cpu: 2, // vCPUs per instance
        instances: 25, // max concurrent instances
        requestTimeout: 120 // seconds
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const computeCost = this.calculateComputeCost(usage.compute || 0);
    const bandwidthCost = this.calculateBandwidthCost(usage.bandwidth || 0);
    
    return {
      amount: computeCost + bandwidthCost,
      currency: 'USD',
      breakdown: {
        compute: computeCost,
        bandwidth: bandwidthCost
      }
    };
  }
  
  calculateBandwidthCost(gb: number): number {
    // AWS App Runner includes first 100GB/month free
    if (gb <= 100) return 0;
    // $0.09 per GB after that
    return (gb - 100) * 0.09;
  }
  
  calculateComputeCost(hours: number): number {
    // App Runner pricing: per vCPU-hour and per GB-hour
    // Default: 0.5 vCPU, 1 GB memory
    const vcpuHours = hours * 0.5;
    const gbHours = hours * 1;
    
    // $0.064 per vCPU-hour
    const vcpuCost = vcpuHours * 0.064;
    // $0.007 per GB-hour
    const memoryCost = gbHours * 0.007;
    
    return vcpuCost + memoryCost;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.memory && config.memory > 4096) {
      errors.push('Memory cannot exceed 4096 MB per instance');
    }
    
    if (config.cpu && config.cpu > 2) {
      errors.push('CPU cannot exceed 2 vCPUs per instance');
    }
    
    if (config.instances && config.instances > 25) {
      errors.push('Cannot exceed 25 concurrent instances');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// AWS RDS Service (Managed Database)
class AWSRDSService extends AbstractService implements DatabaseService {
  supportedEngines: string[] = [
    'mysql',
    'postgresql',
    'mariadb',
    'aurora-mysql',
    'aurora-postgresql'
  ];
  
  constructor() {
    super('AWS RDS');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'],
      features: [
        'automated-backups',
        'point-in-time-recovery',
        'multi-az',
        'read-replicas',
        'encryption-at-rest',
        'encryption-in-transit',
        'automated-patching',
        'monitoring',
        'performance-insights'
      ],
      limits: {
        storage: 64000, // GB max for standard instances
        iops: 256000, // max IOPS
        connections: 5000 // max connections
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    // Assuming db.t3.micro for web applications (1 vCPU, 1 GB RAM)
    const instanceCost = this.calculateInstanceCost();
    const storageCost = this.calculateStorageCost(usage.storage || 20); // Default 20GB
    const backupCost = this.calculateBackupCost(usage.storage || 20);
    
    return {
      amount: instanceCost + storageCost + backupCost,
      currency: 'USD',
      breakdown: {
        instance: instanceCost,
        storage: storageCost,
        backup: backupCost
      }
    };
  }
  
  private calculateInstanceCost(): number {
    // db.t3.micro: ~$0.017 per hour = ~$12.41 per month
    return 12.41;
  }
  
  calculateStorageCost(gb: number): number {
    // General Purpose SSD (gp3): $0.08 per GB-month
    return gb * 0.08;
  }
  
  calculateOperationsCost(operations: number): number {
    // I/O requests: $0.10 per million requests (for gp2)
    return (operations / 1000000) * 0.10;
  }
  
  private calculateBackupCost(gb: number): number {
    // Backup storage: First GB free, then $0.095 per GB-month
    if (gb <= 1) return 0;
    return (gb - 1) * 0.095;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.engine && !this.supportedEngines.includes(config.engine)) {
      errors.push(`Unsupported database engine: ${config.engine}`);
    }
    
    if (config.storage && config.storage > 64000) {
      errors.push('Storage cannot exceed 64TB for standard instances');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// AWS S3 Service (Object Storage)
class AWSS3Service extends AbstractService implements StorageService {
  constructor() {
    super('AWS S3');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'],
      features: [
        'object-storage',
        'static-website-hosting',
        'versioning',
        'lifecycle-policies',
        'encryption',
        'access-control',
        'cloudfront-integration',
        'event-notifications',
        'cross-region-replication',
        'intelligent-tiering'
      ],
      limits: {
        objectSize: 5000000, // 5TB max object size
        buckets: 100, // default bucket limit per account
        requestRate: 3500 // PUT/COPY/POST/DELETE per second
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const storageCost = this.calculateStorageCost(usage.storage || 0);
    const requestCost = this.calculateRequestCost(usage.requests || 0);
    const bandwidthCost = this.calculateBandwidthCost(usage.bandwidth || 0);
    
    return {
      amount: storageCost + requestCost + bandwidthCost,
      currency: 'USD',
      breakdown: {
        storage: storageCost,
        requests: requestCost,
        bandwidth: bandwidthCost
      }
    };
  }
  
  calculateStorageCost(gb: number): number {
    // S3 Standard: $0.023 per GB for first 50TB
    if (gb <= 50000) {
      return gb * 0.023;
    }
    // $0.022 per GB for next 450TB
    const first50TB = 50000 * 0.023;
    const remaining = (gb - 50000) * 0.022;
    return first50TB + remaining;
  }
  
  calculateOperationsCost(operations: number): number {
    return this.calculateRequestCost(operations);
  }
  
  private calculateRequestCost(requests: number): number {
    // PUT, COPY, POST, LIST: $0.005 per 1,000 requests
    // GET, SELECT: $0.0004 per 1,000 requests
    // Assuming 80% GET, 20% PUT for typical web app
    const getRequests = requests * 0.8;
    const putRequests = requests * 0.2;
    
    const getCost = (getRequests / 1000) * 0.0004;
    const putCost = (putRequests / 1000) * 0.005;
    
    return getCost + putCost;
  }
  
  private calculateBandwidthCost(gb: number): number {
    // Data transfer OUT to Internet
    if (gb <= 1) return 0; // First GB free
    if (gb <= 10000) {
      // Next 9.999 TB: $0.09 per GB
      return (gb - 1) * 0.09;
    }
    // Next 40 TB: $0.085 per GB
    const first10TB = 9999 * 0.09;
    const remaining = (gb - 10000) * 0.085;
    return first10TB + remaining;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.storageClass && !['STANDARD', 'STANDARD_IA', 'GLACIER'].includes(config.storageClass)) {
      errors.push(`Invalid storage class: ${config.storageClass}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
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
    const serviceCosts: Record<string, number> = {};
    
    // App Runner compute costs
    const computeHours = usage.compute || 720; // Default 720 hours/month
    const vcpuCost = computeHours * 0.5 * 0.064; // 0.5 vCPU
    const memoryCost = computeHours * 1 * 0.007; // 1 GB memory
    serviceCosts.appRunner = vcpuCost + memoryCost;
    
    // RDS costs (db.t3.micro)
    serviceCosts.rds = 12.41; // Monthly instance cost
    const dbStorage = Math.max(usage.storage || 0, 20); // Minimum 20GB for RDS
    serviceCosts.rdsStorage = dbStorage * 0.08;
    
    // S3 costs
    const s3Storage = usage.storage || 0;
    serviceCosts.s3Storage = s3Storage * 0.023;
    
    // Bandwidth costs (combined)
    const bandwidth = usage.bandwidth || 0;
    if (bandwidth > 101) { // First GB free, App Runner includes 100GB
      serviceCosts.bandwidth = (bandwidth - 101) * 0.09;
    }
    
    // Request costs
    if (usage.requests) {
      const getRequests = usage.requests * 0.8;
      const putRequests = usage.requests * 0.2;
      serviceCosts.requests = (getRequests / 1000) * 0.0004 + (putRequests / 1000) * 0.005;
    }
    
    const totalCost = Object.values(serviceCosts).reduce((sum, cost) => sum + cost, 0);
    
    return {
      baseCost: 0, // AWS is pay-as-you-go
      serviceCosts,
      totalCost,
      currency: pricing.currency || 'USD',
      period: usage.period || 'monthly',
      details: [
        'App Runner: 0.5 vCPU, 1GB RAM',
        'RDS: db.t3.micro instance',
        `Storage: ${dbStorage}GB RDS, ${s3Storage}GB S3`,
        `Bandwidth: ${bandwidth}GB/month`
      ]
    };
  }
  
  calculateMonthlyEstimate(usage: Usage, pricing: PricingData): number {
    const breakdown = this.calculateCost({ ...usage, period: 'monthly' }, pricing);
    return breakdown.totalCost;
  }
  
  calculateYearlyEstimate(usage: Usage, pricing: PricingData): number {
    const monthly = this.calculateMonthlyEstimate(usage, pricing);
    // AWS offers some reserved instance discounts, estimate 15% for annual
    return monthly * 12 * 0.85;
  }
}

// AWS Validator
class AWSValidator implements ProviderValidator {
  validate(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.region) {
      warnings.push('No region specified, will use us-east-1 by default');
    }
    
    if (config.services && !Array.isArray(config.services)) {
      errors.push('Services must be an array');
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
    
    if (!pricing.currency) {
      errors.push('Currency not specified');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Main AWS Provider
export class AWSProvider implements Provider {
  name = 'aws';
  version = '1.0.0';
  
  services: ProviderServices = {
    hosting: new AWSAppRunnerService(),
    database: new AWSRDSService(),
    storage: new AWSS3Service()
  };
  
  dataLoader = new AWSDataLoader();
  priceCalculator = new AWSPriceCalculator();
  validator = new AWSValidator();
  
  metadata: ProviderMetadata = {
    name: 'Amazon Web Services',
    website: 'https://aws.amazon.com',
    regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'],
    supportedFrameworks: ['Node.js', 'Python', 'Java', '.NET', 'Go', 'Ruby', 'PHP', 'Docker'],
    pricingUrl: 'https://aws.amazon.com/pricing/',
    description: 'AWS services for web applications: App Runner, RDS, and S3'
  };
  
  dataExtraction: DataExtractionConfig = {
    prompt: `Extract pricing information from AWS pricing pages.
Focus on:
- App Runner pricing (vCPU, memory, requests)
- RDS database pricing (instance types, storage)
- S3 storage pricing (storage classes, data transfer)
- EC2 instance pricing for common web app sizes
- Data transfer costs
- Free tier limits

Return structured data matching the provided schema.`,
    schema: {
      provider: 'aws',
      services: [
        {
          name: 'string (e.g., App Runner, RDS, S3)',
          category: 'hosting | database | storage',
          pricing: {
            unit: 'string (e.g., vCPU-hour, GB-month)',
            price: 'number',
            freeQuota: 'number (optional)',
            tiers: [
              {
                limit: 'number',
                price: 'number'
              }
            ]
          }
        }
      ],
      dataTransfer: {
        inbound: 'number ($ per GB)',
        outbound: [
          {
            limit: 'number (GB)',
            price: 'number ($ per GB)'
          }
        ]
      },
      billingPeriod: 'hourly | monthly',
      currency: 'USD'
    },
    exampleResponse: {
      provider: 'aws',
      services: [
        {
          name: 'App Runner',
          category: 'hosting',
          pricing: {
            unit: 'vCPU-hour',
            price: 0.064,
            freeQuota: 0
          }
        },
        {
          name: 'S3 Standard',
          category: 'storage',
          pricing: {
            unit: 'GB-month',
            price: 0.023,
            freeQuota: 5,
            tiers: [
              { limit: 50000, price: 0.023 },
              { limit: 450000, price: 0.022 },
              { limit: null, price: 0.021 }
            ]
          }
        }
      ],
      dataTransfer: {
        inbound: 0,
        outbound: [
          { limit: 1, price: 0 },
          { limit: 10000, price: 0.09 },
          { limit: 40000, price: 0.085 },
          { limit: null, price: 0.05 }
        ]
      },
      billingPeriod: 'monthly',
      currency: 'USD'
    }
  };
  
  async initialize(): Promise<void> {
    console.log(`Initializing ${this.name} provider v${this.version}`);
  }
  
  meetsRequirements(requirements: Requirements): boolean {
    // Check region requirements
    if (requirements.regions && requirements.regions.length > 0) {
      const hasRegion = requirements.regions.some(r => 
        this.metadata.regions.includes(r)
      );
      if (!hasRegion) return false;
    }
    
    // AWS can handle any scalability requirement
    if (requirements.scalability) {
      return true;
    }
    
    // Check features
    if (requirements.features) {
      const availableFeatures = [
        'managed-database',
        'object-storage',
        'auto-scaling',
        'load-balancing',
        'cdn',
        'containers',
        'serverless'
      ];
      
      return requirements.features.every(f => availableFeatures.includes(f));
    }
    
    return true;
  }
}

// Export default instance
export default new AWSProvider();