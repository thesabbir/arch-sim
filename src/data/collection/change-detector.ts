import type { PricingData, Tier, ServicePricing } from '../../providers/base/provider.interface';

export interface ChangeReport {
  hasChanges: boolean;
  priceChanges: PriceChange[];
  structuralChanges: StructuralChange[];
  summary: string;
  significance: 'none' | 'minor' | 'major' | 'critical';
}

export interface PriceChange {
  type: 'tier' | 'service' | 'limit';
  name: string;
  field: string;
  oldValue: any;
  newValue: any;
  percentChange?: number;
}

export interface StructuralChange {
  type: 'added' | 'removed' | 'modified';
  category: 'tier' | 'service' | 'feature';
  name: string;
  details?: string;
}

export class ChangeDetector {
  private readonly SIGNIFICANT_PRICE_CHANGE_THRESHOLD = 0.05; // 5%
  private readonly CRITICAL_PRICE_CHANGE_THRESHOLD = 0.20; // 20%
  
  /**
   * Detect changes between two pricing data snapshots
   */
  async detectChanges(
    oldData: PricingData | null,
    newData: PricingData
  ): Promise<boolean> {
    if (!oldData) {
      return true; // First time data, consider as change
    }
    
    const report = await this.generateChangeReport(oldData, newData);
    return report.hasChanges;
  }
  
  /**
   * Generate detailed change report
   */
  async generateChangeReport(
    oldData: PricingData,
    newData: PricingData
  ): Promise<ChangeReport> {
    const priceChanges: PriceChange[] = [];
    const structuralChanges: StructuralChange[] = [];
    
    // Compare tiers
    if (oldData.tiers && newData.tiers) {
      const tierChanges = this.compareTiers(oldData.tiers, newData.tiers);
      priceChanges.push(...tierChanges.priceChanges);
      structuralChanges.push(...tierChanges.structuralChanges);
    }
    
    // Compare services
    if (oldData.services && newData.services) {
      const serviceChanges = this.compareServices(oldData.services, newData.services);
      priceChanges.push(...serviceChanges.priceChanges);
      structuralChanges.push(...serviceChanges.structuralChanges);
    }
    
    // Determine significance
    const significance = this.determineSignificance(priceChanges, structuralChanges);
    
    // Generate summary
    const summary = this.generateSummary(priceChanges, structuralChanges);
    
    return {
      hasChanges: priceChanges.length > 0 || structuralChanges.length > 0,
      priceChanges,
      structuralChanges,
      summary,
      significance
    };
  }
  
  /**
   * Compare tiers for changes
   */
  private compareTiers(
    oldTiers: Tier[],
    newTiers: Tier[]
  ): { priceChanges: PriceChange[]; structuralChanges: StructuralChange[] } {
    const priceChanges: PriceChange[] = [];
    const structuralChanges: StructuralChange[] = [];
    
    const oldTierMap = new Map(oldTiers.map(t => [t.name, t]));
    const newTierMap = new Map(newTiers.map(t => [t.name, t]));
    
    // Check for removed tiers
    for (const [name] of oldTierMap) {
      if (!newTierMap.has(name)) {
        structuralChanges.push({
          type: 'removed',
          category: 'tier',
          name,
          details: `Tier ${name} has been removed`
        });
      }
    }
    
    // Check for added tiers
    for (const [name, tier] of newTierMap) {
      if (!oldTierMap.has(name)) {
        structuralChanges.push({
          type: 'added',
          category: 'tier',
          name,
          details: `New tier ${name} added with base price ${tier.basePrice}`
        });
      }
    }
    
    // Check for price changes in existing tiers
    for (const [name, newTier] of newTierMap) {
      const oldTier = oldTierMap.get(name);
      if (oldTier) {
        // Check base price
        if (oldTier.basePrice !== newTier.basePrice) {
          const percentChange = this.calculatePercentChange(
            oldTier.basePrice || 0,
            newTier.basePrice || 0
          );
          
          priceChanges.push({
            type: 'tier',
            name,
            field: 'basePrice',
            oldValue: oldTier.basePrice,
            newValue: newTier.basePrice,
            percentChange
          });
        }
        
        // Check limits
        if (oldTier.limits && newTier.limits) {
          for (const key of Object.keys(newTier.limits)) {
            const oldLimit = oldTier.limits[key];
            const newLimit = newTier.limits[key];
            
            if (oldLimit !== newLimit) {
              priceChanges.push({
                type: 'limit',
                name: `${name}.${key}`,
                field: key,
                oldValue: oldLimit,
                newValue: newLimit
              });
            }
          }
        }
      }
    }
    
    return { priceChanges, structuralChanges };
  }
  
