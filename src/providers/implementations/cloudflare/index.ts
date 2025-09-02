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
  CDNService,
  FunctionsService,
  DatabaseService,
  StorageService,
  ServiceCapabilities,
  Cost,
  Runtime,
  ScalingOption
} from '../../base/provider.interface';
import { AbstractService } from '../../base/service.interface';
import { DataLoader as DataLoaderImpl } from '../../../data/storage/data-loader';

// Cloudflare Pages Service
class CloudflarePagesService extends AbstractService implements HostingService {
  supportedRuntimes: Runtime[] = [
    { name: 'Static Sites', version: 'all', supported: true },
    { name: 'React', version: '18', supported: true },
    { name: 'Vue', version: '3', supported: true },
    { name: 'Svelte', version: '4', supported: true },
    { name: 'Next.js', version: '13', supported: true },
    { name: 'Nuxt', version: '3', supported: true },
    { name: 'Astro', version: '3', supported: true }
  ];
  
  scalingOptions: ScalingOption[] = [
    { type: 'automatic', scalingMetric: 'global-cdn' }
  ];
  
  constructor() {
    super('Cloudflare Pages');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global'],
      features: [
        'unlimited-bandwidth',
        'global-cdn',
        'automatic-ssl',
        'custom-domains',
        'preview-deployments',
        'git-integration',
        'web-analytics',
        'ddos-protection',
        'edge-redirects',
        'functions-integration'
      ],
      limits: {
        builds: 500, // per month free
        concurrent_builds: 1, // free tier
        files: 20000,
        file_size: 25 // MB
      }
    };
  }
  
  calculateCost(_usage: Usage): Cost {
    // Pages is free for unlimited sites and bandwidth
    return {
      amount: 0,
      currency: 'USD',
      breakdown: {}
    };
  }
  
  calculateBandwidthCost(_gb: number): number {
    return 0; // Unlimited free
  }
  
  calculateComputeCost(_hours: number): number {
    return 0; // Build time included
  }
  
  validateConfiguration(_config: any): ValidationResult {
    return { valid: true };
  }
}

