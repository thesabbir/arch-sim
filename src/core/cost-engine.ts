import * as yaml from 'js-yaml';
import fs from 'fs/promises';
import { SIMULATION_DEFAULTS } from '../lib/defaults.js';
import type {
  Architecture,
  CostResult as BaseCostResult,
  CostBreakdown as BaseCostBreakdown,
  CostOptimization as BaseCostOptimization,
  UsageMetrics as BaseUsageMetrics,
  PricingTier as BasePricingTier,
  LoadProfile,
  HostingInstance,
  DatabaseInstance,
  ServicesConfig,
  EcosystemData,
  ProviderPricing,
  GeographicDistribution,
  PricingPlan,
} from '../types/index.js';

// Extend base types for internal use
interface UsageMetrics extends BaseUsageMetrics {
  peakMultiplier: number;
  readWriteRatio: { read: number; write: number };
  regions: GeographicDistribution[];
}

interface CostBreakdown extends BaseCostBreakdown {
  primary_database?: number;
}

interface CostResult extends BaseCostResult {
  breakdown: CostBreakdown;
  usage: UsageMetrics;
}

type CostOptimization = BaseCostOptimization;

interface PricingTier extends BasePricingTier {
  base_cost?: number | string;
  included?: {
    bandwidth?: string;
    function_invocations?: number;
    requests?: number;
    storage?: number;
    database_space?: string;
    compute_hours?: number;
  };
  overages?: {
    bandwidth_per_gb?: number;
    function_invocations_per_million?: number;
    per_1m_requests?: number;
  };
  usage_rates?: {
    storage_per_gb?: number;
    database_per_gb?: number;
    compute_per_hour_025vcpu?: number;
  };
}

interface CachePlan {
  price_per_month: number;
  memory?: number | string;
  max_requests_daily?: number;
  max_storage_mb?: number;
  monthly_cost?: number;
}

export class CostEngine {
  private pricing: EcosystemData['pricing'] | null = null;
  private regionalMultipliers: Record<string, number>;

  constructor() {
    this.regionalMultipliers = SIMULATION_DEFAULTS.cost.regionalMultipliers;
  }

  async loadPricing(pricingPath: string = 'data/ecosystem.yaml'): Promise<boolean> {
    try {
      const data = await fs.readFile(pricingPath, 'utf8');
      const ecosystem = yaml.load(data) as EcosystemData;
      this.pricing = ecosystem.pricing;
      return true;
    } catch (error) {
      console.error('Failed to load pricing data:', (error as Error).message);
      return false;
    }
  }

  private calculateUsageMetrics(loadProfile: LoadProfile): UsageMetrics {
    const monthlySeconds = SIMULATION_DEFAULTS.cost.monthlySeconds;
    const avgResponseSizeKB = SIMULATION_DEFAULTS.avgResponseSizeKB;

    return {
      monthlyRequests: loadProfile.requests_per_second * monthlySeconds,
      monthlyBandwidthGB:
        (loadProfile.requests_per_second * avgResponseSizeKB * monthlySeconds) / (1024 * 1024),
      concurrentUsers: loadProfile.concurrent_users || 0,
      dataStorageGB: loadProfile.data_size ? parseInt(String(loadProfile.data_size)) : 1,
      peakMultiplier: loadProfile.peak_multiplier || 1,
      readWriteRatio: this.parseRatio(loadProfile.read_write_ratio || '80:20'),
      regions: loadProfile.geographic_distribution || [{ region: 'us-east', percentage: 100 }],
    };
  }

  private parseRatio(ratioString: string): { read: number; write: number } {
    const parts = ratioString.split(':').map(Number);
    const read = parts[0] || 0;
    const write = parts[1] || 0;
    const total = read + write;
    if (total === 0) return { read: 0.5, write: 0.5 };
    return { read: read / total, write: write / total };
  }

