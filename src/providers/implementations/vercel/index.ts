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
  ServiceCapabilities,
  Cost,
  Runtime,
  ScalingOption,
  DataExtractionConfig
} from '../../base/provider.interface';
import { AbstractService } from '../../base/service.interface';
import { DataLoader as DataLoaderImpl } from '../../../data/storage/data-loader';

// Vercel Hosting Service
class VercelHostingService extends AbstractService implements HostingService {
  supportedRuntimes: Runtime[] = [
    { name: 'Node.js', version: '18.x', supported: true },
    { name: 'Node.js', version: '16.x', supported: true },
    { name: 'Python', version: '3.9', supported: true },
    { name: 'Go', version: '1.x', supported: true },
    { name: 'Ruby', version: '3.x', supported: true }
  ];
  
  scalingOptions: ScalingOption[] = [
    { type: 'serverless', minInstances: 0, maxInstances: 1000 },
    { type: 'automatic', scalingMetric: 'cpu' }
  ];
  
  constructor() {
    super('Vercel Hosting');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global'],
      features: [
        'serverless',
        'edge-functions',
        'automatic-ssl',
        'custom-domains',
        'git-integration',
        'preview-deployments'
      ],
      limits: {
        bandwidth: 1000, // GB for Pro tier
        builds: 6000, // minutes
        functions: 1000000 // invocations
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const bandwidthCost = this.calculateBandwidthCost(usage.bandwidth || 0);
    const computeCost = this.calculateComputeCost(usage.compute || 0);
    
    return {
      amount: bandwidthCost + computeCost,
      currency: 'USD',
      breakdown: {
        bandwidth: bandwidthCost,
        compute: computeCost
      }
    };
  }
  
  calculateBandwidthCost(gb: number): number {
    // Vercel bandwidth pricing: 100GB free, then $0.06/GB
    const freeQuota = 100;
    const pricePerGB = 0.06;
    
    if (gb <= freeQuota) return 0;
    return (gb - freeQuota) * pricePerGB;
  }
  
  calculateComputeCost(hours: number): number {
    // Vercel compute pricing: 1000 hours free, then $0.01/hour
    const freeQuota = 1000;
    const pricePerHour = 0.01;
    
    if (hours <= freeQuota) return 0;
    return (hours - freeQuota) * pricePerHour;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.framework && !this.supportedRuntimes.some(r => r.name === config.framework)) {
      errors.push(`Unsupported framework: ${config.framework}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Vercel Edge/CDN Service
class VercelEdgeService extends AbstractService implements CDNService {
  edgeLocations: string[] = [
    'iad1', 'sfo1', 'pdx1', 'lhr1', 'cdg1', 'dub1', 'fra1', 'arn1',
    'bom1', 'gru1', 'hnd1', 'icn1', 'kix1', 'sin1', 'syd1'
  ];
  
  constructor() {
    super('Vercel Edge Network');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: this.edgeLocations,
      features: [
        'edge-caching',
        'image-optimization',
        'edge-middleware',
        'geo-routing',
        'ddos-protection'
      ]
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const bandwidthCost = this.calculateBandwidthCost(usage.bandwidth || 0);
    const requestCost = this.calculateRequestCost(usage.requests || 0);
    
    return {
      amount: bandwidthCost + requestCost,
      currency: 'USD',
      breakdown: {
        bandwidth: bandwidthCost,
        requests: requestCost
      }
    };
  }
  
  calculateBandwidthCost(_gb: number): number {
    // Included in hosting bandwidth
    return 0;
  }
  
  calculateRequestCost(requests: number): number {
    // Vercel edge requests: 10M free, then $0.65/million
    const freeQuota = 10000000; // 10 million
    const pricePerMillion = 0.65;
    
    if (requests <= freeQuota) return 0;
    return ((requests - freeQuota) / 1000000) * pricePerMillion;
  }
  
  validateConfiguration(_config: any): ValidationResult {
    return { valid: true };
  }
}

// Vercel Functions Service
class VercelFunctionsService extends AbstractService implements FunctionsService {
  constructor() {
    super('Vercel Functions');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global'],
      features: [
        'serverless-functions',
        'edge-functions',
        'background-functions',
        'cron-jobs',
        'websockets'
      ],
      limits: {
        timeout: 60, // seconds for Pro
        memory: 3008, // MB
        payload: 4.5 // MB
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const invocationCost = this.calculateInvocationCost(usage.requests || 0);
    const computeCost = this.calculateComputeCost(usage.compute || 0);
    
    return {
      amount: invocationCost + computeCost,
      currency: 'USD',
      breakdown: {
        invocations: invocationCost,
        compute: computeCost
      }
    };
  }
  
  calculateInvocationCost(invocations: number): number {
    // Vercel functions: 1M free, then $0.40/million
    const freeQuota = 1000000;
    const pricePerMillion = 0.40;
    
    if (invocations <= freeQuota) return 0;
    return ((invocations - freeQuota) / 1000000) * pricePerMillion;
  }
  
  calculateComputeCost(gbSeconds: number): number {
    // Vercel compute: 1000 hours free, then $0.01/hour
    const freeQuotaHours = 1000;
    const freeQuotaSeconds = freeQuotaHours * 3600;
    const pricePerHour = 0.01;
    const pricePerSecond = pricePerHour / 3600;
    
    if (gbSeconds <= freeQuotaSeconds) return 0;
    return (gbSeconds - freeQuotaSeconds) * pricePerSecond;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.timeout && config.timeout > 60) {
      errors.push('Function timeout cannot exceed 60 seconds on Pro tier');
    }
    
    if (config.memory && config.memory > 3008) {
      errors.push('Function memory cannot exceed 3008 MB');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Vercel Data Loader
class VercelDataLoader implements DataLoader {
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

// Vercel Price Calculator
class VercelPriceCalculator implements PriceCalculator {
  calculateCost(usage: Usage, pricing: PricingData): CostBreakdown {
    // Determine tier based on usage
    const tier = this.selectTier(usage, pricing);
    const baseCost = tier.basePrice;
    
    const serviceCosts: Record<string, number> = {
      base: baseCost
    };
    
    // Calculate bandwidth overage from JSON pricing
    if (usage.bandwidth && usage.bandwidth > (tier.limits.bandwidth || 0)) {
      const overage = usage.bandwidth - (tier.limits.bandwidth || 0);
      const bandwidthService = pricing.services?.find((s: any) => s.name === 'bandwidth');
      serviceCosts.bandwidth = overage * (bandwidthService?.price || 0);
    }
    
    // Calculate function invocations overage from JSON pricing
    if (usage.requests && usage.requests > (tier.limits.functions || 0)) {
      const overage = usage.requests - (tier.limits.functions || 0);
      const functionsService = pricing.services?.find((s: any) => s.name === 'functions');
      const pricePerMillion = (functionsService?.price || 0) * 1000000;
      serviceCosts.functions = (overage / 1000000) * pricePerMillion;
    }
    
    // Calculate compute overage (GB-hours) from JSON pricing
    if (usage.compute && usage.compute > (tier.limits.compute || 0)) {
      const overage = usage.compute - (tier.limits.compute || 0);
      const computeService = pricing.services?.find((s: any) => s.name === 'compute');
      serviceCosts.compute = overage * (computeService?.price || 0);
    }
    
    const totalCost = Object.values(serviceCosts).reduce((sum, cost) => sum + cost, 0);
    
    return {
      baseCost,
      serviceCosts,
      totalCost,
      currency: pricing.currency || 'USD',
      period: usage.period || 'monthly',
      details: [
        `Tier: ${tier.name}`,
        `Included bandwidth: ${tier.limits.bandwidth || 0} GB`,
        `Included functions: ${tier.limits.functions || 0} invocations`
      ]
    };
  }
  
  calculateMonthlyEstimate(usage: Usage, pricing: PricingData): number {
    const breakdown = this.calculateCost({ ...usage, period: 'monthly' }, pricing);
    return breakdown.totalCost;
  }
  
  calculateYearlyEstimate(usage: Usage, pricing: PricingData): number {
    const monthly = this.calculateMonthlyEstimate(usage, pricing);
    // Apply 20% discount for annual billing
    return monthly * 12 * 0.8;
  }
  
  private selectTier(_usage: Usage, pricing: PricingData): any {
    // Default to Pro tier if no specific tier selection logic
    const proTier = pricing.tiers?.find(t => t.name === 'Pro');
    if (proTier) return proTier;
    
    // Fallback to first tier or default
    return pricing.tiers?.[0] || {
      name: 'Pro',
      basePrice: 20,
      limits: {
        bandwidth: 100,
        functions: 1000000,
        compute: 1000
      },
      features: []
    };
  }
}

// Vercel Validator
class VercelValidator implements ProviderValidator {
  validate(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.framework) {
      warnings.push('No framework specified, will use auto-detection');
    }
    
    if (config.regions && !config.regions.includes('global')) {
      warnings.push('Vercel deploys globally by default');
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
    
    if (!pricing.currency) {
      errors.push('Currency not specified');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Main Vercel Provider
export class VercelProvider implements Provider {
  name = 'vercel';
  version = '1.0.0';
  
  services: ProviderServices = {
    hosting: new VercelHostingService(),
    cdn: new VercelEdgeService(),
    functions: new VercelFunctionsService()
  };
  
  dataLoader = new VercelDataLoader();
  priceCalculator = new VercelPriceCalculator();
  validator = new VercelValidator();
  
  metadata: ProviderMetadata = {
    name: 'Vercel',
    website: 'https://vercel.com',
    regions: ['global'],
    supportedFrameworks: ['Next.js', 'React', 'Vue', 'Svelte', 'Angular', 'Nuxt', 'Gatsby', 'Remix'],
    pricingUrl: 'https://vercel.com/pricing',
    description: 'Frontend cloud platform for deploying and scaling web applications'
  };
  
  dataExtraction: DataExtractionConfig = {
    prompt: `Extract pricing information from Vercel's pricing page.
Focus on:
- Pricing tiers (Hobby, Pro, Enterprise)
- Base costs for each tier
- Included resources (bandwidth, build minutes, function invocations)
- Overage pricing for bandwidth, functions, and compute
- Team member costs
- Analytics and monitoring features

Return structured data matching the provided schema.`,
    schema: {
      provider: 'vercel',
      tiers: [
        {
          name: 'string',
          basePrice: 'number',
          limits: {
            bandwidth: 'number (GB)',
            buildMinutes: 'number',
            functions: 'number (invocations)',
            compute: 'number (GB-hours)',
            teamMembers: 'number'
          },
          features: ['array of feature strings']
        }
      ],
      overages: {
        bandwidth: 'number ($ per GB)',
        functions: 'number ($ per million invocations)',
        compute: 'number ($ per GB-hour)',
        teamMembers: 'number ($ per member)'
      },
      services: [
        {
          name: 'string',
          unit: 'string',
          price: 'number',
          freeQuota: 'number (optional)'
        }
      ],
      billingPeriod: 'monthly | yearly',
      currency: 'USD'
    },
    exampleResponse: {
      provider: 'vercel',
      tiers: [
        {
          name: 'Hobby',
          basePrice: 0,
          limits: {
            bandwidth: 100,
            buildMinutes: 6000,
            functions: 1000000,
            compute: 100,
            teamMembers: 1
          },
          features: ['Personal use', 'Community support', 'HTTPS']
        },
        {
          name: 'Pro',
          basePrice: 20,
          limits: {
            bandwidth: 1000,
            buildMinutes: 6000,
            functions: 1000000,
            compute: 1000,
            teamMembers: 1
          },
          features: ['Commercial use', 'Email support', 'Custom domains', 'Analytics']
        }
      ],
      overages: {
        bandwidth: 0.15,
        functions: 0.60,
        compute: 0.18,
        teamMembers: 20
      },
      billingPeriod: 'monthly',
      currency: 'USD'
    }
  };
  
  async initialize(): Promise<void> {
    // Any initialization logic if needed
    console.log(`Initializing ${this.name} provider v${this.version}`);
  }
  
  meetsRequirements(requirements: Requirements): boolean {
    // Check if Vercel meets the requirements
    if (requirements.regions && requirements.regions.length > 0) {
      // Vercel is global, so it meets any region requirement
      return true;
    }
    
    if (requirements.scalability === 'high') {
      // Vercel has excellent scalability
      return true;
    }
    
    if (requirements.features) {
      const availableFeatures = [
        'serverless',
        'edge-functions',
        'automatic-ssl',
        'custom-domains',
        'git-integration',
        'preview-deployments'
      ];
      
      return requirements.features.every(f => availableFeatures.includes(f));
    }
    
    return true;
  }
}

// Export default instance
export default new VercelProvider();