// Cloudflare Workers Service (Edge Functions)
class CloudflareWorkersService extends AbstractService implements FunctionsService {
  constructor() {
    super('Cloudflare Workers');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global-edge'],
      features: [
        'edge-computing',
        'zero-cold-starts',
        'websockets',
        'cron-triggers',
        'kv-storage',
        'durable-objects',
        'r2-integration',
        'd1-integration',
        'queues',
        'analytics-engine'
      ],
      limits: {
        requests: 100000, // per day free
        cpu_time: 10, // ms per invocation
        memory: 128, // MB
        script_size: 1 // MB
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const requestCost = this.calculateInvocationCost(usage.requests || 0);
    
    return {
      amount: requestCost,
      currency: 'USD',
      breakdown: {
        requests: requestCost
      }
    };
  }
  
  calculateInvocationCost(invocations: number): number {
    // First 100k requests/day (3M/month) free
    if (invocations <= 3000000) return 0;
    // $0.15 per million after that on paid plan ($5/mo includes 10M)
    if (invocations <= 10000000) return 5; // Paid plan
    return 5 + ((invocations - 10000000) / 1000000) * 0.15;
  }
  
  calculateComputeCost(_gbSeconds: number): number {
    // CPU time included in request pricing
    return 0;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.cpu_time && config.cpu_time > 30000) {
      errors.push('CPU time cannot exceed 30 seconds on paid plan');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Cloudflare D1 Database Service
class CloudflareD1Service extends AbstractService implements DatabaseService {
  supportedEngines: string[] = ['sqlite'];
  
  constructor() {
    super('Cloudflare D1');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global-edge'],
      features: [
        'serverless-sql',
        'automatic-replication',
        'point-in-time-recovery',
        'read-replicas',
        'edge-consistency',
        'worker-integration'
      ],
      limits: {
        databases: 10, // free tier
        storage: 5, // GB free
        reads: 5000000, // per day free
        writes: 100000 // per day free
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
    // First 5GB free
    if (gb <= 5) return 0;
    // $0.75 per GB after that
    return (gb - 5) * 0.75;
  }
  
  calculateOperationsCost(_operations: number): number {
    // Operations included in free tier or Workers pricing
    return 0;
  }
  
  validateConfiguration(_config: any): ValidationResult {
    return { valid: true };
  }
}

// Cloudflare R2 Storage Service
class CloudflareR2Service extends AbstractService implements StorageService {
  constructor() {
    super('Cloudflare R2');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global'],
      features: [
        's3-compatible',
        'zero-egress-fees',
        'automatic-replication',
        'worker-integration',
        'presigned-urls',
        'multipart-uploads',
        'lifecycle-policies'
      ],
      limits: {
        storage: 10, // GB free
        operations_a: 1000000, // Class A ops/month free
        operations_b: 10000000 // Class B ops/month free
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const storageCost = this.calculateStorageCost(usage.storage || 0);
    
    return {
      amount: storageCost,
      currency: 'USD',
      breakdown: {
        storage: storageCost,
        egress: 0 // Zero egress fees!
      }
    };
  }
  
  calculateStorageCost(gb: number): number {
    // First 10GB free
    if (gb <= 10) return 0;
    // $0.015 per GB/month after that
    return (gb - 10) * 0.015;
  }
  
  calculateOperationsCost(operations: number): number {
    // Class A: 1M free, then $4.50 per million
    // Class B: 10M free, then $0.36 per million
    // Assuming 20% Class A, 80% Class B
    const classA = operations * 0.2;
    const classB = operations * 0.8;
    
    let cost = 0;
    if (classA > 1000000) {
      cost += ((classA - 1000000) / 1000000) * 4.50;
    }
    if (classB > 10000000) {
      cost += ((classB - 10000000) / 1000000) * 0.36;
    }
    
    return cost;
  }
  
  validateConfiguration(_config: any): ValidationResult {
    return { valid: true };
  }
}

// Cloudflare CDN Service
class CloudflareCDNService extends AbstractService implements CDNService {
  edgeLocations: string[] = ['200+ cities globally'];
  
  constructor() {
    super('Cloudflare CDN');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global'],
      features: [
        'unlimited-bandwidth',
        'ddos-protection',
        'web-application-firewall',
        'image-optimization',
        'minification',
        'brotli-compression',
        'http3-quic',
        'cache-analytics',
        'page-rules'
      ]
    };
  }
  
  calculateCost(_usage: Usage): Cost {
    // Free tier includes unlimited bandwidth
    return {
      amount: 0,
      currency: 'USD',
      breakdown: {}
    };
  }
  
  calculateBandwidthCost(_gb: number): number {
    return 0; // Unlimited free
  }
  
  calculateRequestCost(_requests: number): number {
    return 0; // Unlimited free
  }
  
  validateConfiguration(_config: any): ValidationResult {
    return { valid: true };
  }
}

// Cloudflare Data Loader
class CloudflareDataLoader implements DataLoader {
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

// Cloudflare Price Calculator
class CloudflarePriceCalculator implements PriceCalculator {
  calculateCost(usage: Usage, pricing: PricingData): CostBreakdown {
    const serviceCosts: Record<string, number> = {};
    
    // Pages - Free
    serviceCosts.pages = 0;
    
    // Workers - Check if needs paid plan
    if (usage.requests && usage.requests > 3000000) {
      serviceCosts.workers = 5; // Base paid plan
      if (usage.requests > 10000000) {
        serviceCosts.workers += ((usage.requests - 10000000) / 1000000) * 0.15;
      }
    }
    
    // D1 - Storage costs
    if (usage.storage && usage.storage > 5) {
      serviceCosts.d1 = (usage.storage - 5) * 0.75;
    }
    
    // R2 - Storage costs (cheaper than D1 for large storage)
    if (usage.storage && usage.storage > 10) {
      serviceCosts.r2 = (usage.storage - 10) * 0.015;
    }
    
    const totalCost = Object.values(serviceCosts).reduce((sum, cost) => sum + cost, 0);
    
    return {
      baseCost: 0,
      serviceCosts,
      totalCost,
      currency: pricing.currency || 'USD',
      period: usage.period || 'monthly',
      details: [
        'Pages: Unlimited sites & bandwidth (free)',
        'Workers: 100k requests/day free',
        'D1: 5GB storage free',
        'R2: 10GB storage, zero egress fees',
        'CDN: Unlimited bandwidth (free)'
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

// Cloudflare Validator
class CloudflareValidator implements ProviderValidator {
  validate(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (config.workers && config.workers > 100) {
      warnings.push('High number of workers may require Enterprise plan');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  validatePricing(_pricing: any): ValidationResult {
    return { valid: true };
  }
}

// Main Cloudflare Provider
export class CloudflareProvider implements Provider {
  name = 'cloudflare';
  version = '1.0.0';
  
  services: ProviderServices = {
    hosting: new CloudflarePagesService(),
    functions: new CloudflareWorkersService(),
    database: new CloudflareD1Service(),
    storage: new CloudflareR2Service(),
    cdn: new CloudflareCDNService()
  };
  
  dataLoader = new CloudflareDataLoader();
  priceCalculator = new CloudflarePriceCalculator();
  validator = new CloudflareValidator();
  
  metadata: ProviderMetadata = {
    name: 'Cloudflare',
    website: 'https://cloudflare.com',
    regions: ['global'],
    supportedFrameworks: ['Static Sites', 'React', 'Vue', 'Next.js', 'Nuxt', 'Astro', 'Workers'],
    pricingUrl: 'https://www.cloudflare.com/plans/developer-platform/',
    description: 'Global edge platform with Pages, Workers, D1, R2, and CDN'
  };
  
  async initialize(): Promise<void> {
    console.log(`Initializing ${this.name} provider v${this.version}`);
  }
  
  meetsRequirements(requirements: Requirements): boolean {
    if (requirements.regions) {
      return true; // Global coverage
    }
    
    if (requirements.scalability === 'high') {
      return true; // Excellent edge scaling
    }
    
    if (requirements.features) {
      const availableFeatures = [
        'edge-computing',
        'static-hosting',
        'serverless',
        'cdn',
        'database',
        'object-storage',
        'zero-egress'
      ];
      
      return requirements.features.every(f => availableFeatures.includes(f));
    }
    
    return true;
  }
}

// Export default instance
export default new CloudflareProvider();