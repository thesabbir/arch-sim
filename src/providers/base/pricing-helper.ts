/**
 * Helper class for retrieving pricing from JSON data files
 * This centralizes price lookups and removes hardcoded values from providers
 */
export class PricingHelper {
  private pricingData: any;
  
  constructor(pricingData: any) {
    this.pricingData = pricingData;
  }
  
  /**
   * Get service price by name
   */
  getServicePrice(serviceName: string, defaultPrice: number = 0): number {
    const service = this.pricingData?.services?.find((s: any) => s.name === serviceName);
    return service?.price ?? defaultPrice;
  }
  
  /**
   * Get service free quota
   */
  getServiceFreeQuota(serviceName: string, defaultQuota: number = 0): number {
    const service = this.pricingData?.services?.find((s: any) => s.name === serviceName);
    return service?.freeQuota ?? defaultQuota;
  }
  
  /**
   * Get tier by name
   */
  getTier(tierName: string): any {
    return this.pricingData?.tiers?.find((t: any) => t.name === tierName);
  }
  
  /**
   * Get tier limits
   */
  getTierLimits(tierName: string): any {
    const tier = this.getTier(tierName);
    return tier?.limits || {};
  }
  
  /**
   * Calculate overage cost
   */
  calculateOverage(
    usage: number,
    serviceName: string,
    tierName?: string,
    limitKey?: string
  ): number {
    const freeQuota = this.getServiceFreeQuota(serviceName, 0);
    const price = this.getServicePrice(serviceName, 0);
    
    // Check tier limits if provided
    if (tierName && limitKey) {
      const tierLimits = this.getTierLimits(tierName);
      const tierLimit = tierLimits[limitKey] || 0;
      const effectiveLimit = Math.max(freeQuota, tierLimit);
      
      if (usage <= effectiveLimit) return 0;
      return (usage - effectiveLimit) * price;
    }
    
    // Use service free quota
    if (usage <= freeQuota) return 0;
    return (usage - freeQuota) * price;
  }
  
  /**
   * Get nested value from pricing data
   */
  getValue(path: string, defaultValue: any = null): any {
    const keys = path.split('.');
    let current = this.pricingData;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }
  
  /**
   * Check if a service exists in pricing data
   */
  hasService(serviceName: string): boolean {
    return this.pricingData?.services?.some((s: any) => s.name === serviceName) || false;
  }
  
  /**
   * Get all services
   */
  getAllServices(): any[] {
    return this.pricingData?.services || [];
  }
  
  /**
   * Get all tiers
   */
  getAllTiers(): any[] {
    return this.pricingData?.tiers || [];
  }
}