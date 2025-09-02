/**
 * Centralized Pricing Service
 * Single source of truth for all pricing data
 */

import type { PricingData } from './provider.interface';

export interface PricingService {
  getPricing(path: string): number;
  getServicePrice(serviceName: string): number;
  getTierLimit(tierName: string, limitName: string): number;
}

export class BasePricingService implements PricingService {
  constructor(private pricingData: PricingData) {}

  /**
   * Get pricing value by path (e.g., "services.bandwidth.price")
   */
  getPricing(path: string): number {
    const parts = path.split('.');
    let current: any = this.pricingData;
    
    for (const part of parts) {
      if (current?.[part] !== undefined) {
        current = current[part];
      } else {
        console.warn(`Pricing path not found: ${path}`);
        return 0;
      }
    }
    
    return typeof current === 'number' ? current : 0;
  }

  /**
   * Get service pricing
   */
  getServicePrice(serviceName: string): number {
    const service = this.pricingData.services?.find(s => s.name === serviceName);
    return service?.price || 0;
  }

  /**
   * Get tier limit
   */
  getTierLimit(tierName: string, limitName: string): number {
    const tier = this.pricingData.tiers?.find(t => t.name === tierName);
    return tier?.limits?.[limitName] || 0;
  }

  /**
   * Calculate overage cost
   */
  calculateOverage(
    usage: number,
    included: number,
    pricePerUnit: number
  ): number {
    if (usage <= included) return 0;
    return (usage - included) * pricePerUnit;
  }

  /**
   * Get tiered pricing (e.g., first 10GB at $X, next 90GB at $Y)
   */
  calculateTieredPricing(
    usage: number,
    tiers: Array<{ limit: number; price: number }>
  ): number {
    let cost = 0;
    let remaining = usage;
    
    for (const tier of tiers) {
      if (remaining <= 0) break;
      
      const tierUsage = Math.min(remaining, tier.limit);
      cost += tierUsage * tier.price;
      remaining -= tierUsage;
    }
    
    return cost;
  }
}