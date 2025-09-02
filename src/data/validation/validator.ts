import type { ValidationResult, PricingData } from '../../providers/base/provider.interface';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
}

export interface ValidationSchema {
  rules: ValidationRule[];
  strict?: boolean;
}

export class Validator {
  private schemas: Map<string, ValidationSchema> = new Map();
  
  constructor() {
    this.initializeDefaultSchemas();
  }
  
  private initializeDefaultSchemas(): void {
    // Pricing data schema
    this.schemas.set('pricing', {
      rules: [
        { field: 'provider', required: true, type: 'string' },
        { field: 'lastUpdated', required: true, type: 'string' },
        { field: 'tiers', required: true, type: 'array' },
        { field: 'services', required: true, type: 'array' },
        { field: 'billingPeriod', required: true, pattern: /^(monthly|yearly|hourly)$/ },
        { field: 'currency', required: true, type: 'string', pattern: /^[A-Z]{3}$/ }
      ],
      strict: true
    });
    
    // Tier schema
    this.schemas.set('tier', {
      rules: [
        { field: 'name', required: true, type: 'string' },
        { field: 'basePrice', required: true, type: 'number', min: 0 },
        { field: 'limits', required: true, type: 'object' },
        { field: 'features', required: true, type: 'array' }
      ]
    });
    
    // Service pricing schema
    this.schemas.set('service', {
      rules: [
        { field: 'name', required: true, type: 'string' },
        { field: 'unit', required: true, type: 'string' },
        { field: 'price', required: true, type: 'number', min: 0 },
        { field: 'freeQuota', required: false, type: 'number', min: 0 }
      ]
    });
    
    // Usage schema
    this.schemas.set('usage', {
      rules: [
        { field: 'bandwidth', required: false, type: 'number', min: 0 },
        { field: 'storage', required: false, type: 'number', min: 0 },
        { field: 'compute', required: false, type: 'number', min: 0 },
        { field: 'requests', required: false, type: 'number', min: 0 },
        { field: 'users', required: false, type: 'number', min: 0 },
        { field: 'period', required: true, pattern: /^(monthly|yearly)$/ }
      ]
    });
    
    // Requirements schema
    this.schemas.set('requirements', {
      rules: [
        { field: 'budget', required: false, type: 'number', min: 0 },
        { field: 'traffic', required: false, type: 'number', min: 0 },
        { field: 'storage', required: false, type: 'number', min: 0 },
        { field: 'regions', required: false, type: 'array' },
        { field: 'features', required: false, type: 'array' },
        { field: 'scalability', required: false, pattern: /^(low|medium|high)$/ },
        { field: 'performance', required: false, pattern: /^(standard|high|ultra)$/ }
      ]
    });
  }
  
  validate(data: any, schemaName: string): ValidationResult {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      return {
        valid: false,
        errors: [`Unknown schema: ${schemaName}`]
      };
    }
    
    return this.validateWithSchema(data, schema);
  }
  
  validateWithSchema(data: any, schema: ValidationSchema): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    for (const rule of schema.rules) {
      const value = this.getFieldValue(data, rule.field);
      
      if (rule.required && (value === undefined || value === null)) {
        errors.push(`Missing required field: ${rule.field}`);
        continue;
      }
      
      if (value === undefined || value === null) {
        continue; // Skip validation for optional undefined fields
      }
      
      // Type validation
      if (rule.type && typeof value !== rule.type) {
        if (rule.type === 'array' && !Array.isArray(value)) {
          errors.push(`Field ${rule.field} must be an array`);
        } else if (rule.type !== 'array') {
          errors.push(`Field ${rule.field} must be of type ${rule.type}`);
        }
      }
      
      // Number range validation
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`Field ${rule.field} must be >= ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`Field ${rule.field} must be <= ${rule.max}`);
        }
      }
      
      // Pattern validation
      if (rule.pattern && typeof value === 'string') {
        if (!rule.pattern.test(value)) {
          const message = rule.message || `Field ${rule.field} does not match required pattern`;
          errors.push(message);
        }
      }
      
      // Custom validation
      if (rule.custom && !rule.custom(value)) {
        const message = rule.message || `Field ${rule.field} failed custom validation`;
        errors.push(message);
      }
    }
    
    // Strict mode: check for unknown fields
    if (schema.strict) {
      const knownFields = new Set(schema.rules.map(r => r.field));
      const dataFields = Object.keys(data);
      
      for (const field of dataFields) {
        if (!knownFields.has(field)) {
          warnings.push(`Unknown field: ${field}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  validatePricingData(data: PricingData): ValidationResult {
    const result = this.validate(data, 'pricing');
    
    if (result.valid && data.tiers) {
      // Validate each tier
      for (let i = 0; i < data.tiers.length; i++) {
        const tierResult = this.validate(data.tiers[i], 'tier');
        if (!tierResult.valid) {
          result.valid = false;
          result.errors = result.errors || [];
          result.errors.push(...(tierResult.errors || []).map(e => `Tier ${i}: ${e}`));
        }
      }
    }
    
    if (result.valid && data.services) {
      // Validate each service
      for (let i = 0; i < data.services.length; i++) {
        const serviceResult = this.validate(data.services[i], 'service');
        if (!serviceResult.valid) {
          result.valid = false;
          result.errors = result.errors || [];
          result.errors.push(...(serviceResult.errors || []).map(e => `Service ${i}: ${e}`));
        }
      }
    }
    
    return result;
  }
  
  registerSchema(name: string, schema: ValidationSchema): void {
    this.schemas.set(name, schema);
  }
  
  hasSchema(name: string): boolean {
    return this.schemas.has(name);
  }
  
  private getFieldValue(data: any, field: string): any {
    const paths = field.split('.');
    let current = data;
    
    for (const path of paths) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[path];
    }
    
    return current;
  }
  
  // Specific validators for common patterns
  validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  validateEmail(email: string): boolean {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  }
  
  validateSemver(version: string): boolean {
    const pattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$/;
    return pattern.test(version);
  }
  
  validateCurrency(currency: string): boolean {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'CAD', 'AUD'];
    return validCurrencies.includes(currency);
  }
  
  // Batch validation
  validateBatch(items: any[], schemaName: string): BatchValidationResult {
    const results: ValidationResult[] = [];
    let allValid = true;
    
    for (let i = 0; i < items.length; i++) {
      const result = this.validate(items[i], schemaName);
      results.push(result);
      if (!result.valid) {
        allValid = false;
      }
    }
    
    return {
      allValid,
      results,
      summary: {
        total: items.length,
        valid: results.filter(r => r.valid).length,
        invalid: results.filter(r => !r.valid).length
      }
    };
  }
}

export interface BatchValidationResult {
  allValid: boolean;
  results: ValidationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
}

// Singleton instance
let validatorInstance: Validator | null = null;

export function getValidator(): Validator {
  if (!validatorInstance) {
    validatorInstance = new Validator();
  }
  return validatorInstance;
}

export function resetValidator(): void {
  validatorInstance = null;
}