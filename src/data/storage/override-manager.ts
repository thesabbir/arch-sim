import { Override } from '../../providers/base/provider.interface';
import { DataLoader } from './data-loader';

export interface OverrideManager {
  setPriceOverride(path: string, value: number, reason?: string): Promise<void>;
  addCustomTier(provider: string, tier: TierConfig): Promise<void>;
  applyDiscount(provider: string, discount: number): Promise<void>;
  removeOverride(path: string): Promise<boolean>;
  listOverrides(): Promise<Override[]>;
  clearOverrides(scope?: 'global' | 'provider' | 'local', provider?: string): Promise<void>;
}

export interface TierConfig {
  name: string;
  basePrice: number;
  limits: Record<string, number>;
  features: string[];
}

export class DefaultOverrideManager implements OverrideManager {
  constructor(private dataLoader: DataLoader) {}
  
  async setPriceOverride(path: string, value: number, reason?: string): Promise<void> {
    const override: Override = {
      path,
      value,
      reason,
      appliedAt: new Date().toISOString(),
      priority: 100
    };
    
    // Determine scope from path
    const { scope, provider } = this.parsePath(path);
    
    await this.dataLoader.saveOverride(override, scope, provider);
    console.log(`✓ Price override set: ${path} = ${value}`);
  }
  
  async addCustomTier(provider: string, tier: TierConfig): Promise<void> {
    // First, get existing tiers
    const data = await this.dataLoader.loadProviderData(provider);
    const tierCount = data.tiers.length;
    
    const override: Override = {
      path: `tiers[${tierCount}]`,
      value: tier,
      reason: `Custom tier: ${tier.name}`,
      appliedAt: new Date().toISOString(),
      priority: 90
    };
    
    await this.dataLoader.saveOverride(override, 'provider', provider);
    console.log(`✓ Custom tier added to ${provider}: ${tier.name}`);
  }
  
  async applyDiscount(provider: string, discount: number): Promise<void> {
    if (discount < 0 || discount > 100) {
      throw new Error('Discount must be between 0 and 100');
    }
    
    // Get current pricing data
    const data = await this.dataLoader.loadProviderData(provider);
    
    // Apply discount to all tiers
    const overrides: Override[] = [];
    for (let i = 0; i < data.tiers.length; i++) {
      const tier = data.tiers[i];
      if (!tier) continue;
      const newPrice = tier.basePrice * (1 - discount / 100);
      
      overrides.push({
        path: `tiers[${i}].basePrice`,
        value: newPrice,
        reason: `${discount}% discount applied`,
        appliedAt: new Date().toISOString(),
        priority: 95
      });
    }
    
    // Save all overrides
    for (const override of overrides) {
      await this.dataLoader.saveOverride(override, 'provider', provider);
    }
    
    console.log(`✓ ${discount}% discount applied to ${provider}`);
  }
  
  async removeOverride(path: string): Promise<boolean> {
    const { scope, provider } = this.parsePath(path);
    const result = await this.dataLoader.removeOverride(path, scope, provider);
    
    if (result) {
      console.log(`✓ Override removed: ${path}`);
    } else {
      console.log(`✗ Override not found: ${path}`);
    }
    
    return result;
  }
  
  async listOverrides(): Promise<Override[]> {
    return this.dataLoader.listOverrides();
  }
  
  async clearOverrides(scope?: 'global' | 'provider' | 'local', provider?: string): Promise<void> {
    const overrides = await this.dataLoader.listOverrides(scope, provider);
    
    for (const override of overrides) {
      const { scope: overrideScope, provider: overrideProvider } = this.parsePath(override.path);
      await this.dataLoader.removeOverride(override.path, overrideScope, overrideProvider);
    }
    
    console.log(`✓ Cleared ${overrides.length} overrides`);
  }
  
  private parsePath(path: string): { scope: 'global' | 'provider' | 'local'; provider?: string } {
    // Parse the path to determine scope and provider
    // Format: provider.path or global.path or local.provider.path
    const parts = path.split('.');
    
    if (parts[0] === 'global') {
      return { scope: 'global' };
    } else if (parts[0] === 'local' && parts.length > 1) {
      return { scope: 'local', provider: parts[1] };
    } else {
      // Assume provider-scoped
      return { scope: 'provider', provider: parts[0] };
    }
  }
  
  // Utility methods for common override patterns
  async setEnterprisePricing(provider: string): Promise<void> {
    const overrides: Override[] = [
      {
        path: `${provider}.enterprise.enabled`,
        value: true,
        reason: 'Enterprise features enabled',
        appliedAt: new Date().toISOString()
      },
      {
        path: `${provider}.enterprise.customPricing`,
        value: true,
        reason: 'Custom enterprise pricing',
        appliedAt: new Date().toISOString()
      }
    ];
    
    for (const override of overrides) {
      await this.dataLoader.saveOverride(override, 'provider', provider);
    }
    
    console.log(`✓ Enterprise pricing enabled for ${provider}`);
  }
  
  async setRegionalPricing(provider: string, region: string, multiplier: number): Promise<void> {
    const override: Override = {
      path: `${provider}.regional.${region}.priceMultiplier`,
      value: multiplier,
      reason: `Regional pricing for ${region}`,
      appliedAt: new Date().toISOString()
    };
    
    await this.dataLoader.saveOverride(override, 'provider', provider);
    console.log(`✓ Regional pricing set for ${provider} in ${region}: ${multiplier}x`);
  }
  
  async setPromotionalPricing(
    provider: string, 
    discount: number, 
    expiresAt: Date
  ): Promise<void> {
    const override: Override = {
      path: `${provider}.promotional`,
      value: {
        discount,
        expiresAt: expiresAt.toISOString(),
        active: true
      },
      reason: `Promotional pricing: ${discount}% off until ${expiresAt.toLocaleDateString()}`,
      appliedAt: new Date().toISOString(),
      priority: 110
    };
    
    await this.dataLoader.saveOverride(override, 'provider', provider);
    console.log(`✓ Promotional pricing set for ${provider}: ${discount}% off`);
  }
  
  async validateOverrides(provider?: string): Promise<ValidationResult> {
    const overrides = await this.dataLoader.listOverrides(undefined, provider);
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (const override of overrides) {
      // Check for conflicts
      const conflicting = overrides.filter(o => 
        o.path === override.path && o !== override
      );
      
      if (conflicting.length > 0) {
        warnings.push(`Conflicting overrides for path: ${override.path}`);
      }
      
      // Check for expired promotional pricing
      if (override.path.includes('promotional') && override.value?.expiresAt) {
        const expiresAt = new Date(override.value.expiresAt);
        if (expiresAt < new Date()) {
          warnings.push(`Expired promotional pricing: ${override.path}`);
        }
      }
      
      // Check for invalid values
      if (typeof override.value === 'number' && override.value < 0) {
        errors.push(`Negative value in override: ${override.path}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

// Factory function
export function createOverrideManager(dataLoader: DataLoader): OverrideManager {
  return new DefaultOverrideManager(dataLoader);
}