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

// Netlify Hosting Service
class NetlifyHostingService extends AbstractService implements HostingService {
  supportedRuntimes: Runtime[] = [
    { name: 'Static Sites', version: 'all', supported: true },
    { name: 'Node.js', version: '18.x', supported: true },
    { name: 'Node.js', version: '16.x', supported: true },
    { name: 'React', version: '18.x', supported: true },
    { name: 'Vue', version: '3.x', supported: true },
    { name: 'Angular', version: '15.x', supported: true },
    { name: 'Next.js', version: '13.x', supported: true },
    { name: 'Gatsby', version: '5.x', supported: true },
    { name: 'Hugo', version: 'latest', supported: true }
  ];
  
  scalingOptions: ScalingOption[] = [
    { type: 'automatic', scalingMetric: 'traffic' },
    { type: 'serverless' }
  ];
  
  constructor() {
    super('Netlify Hosting');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global'],
      features: [
        'continuous-deployment',
        'instant-rollbacks',
        'split-testing',
        'form-handling',
        'identity-service',
        'git-integration',
        'automatic-ssl',
        'custom-domains',
        'preview-deployments',
        'build-plugins'
      ],
      limits: {
        bandwidth: 100, // GB for free tier
        builds: 300, // minutes for free tier
        concurrent_builds: 1, // for free tier
        sites: 100
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const bandwidthCost = this.calculateBandwidthCost(usage.bandwidth || 0);
    const buildCost = this.calculateComputeCost(usage.compute || 0);
    
    return {
      amount: bandwidthCost + buildCost,
      currency: 'USD',
      breakdown: {
        bandwidth: bandwidthCost,
        builds: buildCost
      }
    };
  }
  
  calculateBandwidthCost(gb: number): number {
    // First 100GB included in free tier
    if (gb <= 100) return 0;
    // $20 per 100GB after that
    return Math.ceil((gb - 100) / 100) * 20;
  }
  
  calculateComputeCost(hours: number): number {
    // Build minutes: 300 free, then $7 per 500 minutes
    const minutes = hours * 60;
    if (minutes <= 300) return 0;
    return Math.ceil((minutes - 300) / 500) * 7;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.buildCommand && typeof config.buildCommand !== 'string') {
      errors.push('Build command must be a string');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Netlify Edge/CDN Service
class NetlifyCDNService extends AbstractService implements CDNService {
  edgeLocations: string[] = [
    'global-cdn',
    'us-east',
    'us-west',
    'europe',
    'asia-pacific',
    'south-america'
  ];
  
  constructor() {
    super('Netlify Edge');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: this.edgeLocations,
      features: [
        'edge-handlers',
        'edge-functions',
        'geo-ip',
        'redirects',
        'headers',
        'proxying',
        'instant-cache-invalidation',
        'ddos-protection'
      ]
    };
  }
  
  calculateCost(_usage: Usage): Cost {
    // CDN is included in hosting bandwidth
    return {
      amount: 0,
      currency: 'USD',
      breakdown: {}
    };
  }
  
  calculateBandwidthCost(_gb: number): number {
    // Included in hosting
    return 0;
  }
  
  calculateRequestCost(_requests: number): number {
    // Included in hosting
    return 0;
  }
  
  validateConfiguration(_config: any): ValidationResult {
    return { valid: true };
  }
}

// Netlify Functions Service
class NetlifyFunctionsService extends AbstractService implements FunctionsService {
  constructor() {
    super('Netlify Functions');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global'],
      features: [
        'serverless-functions',
        'background-functions',
        'scheduled-functions',
        'edge-functions',
        'typescript-support'
      ],
      limits: {
        timeout: 10, // seconds for free tier
        memory: 1024, // MB
        payload: 6, // MB
        invocations: 125000 // per month free tier
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const invocationCost = this.calculateInvocationCost(usage.requests || 0);
    const runtimeCost = this.calculateComputeCost(usage.compute || 0);
    
    return {
      amount: invocationCost + runtimeCost,
      currency: 'USD',
      breakdown: {
        invocations: invocationCost,
        runtime: runtimeCost
      }
    };
  }
  
  calculateInvocationCost(invocations: number): number {
    // First 125k included in free tier
    if (invocations <= 125000) return 0;
    // $25 per 2 million after that
    return Math.ceil((invocations - 125000) / 2000000) * 25;
  }
  
  calculateComputeCost(_gbSeconds: number): number {
    // 100 GB-seconds free, then included in invocation pricing
    return 0;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.timeout && config.timeout > 26) {
      errors.push('Function timeout cannot exceed 26 seconds');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Netlify Data Loader
class NetlifyDataLoader implements DataLoader {
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

// Netlify Price Calculator
class NetlifyPriceCalculator implements PriceCalculator {
  calculateCost(usage: Usage, pricing: PricingData): CostBreakdown {
    // Determine tier based on usage
    const tier = this.selectTier(usage, pricing);
    const baseCost = tier.basePrice;
    
    const serviceCosts: Record<string, number> = {
      base: baseCost
    };
    
    // Calculate bandwidth overage
    if (usage.bandwidth && usage.bandwidth > (tier.limits.bandwidth || 100)) {
      const overage = usage.bandwidth - (tier.limits.bandwidth || 100);
      serviceCosts.bandwidth = Math.ceil(overage / 100) * 20; // $20 per 100GB
    }
    
    // Calculate build minutes overage
    if (usage.compute) {
      const minutes = usage.compute * 60;
      if (minutes > (tier.limits.builds || 300)) {
        const overage = minutes - (tier.limits.builds || 300);
        serviceCosts.builds = Math.ceil(overage / 500) * 7; // $7 per 500 minutes
      }
    }
    
    // Calculate function invocations overage
    if (usage.requests && usage.requests > (tier.limits.functions || 125000)) {
      const overage = usage.requests - (tier.limits.functions || 125000);
      serviceCosts.functions = Math.ceil(overage / 2000000) * 25; // $25 per 2M
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
        `Included bandwidth: ${tier.limits.bandwidth || 100} GB`,
        `Included builds: ${tier.limits.builds || 300} minutes`,
        `Included functions: ${tier.limits.functions || 125000} invocations`
      ]
    };
  }
  
  calculateMonthlyEstimate(usage: Usage, pricing: PricingData): number {
    const breakdown = this.calculateCost({ ...usage, period: 'monthly' }, pricing);
    return breakdown.totalCost;
  }
  
  calculateYearlyEstimate(usage: Usage, pricing: PricingData): number {
    const monthly = this.calculateMonthlyEstimate(usage, pricing);
    // No discount for annual billing
    return monthly * 12;
  }
  
  private selectTier(usage: Usage, pricing: PricingData): any {
    // Simple tier selection based on base requirements
    if (usage.users && usage.users > 1000) {
      const proTier = pricing.tiers?.find(t => t.name === 'Pro');
      if (proTier) return proTier;
    }
    
    // Default to Starter tier
    return pricing.tiers?.find(t => t.name === 'Starter') || pricing.tiers?.[0] || {
      name: 'Starter',
      basePrice: 19,
      limits: {
        bandwidth: 100,
        builds: 300,
        functions: 125000
      },
      features: []
    };
  }
}

// Netlify Validator
class NetlifyValidator implements ProviderValidator {
  validate(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.buildCommand) {
      warnings.push('No build command specified');
    }
    
    if (!config.publishDir) {
      warnings.push('No publish directory specified, will use default');
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

// Main Netlify Provider
export class NetlifyProvider implements Provider {
  name = 'netlify';
  version = '1.0.0';
  
  services: ProviderServices = {
    hosting: new NetlifyHostingService(),
    cdn: new NetlifyCDNService(),
    functions: new NetlifyFunctionsService()
  };
  
  dataLoader = new NetlifyDataLoader();
  priceCalculator = new NetlifyPriceCalculator();
  validator = new NetlifyValidator();
  
  metadata: ProviderMetadata = {
    name: 'Netlify',
    website: 'https://netlify.com',
    regions: ['global'],
    supportedFrameworks: ['React', 'Vue', 'Angular', 'Next.js', 'Gatsby', 'Hugo', 'Jekyll', 'Eleventy'],
    pricingUrl: 'https://www.netlify.com/pricing/',
    description: 'Platform for modern web projects with continuous deployment'
  };
  
  dataExtraction: DataExtractionConfig = {
    prompt: `Extract pricing information from Netlify's pricing page.
Focus on:
- Pricing tiers (Starter, Pro, Business, Enterprise)
- Monthly costs for each tier
- Included bandwidth and build minutes
- Team member limits and costs
- Serverless function execution limits
- Form submissions and identity users
- Analytics features

Return structured data matching the provided schema.`,
    schema: {
      provider: 'netlify',
      tiers: [
        {
          name: 'string',
          basePrice: 'number',
          limits: {
            bandwidth: 'number (GB)',
            buildMinutes: 'number',
            concurrentBuilds: 'number',
            teamMembers: 'number',
            sites: 'number | unlimited',
            functions: 'number (invocations)',
            forms: 'number (submissions)',
            identity: 'number (users)'
          },
          features: ['array of feature strings']
        }
      ],
      overages: {
        bandwidth: 'number ($ per GB)',
        buildMinutes: 'number ($ per minute)',
        functions: 'number ($ per million)',
        forms: 'number ($ per 100)',
        identity: 'number ($ per 100 users)'
      },
      billingPeriod: 'monthly',
      currency: 'USD'
    },
    exampleResponse: {
      provider: 'netlify',
      tiers: [
        {
          name: 'Starter',
          basePrice: 0,
          limits: {
            bandwidth: 100,
            buildMinutes: 300,
            concurrentBuilds: 1,
            teamMembers: 1,
            sites: 'unlimited',
            functions: 125000,
            forms: 100,
            identity: 1000
          },
          features: ['Instant rollbacks', 'Deploy previews', 'Custom domain']
        },
        {
          name: 'Pro',
          basePrice: 19,
          limits: {
            bandwidth: 400,
            buildMinutes: 25000,
            concurrentBuilds: 3,
            teamMembers: 3,
            sites: 'unlimited',
            functions: 125000,
            forms: 1000,
            identity: 5000
          },
          features: ['Everything in Starter', 'Password protection', 'Analytics', 'Background functions']
        }
      ],
      overages: {
        bandwidth: 0.20,
        buildMinutes: 0.01,
        functions: 2.00,
        forms: 1.00,
        identity: 0.99
      },
      billingPeriod: 'monthly',
      currency: 'USD'
    }
  };
  
  async initialize(): Promise<void> {
    console.log(`Initializing ${this.name} provider v${this.version}`);
  }
  
  meetsRequirements(requirements: Requirements): boolean {
    // Netlify is global
    if (requirements.regions) {
      return true;
    }
    
    if (requirements.scalability) {
      return true; // Good for static and JAMstack
    }
    
    if (requirements.features) {
      const availableFeatures = [
        'static-hosting',
        'serverless',
        'continuous-deployment',
        'forms',
        'identity',
        'split-testing'
      ];
      
      return requirements.features.every(f => availableFeatures.includes(f));
    }
    
    return true;
  }
}

// Export default instance
export default new NetlifyProvider();