  /**
   * Compare services for changes
   */
  private compareServices(
    oldServices: ServicePricing[],
    newServices: ServicePricing[]
  ): { priceChanges: PriceChange[]; structuralChanges: StructuralChange[] } {
    const priceChanges: PriceChange[] = [];
    const structuralChanges: StructuralChange[] = [];
    
    const oldServiceMap = new Map(oldServices.map(s => [s.name, s]));
    const newServiceMap = new Map(newServices.map(s => [s.name, s]));
    
    // Check for removed services
    for (const [name] of oldServiceMap) {
      if (!newServiceMap.has(name)) {
        structuralChanges.push({
          type: 'removed',
          category: 'service',
          name,
          details: `Service ${name} has been removed`
        });
      }
    }
    
    // Check for added services
    for (const [name] of newServiceMap) {
      if (!oldServiceMap.has(name)) {
        structuralChanges.push({
          type: 'added',
          category: 'service',
          name,
          details: `New service ${name} added`
        });
      }
    }
    
    // Check for price changes in existing services
    for (const [name, newService] of newServiceMap) {
      const oldService = oldServiceMap.get(name);
      if (oldService && (oldService as any).pricing && (newService as any).pricing) {
        // Compare pricing fields
        for (const key of Object.keys((newService as any).pricing)) {
          const oldPrice = ((oldService as any).pricing as any)[key];
          const newPrice = ((newService as any).pricing as any)[key];
          
          if (oldPrice !== newPrice) {
            const percentChange = typeof oldPrice === 'number' && typeof newPrice === 'number'
              ? this.calculatePercentChange(oldPrice, newPrice)
              : undefined;
            
            priceChanges.push({
              type: 'service',
              name,
              field: key,
              oldValue: oldPrice,
              newValue: newPrice,
              percentChange
            });
          }
        }
      }
    }
    
    return { priceChanges, structuralChanges };
  }
  
  /**
   * Determine the significance of changes
   */
  private determineSignificance(
    priceChanges: PriceChange[],
    structuralChanges: StructuralChange[]
  ): 'none' | 'minor' | 'major' | 'critical' {
    if (priceChanges.length === 0 && structuralChanges.length === 0) {
      return 'none';
    }
    
    // Check for critical price changes
    const hasCriticalPriceChange = priceChanges.some(
      change => change.percentChange && 
      Math.abs(change.percentChange) > this.CRITICAL_PRICE_CHANGE_THRESHOLD
    );
    
    if (hasCriticalPriceChange) {
      return 'critical';
    }
    
    // Check for major structural changes
    const hasMajorStructuralChange = structuralChanges.some(
      change => change.type === 'removed' && change.category === 'tier'
    );
    
    if (hasMajorStructuralChange) {
      return 'major';
    }
    
    // Check for significant price changes
    const hasSignificantPriceChange = priceChanges.some(
      change => change.percentChange && 
      Math.abs(change.percentChange) > this.SIGNIFICANT_PRICE_CHANGE_THRESHOLD
    );
    
    if (hasSignificantPriceChange || structuralChanges.length > 2) {
      return 'major';
    }
    
    return 'minor';
  }
  
  /**
   * Generate human-readable summary
   */
  private generateSummary(
    priceChanges: PriceChange[],
    structuralChanges: StructuralChange[]
  ): string {
    const parts: string[] = [];
    
    if (priceChanges.length > 0) {
      const avgChange = this.calculateAverageChange(priceChanges);
      parts.push(`${priceChanges.length} price changes (avg ${avgChange.toFixed(1)}%)`);
    }
    
    if (structuralChanges.length > 0) {
      const added = structuralChanges.filter(c => c.type === 'added').length;
      const removed = structuralChanges.filter(c => c.type === 'removed').length;
      
      if (added > 0) parts.push(`${added} additions`);
      if (removed > 0) parts.push(`${removed} removals`);
    }
    
    return parts.length > 0 
      ? parts.join(', ')
      : 'No changes detected';
  }
  
  /**
   * Calculate percent change
   */
  private calculatePercentChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) {
      return newValue === 0 ? 0 : 100;
    }
    return ((newValue - oldValue) / oldValue) * 100;
  }
  
  /**
   * Calculate average price change
   */
  private calculateAverageChange(priceChanges: PriceChange[]): number {
    const changes = priceChanges
      .filter(c => c.percentChange !== undefined)
      .map(c => c.percentChange!);
    
    if (changes.length === 0) return 0;
    
    return changes.reduce((sum, change) => sum + change, 0) / changes.length;
  }
}