  private calculateHostingCost(
    provider: string,
    config: HostingInstance,
    usage: UsageMetrics
  ): number {
    const platformPricing = this.pricing?.hosting?.[provider];
    if (!platformPricing) {
      throw new Error(`Pricing data not available for hosting provider: ${provider}`);
    }

    let totalCost = 0;
    const tier = this.determineTier(platformPricing, usage, config);

    // Handle base cost - can be 0, number, or 'custom'
    if (typeof tier.base_cost === 'number') {
      totalCost += tier.base_cost;
    }

    // Calculate bandwidth costs - handle different tier structures
    const includedBandwidth = this.parseBandwidth(tier.included?.bandwidth) || 0;
    if (usage.monthlyBandwidthGB > includedBandwidth) {
      const excessBandwidth = usage.monthlyBandwidthGB - includedBandwidth;
      const bandwidthRate = tier.overages?.bandwidth_per_gb || 0.4;
      totalCost += excessBandwidth * bandwidthRate;
    }

    // Calculate function/request costs
    const includedInvocations = tier.included?.function_invocations || tier.included?.requests || 0;
    if (usage.monthlyRequests > includedInvocations) {
      const excessRequests = usage.monthlyRequests - includedInvocations;
      const requestRate =
        tier.overages?.function_invocations_per_million || tier.overages?.per_1m_requests || 0;
      if (requestRate > 0) {
        totalCost += (excessRequests / 1000000) * requestRate;
      }
    }

    // Apply regional multiplier
    const regionMultiplier = this.getRegionalMultiplier(usage.regions);
    totalCost *= regionMultiplier;

    // Apply peak load multiplier (reduced impact)
    totalCost *= Math.sqrt(usage.peakMultiplier);

    return totalCost;
  }

  private calculateDatabaseCost(
    provider: string,
    config: DatabaseInstance,
    usage: UsageMetrics
  ): number {
    const platformPricing = this.pricing?.databases?.[provider];
    if (!platformPricing) {
      throw new Error(`Pricing data not available for database provider: ${provider}`);
    }

    let totalCost = 0;

    // Determine appropriate tier for database
    const tier = this.determineDatabaseTier(platformPricing, usage, config);

    // Add base cost if any
    if (typeof tier.base_cost === 'number') {
      totalCost += tier.base_cost;
    }

    // Storage costs
    const includedStorage =
      tier.included?.storage || this.parseStorage(tier.included?.database_space) || 0;
    if (usage.dataStorageGB > includedStorage) {
      const billableStorage = usage.dataStorageGB - includedStorage;
      const storageRate =
        tier.usage_rates?.storage_per_gb || tier.usage_rates?.database_per_gb || 0.15;
      totalCost += billableStorage * storageRate;
    }

    // Compute costs (estimate based on usage pattern)
    const computeHours = this.estimateComputeHours(usage);
    const includedHours = tier.included?.compute_hours || 0;
    if (computeHours > includedHours) {
      const billableHours = computeHours - includedHours;
      const computeRate = tier.usage_rates?.compute_per_hour_025vcpu || 0.16;
      totalCost += billableHours * computeRate;
    }

    return totalCost;
  }

  private determineDatabaseTier(
    platformPricing: ProviderPricing,
    usage: UsageMetrics,
    config: DatabaseInstance
  ): PricingTier {
    // Try to match config tier first
    if (config?.plan) {
      const tierName = `${config.plan}_tier`;
      if (platformPricing[tierName]) {
        return platformPricing[tierName];
      }
    }

    // Check available tiers and select based on usage
    const availableTiers = Object.keys(platformPricing);

    // For small usage, prefer free tiers
    if (usage.dataStorageGB <= 5 && usage.monthlyRequests <= 1000000) {
      for (const tier of ['free_tier', 'hobby_tier']) {
        if (platformPricing[tier]) return platformPricing[tier];
      }
    }

    // For medium usage, prefer paid tiers
    for (const tier of ['launch_tier', 'scaler_tier', 'pro_tier']) {
      if (platformPricing[tier]) return platformPricing[tier];
    }

    // Return first available tier as fallback
    const firstTier = availableTiers[0];
    return firstTier ? platformPricing[firstTier] || {} : {};
  }

  private parseStorage(storageStr: string | undefined): number {
    if (!storageStr || typeof storageStr !== 'string') return 0;

    const match = storageStr.match(/(\d+)(gb|mb|tb)?/i);
    if (!match) return 0;

    const value = parseInt(match[1]!);
    const unit = (match[2] || 'gb').toLowerCase();

    switch (unit) {
      case 'mb':
        return value / 1024;
      case 'gb':
        return value;
      case 'tb':
        return value * 1024;
      default:
        return value;
    }
  }

