import type { 
  Provider, 
  Usage, 
  CostBreakdown, 
  Requirements
} from '../providers/base/provider.interface';
import { ProviderRegistry } from './provider-registry';
import { DataLoader } from '../data/storage/data-loader';

export interface CostEstimate {
  provider: string;
  monthly: number;
  yearly: number;
  breakdown: CostBreakdown;
  confidence: number;
  assumptions?: string[];
}

export interface ComparisonResult {
  estimates: CostEstimate[];
  cheapest: CostEstimate;
  mostExpensive: CostEstimate;
  recommendations: string[];
}

export class CostEngine {
  constructor(
    protected registry: ProviderRegistry,
    protected dataLoader: DataLoader
  ) {}
  
  async calculateCost(
    providerName: string, 
    usage: Usage
  ): Promise<CostEstimate> {
    const provider = this.registry.getProvider(providerName);
    const pricingData = await this.dataLoader.loadProviderData(providerName);
    
    const breakdown = provider.priceCalculator.calculateCost(usage, pricingData);
    const monthly = provider.priceCalculator.calculateMonthlyEstimate(usage, pricingData);
    const yearly = provider.priceCalculator.calculateYearlyEstimate(usage, pricingData);
    
    return {
      provider: providerName,
      monthly,
      yearly,
      breakdown,
      confidence: this.calculateConfidence(provider, usage),
      assumptions: this.generateAssumptions(provider, usage)
    };
  }
  
  async compareProviders(
    usage: Usage,
    providers?: string[]
  ): Promise<ComparisonResult> {
    const targetProviders = providers || this.registry.listProviderNames();
    const estimates: CostEstimate[] = [];
    
    for (const providerName of targetProviders) {
      try {
        const estimate = await this.calculateCost(providerName, usage);
        estimates.push(estimate);
      } catch (error) {
        console.warn(`Failed to calculate cost for ${providerName}:`, error);
      }
    }
    
    if (estimates.length === 0) {
      throw new Error('No providers could calculate costs for the given usage');
    }
    
    // Sort by monthly cost
    estimates.sort((a, b) => a.monthly - b.monthly);
    
    const cheapest = estimates[0]!;
    const mostExpensive = estimates[estimates.length - 1]!;
    
    return {
      estimates,
      cheapest,
      mostExpensive,
      recommendations: this.generateRecommendations(estimates, usage)
    };
  }
  
  async findOptimalProvider(requirements: Requirements): Promise<CostEstimate | null> {
    const suitableProviders = this.registry.findProvidersByRequirements(requirements);
    
    if (suitableProviders.length === 0) {
      return null;
    }
    
    // Convert requirements to usage
    const usage = this.requirementsToUsage(requirements);
    
    let bestEstimate: CostEstimate | null = null;
    let lowestCost = Infinity;
    
    for (const provider of suitableProviders) {
      try {
        const estimate = await this.calculateCost(provider.name, usage);
        
        // Check if within budget
        if (requirements.budget && estimate.monthly > requirements.budget) {
          continue;
        }
        
        if (estimate.monthly < lowestCost) {
          lowestCost = estimate.monthly;
          bestEstimate = estimate;
        }
      } catch (error) {
        console.warn(`Failed to calculate cost for ${provider.name}:`, error);
      }
    }
    
    return bestEstimate;
  }
  
  async calculateScaledCost(
    providerName: string,
    baseUsage: Usage,
    scaleFactor: number
  ): Promise<CostEstimate> {
    const scaledUsage: Usage = {
      ...baseUsage,
      bandwidth: (baseUsage.bandwidth || 0) * scaleFactor,
      storage: (baseUsage.storage || 0) * scaleFactor,
      compute: (baseUsage.compute || 0) * scaleFactor,
      requests: (baseUsage.requests || 0) * scaleFactor,
      users: (baseUsage.users || 0) * scaleFactor
    };
    
    return this.calculateCost(providerName, scaledUsage);
  }
  
  async forecastCosts(
    providerName: string,
    currentUsage: Usage,
    growthRate: number,
    months: number
  ): Promise<CostEstimate[]> {
    const forecasts: CostEstimate[] = [];
    
    for (let month = 0; month <= months; month++) {
      const scaleFactor = Math.pow(1 + growthRate / 100, month);
      const forecast = await this.calculateScaledCost(providerName, currentUsage, scaleFactor);
      forecasts.push(forecast);
    }
    
    return forecasts;
  }
  
