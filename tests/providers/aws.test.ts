import { describe, it, expect, beforeEach } from 'vitest';
import { AWSProvider } from '../../src/providers/implementations/aws/index-refactored';
import { BasePricingService } from '../../src/providers/base/pricing-service';
import type { Usage, PricingData } from '../../src/providers/base/provider.interface';

describe('AWS Provider', () => {
  let provider: AWSProvider;
  let mockPricingData: PricingData;

  beforeEach(() => {
    provider = new AWSProvider();
    mockPricingData = {
      provider: 'aws',
      lastUpdated: '2025-01-15T00:00:00Z',
      currency: 'USD',
      billingPeriod: 'monthly',
      tiers: [],
      services: [
        {
          name: 'bandwidth',
          unit: 'GB',
          price: 0.09,
          freeQuota: 100
        },
        {
          name: 'apprunner_vcpu',
          unit: 'hour',
          price: 0.064
        },
        {
          name: 'apprunner_memory',
          unit: 'GB-hour',
          price: 0.007
        },
        {
          name: 'rds_storage',
          unit: 'GB-month',
          price: 0.08
        },
        {
          name: 'rds_io',
          unit: 'million',
          price: 0.10
        },
        {
          name: 'rds_backup',
          unit: 'GB-month',
          price: 0.095,
          freeQuota: 1
        },
        {
          name: 's3_storage',
          unit: 'GB-month',
          price: 0.023
        },
        {
          name: 's3_get_requests',
          unit: '1000',
          price: 0.0004
        },
        {
          name: 's3_put_requests',
          unit: '1000',
          price: 0.005
        },
        {
          name: 's3_transfer',
          unit: 'GB',
          price: 0.09,
          freeQuota: 1
        }
      ]
    };
  });

  describe('Provider Initialization', () => {
    it('should have correct name and version', () => {
      expect(provider.name).toBe('aws');
      expect(provider.version).toBe('2.0.0');
    });

    it('should have all required services', () => {
      expect(provider.services.hosting).toBeDefined();
      expect(provider.services.database).toBeDefined();
      expect(provider.services.storage).toBeDefined();
    });

    it('should have valid metadata', () => {
      expect(provider.metadata.name).toBe('Amazon Web Services');
      expect(provider.metadata.regions).toContain('us-east-1');
      expect(provider.metadata.supportedFrameworks).toContain('Node.js');
    });
  });

  describe('Price Calculator', () => {
    let usage: Usage;

    beforeEach(() => {
      usage = {
        bandwidth: 150, // 50GB over free tier
        storage: 100,
        compute: 730, // Full month
        requests: 1000000,
        users: 1000,
        period: 'monthly'
      };
    });

    it('should calculate bandwidth costs correctly', () => {
      const breakdown = provider.priceCalculator.calculateCost(usage, mockPricingData);
      // 50GB over free tier * $0.09/GB = $4.50
      expect(breakdown.serviceCosts.bandwidth).toBeCloseTo(4.5, 2);
    });

    it('should calculate compute costs correctly', () => {
      const breakdown = provider.priceCalculator.calculateCost(usage, mockPricingData);
      // 730 hours * 0.5 vCPU * $0.064 + 730 hours * 1 GB * $0.007
      const expectedCost = (730 * 0.5 * 0.064) + (730 * 1 * 0.007);
      expect(breakdown.serviceCosts.compute).toBeCloseTo(expectedCost, 2);
    });

    it('should calculate database costs correctly', () => {
      const breakdown = provider.priceCalculator.calculateCost(usage, mockPricingData);
      // Storage: 100GB * $0.08 = $8
      // IO: 1M operations * $0.10 = $0.10
      const expectedCost = (100 * 0.08) + (1 * 0.10);
      expect(breakdown.serviceCosts.database).toBeCloseTo(expectedCost, 2);
    });

    it('should handle zero usage', () => {
      const zeroUsage: Usage = {
        bandwidth: 0,
        storage: 0,
        compute: 0,
        requests: 0,
        users: 0,
        period: 'monthly'
      };
      const breakdown = provider.priceCalculator.calculateCost(zeroUsage, mockPricingData);
      expect(breakdown.totalCost).toBe(0);
    });

    it('should respect free tiers', () => {
      const smallUsage: Usage = {
        bandwidth: 50, // Under 100GB free tier
        storage: 0,
        compute: 0,
        requests: 0,
        users: 0,
        period: 'monthly'
      };
      const breakdown = provider.priceCalculator.calculateCost(smallUsage, mockPricingData);
      expect(breakdown.serviceCosts.bandwidth).toBe(0);
    });

    it('should calculate monthly estimate', () => {
      const monthly = provider.priceCalculator.calculateMonthlyEstimate(usage, mockPricingData);
      expect(monthly).toBeGreaterThan(0);
      expect(monthly).toBeLessThan(1000); // Sanity check
    });

    it('should calculate yearly estimate with discount', () => {
      const monthly = provider.priceCalculator.calculateMonthlyEstimate(usage, mockPricingData);
      const yearly = provider.priceCalculator.calculateYearlyEstimate(usage, mockPricingData);
      expect(yearly).toBeCloseTo(monthly * 12 * 0.9, 2); // 10% discount
    });
  });

  describe('Requirements Checking', () => {
    it('should accept supported regions', () => {
      const requirements = {
        regions: ['us-east-1'],
        features: [],
        budget: 100
      };
      expect(provider.meetsRequirements!(requirements)).toBe(true);
    });

    it('should reject unsupported regions', () => {
      const requirements = {
        regions: ['mars-1'],
        features: [],
        budget: 100
      };
      expect(provider.meetsRequirements!(requirements)).toBe(false);
    });

    it('should reject if budget too low', () => {
      const requirements = {
        regions: ['us-east-1'],
        features: [],
        budget: 20 // Too low for AWS
      };
      expect(provider.meetsRequirements!(requirements)).toBe(false);
    });
  });

  describe('Validator', () => {
    it('should validate correct config', () => {
      const config = {
        region: 'us-east-1',
        instanceType: 't3.micro'
      };
      const result = provider.validator!.validate(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should warn about missing region', () => {
      const config = {};
      const result = provider.validator!.validate(config);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('No region specified, defaulting to us-east-1');
    });

    it('should error on invalid instance type', () => {
      const config = {
        instanceType: 'invalid.type'
      };
      const result = provider.validator!.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid instance type: invalid.type');
    });

    it('should validate pricing data', () => {
      const result = provider.validator!.validatePricing(mockPricingData);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid pricing data', () => {
      const invalidPricing = {
        provider: 'aws'
        // Missing required fields
      };
      const result = provider.validator!.validatePricing(invalidPricing);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Pricing must include services array');
    });
  });

  describe('Service Capabilities', () => {
    it('should return App Runner capabilities', () => {
      const capabilities = provider.services.hosting!.getCapabilities();
      expect(capabilities.scalable).toBe(true);
      expect(capabilities.features).toContain('auto-scaling');
      expect(capabilities.regions).toContain('us-east-1');
    });

    it('should return RDS capabilities', () => {
      const capabilities = provider.services.database!.getCapabilities();
      expect(capabilities.features).toContain('automated-backups');
      expect(capabilities.limits?.maxStorage).toBe(64000);
    });

    it('should return S3 capabilities', () => {
      const capabilities = provider.services.storage!.getCapabilities();
      expect(capabilities.features).toContain('versioning');
      expect(capabilities.limits?.maxObjectSize).toBe(5000000);
    });
  });
});

describe('BasePricingService', () => {
  let pricingService: BasePricingService;
  let mockPricingData: PricingData;

  beforeEach(() => {
    mockPricingData = {
      provider: 'test',
      lastUpdated: '2025-01-15',
      currency: 'USD',
      billingPeriod: 'monthly',
      tiers: [
        {
          name: 'free',
          basePrice: 0,
          limits: { bandwidth: 100 },
          features: []
        }
      ],
      services: [
        {
          name: 'bandwidth',
          unit: 'GB',
          price: 0.10,
          freeQuota: 100
        }
      ]
    };
    pricingService = new BasePricingService(mockPricingData);
  });

  it('should get service price', () => {
    expect(pricingService.getServicePrice('bandwidth')).toBe(0.10);
  });

  it('should return 0 for unknown service', () => {
    expect(pricingService.getServicePrice('unknown')).toBe(0);
  });

  it('should get tier limit', () => {
    expect(pricingService.getTierLimit('free', 'bandwidth')).toBe(100);
  });

  it('should calculate overage correctly', () => {
    expect(pricingService.calculateOverage(150, 100, 0.10)).toBe(5); // 50 * 0.10
    expect(pricingService.calculateOverage(50, 100, 0.10)).toBe(0); // No overage
  });

  it('should calculate tiered pricing', () => {
    const tiers = [
      { limit: 100, price: 0.10 },
      { limit: 900, price: 0.08 },
      { limit: Infinity, price: 0.06 }
    ];
    
    // 150 units: 100 @ 0.10 + 50 @ 0.08
    expect(pricingService.calculateTieredPricing(150, tiers)).toBe(14);
    
    // 1500 units: 100 @ 0.10 + 900 @ 0.08 + 500 @ 0.06
    expect(pricingService.calculateTieredPricing(1500, tiers)).toBe(112);
  });
});