  private calculateCacheCost(provider: string, usage: UsageMetrics): number {
    // Cache pricing is under pricing.caching, not pricing.databases
    const platformPricing = this.pricing?.caching?.[provider];
    if (!platformPricing) {
      throw new Error(`Pricing data not available for cache provider: ${provider}`);
    }

    let totalCost = 0;
    const cacheHitRatio = SIMULATION_DEFAULTS.cost.defaultCacheHitRatio;
    const cacheRequests = usage.monthlyRequests * cacheHitRatio;
    const estimatedStorageGB = Math.min(10, usage.dataStorageGB * 0.1); // 10% of data cached, max 10GB

    // Handle new pricing structure
    if (platformPricing.pay_as_you_go) {
      // Pay-as-you-go pricing (like Upstash)
      const freeDaily = platformPricing.free?.includes?.max_requests_per_day || 10000;
      const freeMonthly = freeDaily * 30;

      const payAsYouGo = platformPricing.pay_as_you_go as PricingPlan;

      if (cacheRequests > freeMonthly) {
        const billableRequests = cacheRequests - freeMonthly;
        const rate = payAsYouGo.rates?.requests_per_100k || 0.2;
        totalCost += (billableRequests / 100000) * rate;
      }

      // Storage costs
      const freeIncludes = (platformPricing.free as PricingPlan)?.includes;
      const freeStorageGB = this.parseStorage(String(freeIncludes?.max_data_size || '')) || 0.256;
      if (estimatedStorageGB > freeStorageGB) {
        const billableStorageGB = estimatedStorageGB - freeStorageGB;
        const storageRate = payAsYouGo.rates?.storage_per_gb_month || 0.25;
        totalCost += billableStorageGB * storageRate;
      }
    } else if (platformPricing.fixed_plans) {
      // Fixed tier pricing (like Redis Cloud)
      const fixedPlans = (platformPricing.fixed_plans as PricingPlan)?.fixed_plans || [];
      const cachePlans = fixedPlans.map((plan) => ({
        price_per_month: plan.monthly_cost,
        ...plan,
      }));
      const suitablePlan = this.findSuitableCachePlan(
        cachePlans,
        cacheRequests,
        estimatedStorageGB
      );
      totalCost = suitablePlan?.price_per_month || 10;
    } else if (platformPricing.flexible) {
      // Flexible pricing
      totalCost = (platformPricing.flexible as PricingPlan).starting_at || 15;
    }

    return totalCost;
  }

  private findSuitableCachePlan(
    plans: CachePlan[],
    _requests: number,
    storageGB: number
  ): CachePlan | undefined {
    const storageMB = storageGB * 1024;

    for (const plan of plans.sort((a, b) => a.price_per_month - b.price_per_month)) {
      const memoryMB =
        typeof plan.memory === 'string' ? this.parseStorage(plan.memory) * 1024 : plan.memory || 0;
      if (memoryMB >= storageMB) {
        return plan;
      }
    }
    return plans[plans.length - 1]; // Return highest tier if none fit
  }

  private estimateComputeHours(usage: UsageMetrics): number {
    // Estimate compute hours based on load pattern
    const baseHours = SIMULATION_DEFAULTS.cost.monthlyHours;
    const loadFactor = Math.min(1, usage.concurrentUsers / 1000); // Scale with concurrent users
    return baseHours * (0.2 + 0.8 * loadFactor); // 20% baseline + 80% scaled
  }

  private determineTier(
    platformPricing: ProviderPricing,
    usage: UsageMetrics,
    config: HostingInstance
  ): PricingTier {
    // Map instance type to appropriate tier
    if (config?.instance_type) {
      const tierMapping: Record<string, string[]> = {
        free: ['free_tier', 'hobby_tier', 'free_allowances_tier', 'trial_tier'],
        starter: ['starter_tier', 'launch_tier', 'developer_tier'],
        basic: ['standard_tier', 'scale_tier', 'scaler_tier'],
        pro: ['pro_tier', 'team_tier', 'business_tier'],
        enterprise: ['enterprise_tier', 'organization_tier'],
      };

      const possibleTiers = tierMapping[config.instance_type] || [`${config.instance_type}_tier`];

      for (const tierName of possibleTiers) {
        if (platformPricing[tierName]) {
          return platformPricing[tierName];
        }
      }
    }

    // Fallback logic based on usage
    const availableTiers = Object.keys(platformPricing);

    if (usage.monthlyRequests > 10000000 || usage.monthlyBandwidthGB > 1000) {
      for (const tier of ['enterprise_tier', 'organization_tier', 'business_tier', 'pro_tier']) {
        if (platformPricing[tier]) return platformPricing[tier];
      }
    } else if (usage.monthlyRequests > 1000000 || usage.monthlyBandwidthGB > 100) {
      for (const tier of ['pro_tier', 'business_tier', 'scale_tier']) {
        if (platformPricing[tier]) return platformPricing[tier];
      }
    }

    // Default to free/hobby tier
    for (const tier of ['free_tier', 'hobby_tier', 'trial_tier', 'free_allowances_tier']) {
      if (platformPricing[tier]) return platformPricing[tier];
    }

    // Return first available tier as last resort
    const firstTier = availableTiers[0];
    return firstTier ? platformPricing[firstTier] || {} : {};
  }