  private calculateConfidence(_provider: Provider, usage: Usage): number {
    let confidence = 100;
    
    // Reduce confidence for edge cases
    if (usage.bandwidth && usage.bandwidth > 10000) {
      confidence -= 10; // Very high bandwidth
    }
    if (usage.users && usage.users > 1000000) {
      confidence -= 10; // Very high user count
    }
    if (!_provider.validator) {
      confidence -= 5; // No validator
    }
    
    return Math.max(confidence, 50);
  }
  
  private generateAssumptions(_provider: Provider, usage: Usage): string[] {
    const assumptions: string[] = [];
    
    if (!usage.bandwidth) {
      assumptions.push('Bandwidth usage not specified, assuming minimal');
    }
    if (!usage.storage) {
      assumptions.push('Storage usage not specified, assuming minimal');
    }
    if (usage.period === 'yearly') {
      assumptions.push('Yearly pricing may include discounts not reflected in monthly calculations');
    }
    
    return assumptions;
  }
  
  private generateRecommendations(estimates: CostEstimate[], usage: Usage): string[] {
    const recommendations: string[] = [];
    
    if (estimates.length > 0) {
      const cheapest = estimates[0];
      const mostExpensive = estimates[estimates.length - 1];
      
      if (cheapest && mostExpensive && cheapest.monthly < mostExpensive.monthly * 0.5) {
        recommendations.push(
          `${cheapest.provider} offers significant cost savings (${Math.round((1 - cheapest.monthly / mostExpensive.monthly) * 100)}% cheaper than ${mostExpensive.provider})`
        );
      }
    
      // Check for high-confidence providers
      const highConfidence = estimates.filter(e => e.confidence >= 90);
      const firstHighConfidence = highConfidence[0];
      if (highConfidence.length > 0 && firstHighConfidence && firstHighConfidence !== cheapest) {
        recommendations.push(
          `Consider ${firstHighConfidence.provider} for higher reliability despite slightly higher cost`
        );
      }
    
      // Usage-specific recommendations
      if (usage.bandwidth && usage.bandwidth > 1000) {
        const cdnProviders = estimates.filter(e => {
          const provider = this.registry.getProvider(e.provider);
          return provider.services.cdn !== undefined;
        });
        const firstCdnProvider = cdnProviders[0];
        if (cdnProviders.length > 0 && firstCdnProvider) {
          recommendations.push(
            `For high bandwidth usage, consider providers with CDN services like ${firstCdnProvider.provider}`
          );
        }
      }
    }
    
    return recommendations;
  }
  
  private requirementsToUsage(requirements: Requirements): Usage {
    return {
      bandwidth: requirements.traffic || 100,
      storage: requirements.storage || 10,
      compute: 100, // Default compute hours
      requests: (requirements.traffic || 100) * 1000, // Estimate requests from traffic
      users: 1000, // Default user count
      period: 'monthly'
    };
  }
  
  // Utility methods
  async validateUsage(usage: Usage): Promise<boolean> {
    // Validate usage parameters
    if (usage.bandwidth && usage.bandwidth < 0) return false;
    if (usage.storage && usage.storage < 0) return false;
    if (usage.compute && usage.compute < 0) return false;
    if (usage.requests && usage.requests < 0) return false;
    if (usage.users && usage.users < 0) return false;
    
    return true;
  }
  
  async getCostBreakdown(
    providerName: string,
    usage: Usage
  ): Promise<Record<string, number>> {
    const estimate = await this.calculateCost(providerName, usage);
    return estimate.breakdown.serviceCosts;
  }
  
  async getTierForUsage(
    providerName: string,
    usage: Usage
  ): Promise<string | null> {
    const pricingData = await this.dataLoader.loadProviderData(providerName);
    
    // Find the appropriate tier based on usage
    for (const tier of pricingData.tiers) {
      let fits = true;
      
      if (tier.limits.bandwidth && usage.bandwidth && usage.bandwidth > tier.limits.bandwidth) {
        fits = false;
      }
      if (tier.limits.storage && usage.storage && usage.storage > tier.limits.storage) {
        fits = false;
      }
      if (tier.limits.users && usage.users && usage.users > tier.limits.users) {
        fits = false;
      }
      
      if (fits) {
        return tier.name;
      }
    }
    
    return null;
  }
}

// Factory function
export function createCostEngine(
  registry?: ProviderRegistry,
  dataLoader?: DataLoader
): CostEngine {
  const reg = registry || new ProviderRegistry();
  const loader = dataLoader || new DataLoader();
  return new CostEngine(reg, loader);
}