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

class PlanetScaleDatabaseService extends AbstractService implements DatabaseService {
  supportedEngines: string[] = ['mysql'];
  
  constructor() {
    super('PlanetScale Database');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['us-east', 'us-west', 'eu-west', 'ap-south', 'ap-northeast'],
      features: [
        'serverless-mysql',
        'branching',
        'non-blocking-schema-changes',
        'automatic-backups',
        'point-in-time-recovery',
        'connection-pooling',
        'query-insights'
      ],
      limits: {
        storage: 5,
        reads: 1000000000,
        writes: 10000000
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const storageCost = this.calculateStorageCost(usage.storage || 0);
    const operationsCost = this.calculateOperationsCost(usage.requests || 0);
    
    return {
      amount: storageCost + operationsCost,
      currency: 'USD',
      breakdown: {
        storage: storageCost,
        operations: operationsCost
      }
    };
  }
  
  calculateStorageCost(gb: number): number {
    if (gb <= 10) return 0;
    return (gb - 10) * 1.5;
  }
  
  calculateOperationsCost(operations: number): number {
    const reads = operations * 0.7;
    const writes = operations * 0.3;
    let cost = 0;
    
    if (reads > 1000000000) {
      cost += ((reads - 1000000000) / 1000000) * 0.001;
    }
    if (writes > 10000000) {
      cost += ((writes - 10000000) / 1000000) * 0.001;
    }
    
    return cost;
  }
  
  validateConfiguration(_config: any): ValidationResult {
    return { valid: true };
  }
}

class PlanetScaleDataLoader implements DataLoader {
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

class PlanetScalePriceCalculator implements PriceCalculator {
  calculateCost(usage: Usage, pricing: PricingData): CostBreakdown {
    const serviceCosts: Record<string, number> = {};
    
    const needsScaler = usage.storage && usage.storage > 5 || 
                       usage.requests && usage.requests > 1000000000;
    
    if (needsScaler) {
      serviceCosts.base = 29;
      
      if (usage.storage && usage.storage > 10) {
        serviceCosts.storage = (usage.storage - 10) * 1.5;
      }
      
      if (usage.requests) {
        const reads = usage.requests * 0.7;
        const writes = usage.requests * 0.3;
        
        if (reads > 100000000000) {
          serviceCosts.reads = ((reads - 100000000000) / 1000000) * 0.001;
        }
        if (writes > 50000000) {
          serviceCosts.writes = ((writes - 50000000) / 1000000) * 0.001;
        }
      }
    }
    
    const totalCost = Object.values(serviceCosts).reduce((sum, cost) => sum + cost, 0);
    
    return {
      baseCost: needsScaler ? 29 : 0,
      serviceCosts,
      totalCost,
      currency: pricing.currency || 'USD',
      period: usage.period || 'monthly',
      details: [
        needsScaler ? 'Scaler plan: $29/month' : 'Hobby plan: Free',
        'Storage: 10GB included',
        'Branching and non-blocking schema changes'
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

class PlanetScaleValidator implements ProviderValidator {
  validate(_config: any): ValidationResult {
    return { valid: true };
  }
  
  validatePricing(_pricing: any): ValidationResult {
    return { valid: true };
  }
}

export class PlanetScaleProvider implements Provider {
  name = 'planetscale';
  version = '1.0.0';
  
  services: ProviderServices = {
    database: new PlanetScaleDatabaseService()
  };
  
  dataLoader = new PlanetScaleDataLoader();
  priceCalculator = new PlanetScalePriceCalculator();
  validator = new PlanetScaleValidator();
  
  metadata: ProviderMetadata = {
    name: 'PlanetScale',
    website: 'https://planetscale.com',
    regions: ['us-east', 'us-west', 'eu-west', 'ap-south', 'ap-northeast'],
    supportedFrameworks: ['Any MySQL-compatible'],
    pricingUrl: 'https://planetscale.com/pricing',
    description: 'Serverless MySQL platform with branching'
  };
  
  async initialize(): Promise<void> {
    console.log(`Initializing ${this.name} provider v${this.version}`);
  }
  
  meetsRequirements(requirements: Requirements): boolean {
    if (requirements.features) {
      const availableFeatures = ['mysql', 'serverless', 'branching'];
      return requirements.features.every(f => availableFeatures.includes(f));
    }
    return true;
  }
}

export default new PlanetScaleProvider();