  private parseBandwidth(bandwidthStr: string | undefined): number {
    if (!bandwidthStr || typeof bandwidthStr !== 'string') return 0;
    if (bandwidthStr === 'unlimited') return 999999; // Large number for unlimited

    const match = bandwidthStr.match(/(\d+)(gb|mb|tb)?/i);
    if (!match) return 0;

    const value = parseInt(match[1]!);
    const unit = (match[2] || 'gb').toLowerCase();

    switch (unit) {
      case 'mb':
        return value / 1024;
      case 'gb':
        return value;
      case 'tb':
        return value * 1024;
      default:
        return value;
    }
  }

  private getRegionalMultiplier(regions: GeographicDistribution[]): number {
    if (!regions || regions.length === 0) return 1.0;

    let weightedMultiplier = 0;
    for (const region of regions) {
      const multiplier = this.regionalMultipliers[region.region] || 1.0;
      weightedMultiplier += (multiplier * region.percentage) / 100;
    }
    return weightedMultiplier;
  }

  calculateTotalCost(architecture: Architecture): CostResult {
    const usage = this.calculateUsageMetrics(architecture.load_profile ?? ({} as LoadProfile));
    const costs: CostBreakdown = {};

    // Hosting costs
    if (architecture.hosting?.backend) {
      costs.backend_hosting = this.calculateHostingCost(
        architecture.hosting.backend.provider,
        architecture.hosting.backend,
        usage
      );
    }

    if (
      architecture.hosting?.frontend &&
      architecture.hosting.frontend.provider !== architecture.hosting?.backend?.provider
    ) {
      costs.frontend_hosting = this.calculateHostingCost(
        architecture.hosting.frontend.provider,
        architecture.hosting.frontend,
        usage
      );
    }

    // Database costs
    if (architecture.databases?.primary) {
      costs.primary_database = this.calculateDatabaseCost(
        architecture.databases.primary.provider,
        architecture.databases.primary,
        usage
      );
    }

    // Cache costs
    if (architecture.databases?.cache) {
      costs.cache = this.calculateCacheCost(architecture.databases.cache.provider, usage);
    }

    // Additional services
    if (architecture.services) {
      costs.additional_services = this.calculateAdditionalServicesCost(architecture.services);
    }

    const totalCost = Object.values(costs).reduce((sum: number, cost) => sum + (cost || 0), 0);

    return {
      breakdown: costs,
      usage,
      totalCost,
      currency: 'USD',
    };
  }

  private calculateAdditionalServicesCost(services: ServicesConfig): number {
    let cost = 0;
    if (services.authentication) cost += 15;
    if (services.monitoring) cost += 30;
    if (services.cdn) cost += 25;
    if (services.email) cost += 10;
    if (services.storage) cost += 20;
    return cost;
  }

  generateCostOptimizations(
    _architecture: Architecture,
    costResult: CostResult
  ): CostOptimization[] {
    const optimizations: CostOptimization[] = [];
    const { breakdown, usage } = costResult;

    // Hosting optimizations
    if ((breakdown.backend_hosting || 0) > 50) {
      optimizations.push({
        type: 'hosting',
        current_cost: breakdown.backend_hosting!,
        suggestion: 'Consider serverless or usage-based hosting for variable loads',
        potential_savings: breakdown.backend_hosting! * 0.3,
        effort: 'medium',
      });
    }

    // Cache optimizations
    if ((breakdown.cache || 0) > 100) {
      optimizations.push({
        type: 'cache',
        current_cost: breakdown.cache!,
        suggestion: 'Optimize cache strategy or consider alternative providers',
        potential_savings: breakdown.cache! * 0.4,
        effort: 'low',
      });
    }

    // Database optimizations
    if ((breakdown.primary_database || 0) > 50 && usage.readWriteRatio.read > 0.8) {
      optimizations.push({
        type: 'database',
        current_cost: breakdown.primary_database!,
        suggestion: 'Consider read replicas to distribute load and reduce costs',
        potential_savings: breakdown.primary_database! * 0.25,
        effort: 'high',
      });
    }

    return optimizations;
  }
}
