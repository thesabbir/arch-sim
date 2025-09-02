import type { PricingData, ValidationResult } from '../../providers/base/provider.interface';

export interface ValidationConfig {
  requiredFields: string[];
  priceRanges?: {
    min: number;
    max: number;
  };
  customRules?: ValidationRule[];
}

export interface ValidationRule {
  name: string;
  validate: (data: PricingData) => boolean;
  message: string;
}

export class PricingValidator {
  private config: ValidationConfig;
  
  constructor(config: ValidationConfig) {
    this.config = config;
  }
  
  /**
   * Validate pricing data structure and values
   */
  validate(data: PricingData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    for (const field of this.config.requiredFields) {
      if (!this.hasField(data, field)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate data structure
    if (!data.provider) {
      errors.push('Provider name is required');
    }
    
    if (!data.currency) {
      errors.push('Currency is required');
    }
    
    if (!data.lastUpdated) {
      warnings.push('Last updated timestamp is missing');
    } else if (!this.isValidDate(data.lastUpdated)) {
      errors.push('Invalid date format for lastUpdated');
    }
    
    // Validate tiers
    if (data.tiers && Array.isArray(data.tiers)) {
      data.tiers.forEach((tier, index) => {
        if (!tier.name) {
          errors.push(`Tier ${index} is missing a name`);
        }
        if (tier.basePrice !== undefined && typeof tier.basePrice !== 'number') {
          errors.push(`Tier ${tier.name} has invalid basePrice`);
        }
        
        // Check price ranges if configured
        if (this.config.priceRanges && tier.basePrice !== undefined) {
          if (tier.basePrice < this.config.priceRanges.min) {
            warnings.push(`Tier ${tier.name} price below expected minimum`);
          }
          if (tier.basePrice > this.config.priceRanges.max) {
            warnings.push(`Tier ${tier.name} price above expected maximum`);
          }
        }
      });
    }
    
    // Validate services
    if (data.services && Array.isArray(data.services)) {
      data.services.forEach((service, index) => {
        if (!service.name) {
          errors.push(`Service ${index} is missing a name`);
        }
        if (!(service as any).category) {
          warnings.push(`Service ${service.name} is missing a category`);
        }
      });
    }
    
    // Apply custom validation rules
    if (this.config.customRules) {
      for (const rule of this.config.customRules) {
        try {
          if (!rule.validate(data)) {
            errors.push(rule.message);
          }
        } catch (error) {
          warnings.push(`Validation rule ${rule.name} failed: ${error}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  /**
   * Validate data freshness
   */
  validateFreshness(data: PricingData, maxAgeHours: number = 24 * 30): boolean {
    if (!data.lastUpdated) {
      return false;
    }
    
    const lastUpdate = new Date(data.lastUpdated);
    const now = new Date();
    const ageHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    return ageHours <= maxAgeHours;
  }
  
  /**
   * Compare two pricing data objects for structural compatibility
   */
  compareStructure(data1: PricingData, data2: PricingData): ValidationResult {
    const differences: string[] = [];
    
    // Compare tiers
    if (data1.tiers && data2.tiers) {
      const tiers1 = new Set(data1.tiers.map(t => t.name));
      const tiers2 = new Set(data2.tiers.map(t => t.name));
      
      for (const tier of tiers1) {
        if (!tiers2.has(tier)) {
          differences.push(`Tier '${tier}' missing in second dataset`);
        }
      }
      
      for (const tier of tiers2) {
        if (!tiers1.has(tier)) {
          differences.push(`Tier '${tier}' missing in first dataset`);
        }
      }
    }
    
    // Compare services
    if (data1.services && data2.services) {
      const services1 = new Set(data1.services.map(s => s.name));
      const services2 = new Set(data2.services.map(s => s.name));
      
      for (const service of services1) {
        if (!services2.has(service)) {
          differences.push(`Service '${service}' missing in second dataset`);
        }
      }
      
      for (const service of services2) {
        if (!services1.has(service)) {
          differences.push(`Service '${service}' missing in first dataset`);
        }
      }
    }
    
    return {
      valid: differences.length === 0,
      warnings: differences.length > 0 ? differences : undefined
    };
  }
  
  /**
   * Validate pricing logic (e.g., tier progression)
   */
  validatePricingLogic(data: PricingData): ValidationResult {
    const warnings: string[] = [];
    
    if (data.tiers && data.tiers.length > 1) {
      // Check that tier prices increase
      const sortedTiers = [...data.tiers].sort((a, b) => 
        (a.basePrice || 0) - (b.basePrice || 0)
      );
      
      for (let i = 1; i < sortedTiers.length; i++) {
        const prevTier = sortedTiers[i - 1];
        const currTier = sortedTiers[i];
        if (!prevTier || !currTier) continue;
        
        const prevPrice = prevTier.basePrice || 0;
        const currPrice = currTier.basePrice || 0;
        
        if (currPrice <= prevPrice) {
          warnings.push(
            `Tier ${currTier.name} price is not higher than ${prevTier.name}`
          );
        }
      }
      
      // Check that tier limits increase
      const firstLimits = sortedTiers[0]?.limits;
      const lastLimits = sortedTiers[sortedTiers.length - 1]?.limits;
      
      if (firstLimits && lastLimits) {
        for (const key of Object.keys(firstLimits)) {
          let prevLimit = firstLimits[key];
          
          for (let i = 1; i < sortedTiers.length; i++) {
            const tier = sortedTiers[i];
            if (!tier) continue;
            
            const currLimit = tier.limits?.[key];
            if (currLimit !== undefined && prevLimit !== undefined && currLimit <= prevLimit) {
              warnings.push(
                `Tier ${tier.name} has non-increasing limit for ${key}`
              );
            }
            if (currLimit !== undefined) {
              prevLimit = currLimit;
            }
          }
        }
      }
    }
    
    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  private hasField(obj: any, path: string): boolean {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined || !(part in current)) {
        return false;
      }
      current = current[part];
    }
    
    return true;
  }
  
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
}