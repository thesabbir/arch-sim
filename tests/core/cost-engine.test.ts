import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CostEngine } from '../../src/core/cost-engine';
import { ProviderRegistry } from '../../src/core/provider-registry';
import { DataLoader } from '../../src/data/storage/data-loader';
import type { Provider, Usage, PricingData, CostBreakdown } from '../../src/providers/base/provider.interface';

describe('CostEngine', () => {
  let costEngine: CostEngine;
  let mockRegistry: ProviderRegistry;
  let mockDataLoader: DataLoader;
  let mockProvider: Provider;
  let mockPricingData: PricingData;

  beforeEach(() => {
    // Mock pricing data
    mockPricingData = {
      provider: 'test-provider',
      lastUpdated: '2025-01-15',
      currency: 'USD',
      billingPeriod: 'monthly',
      tiers: [],
      services: [
        {
          name: 'compute',
          unit: 'hour',
          price: 0.10
        },
        {
          name: 'bandwidth',
          unit: 'GB',
          price: 0.05
        }
      ]
    };

    // Mock provider
    mockProvider = {
      name: 'test-provider',
      version: '1.0.0',
      services: {},
      dataLoader: {} as any,
      priceCalculator: {
        calculateCost: vi.fn((usage: Usage, pricing: PricingData): CostBreakdown => ({
          baseCost: 10,
          serviceCosts: {
            compute: usage.compute ? usage.compute * 0.10 : 0,
            bandwidth: usage.bandwidth ? usage.bandwidth * 0.05 : 0
          },
          totalCost: 10 + (usage.compute || 0) * 0.10 + (usage.bandwidth || 0) * 0.05,
          currency: 'USD',
          period: 'monthly',
          details: []
        })),
        calculateMonthlyEstimate: vi.fn((usage: Usage) => 
          10 + (usage.compute || 0) * 0.10 + (usage.bandwidth || 0) * 0.05
        ),
        calculateYearlyEstimate: vi.fn((usage: Usage) => 
          (10 + (usage.compute || 0) * 0.10 + (usage.bandwidth || 0) * 0.05) * 12
        )
      },
      metadata: {
        name: 'Test Provider',
        website: 'https://test.com',
        regions: ['us-east-1'],
        pricingUrl: 'https://test.com/pricing'
      }
    };

    // Mock registry
    mockRegistry = {
      getProvider: vi.fn(() => mockProvider),
      listProviderNames: vi.fn(() => ['test-provider', 'another-provider']),
      findProvidersByRequirements: vi.fn(() => [mockProvider])
    } as any;

    // Mock data loader
    mockDataLoader = {
      loadProviderData: vi.fn(() => Promise.resolve(mockPricingData))
    } as any;

    costEngine = new CostEngine(mockRegistry, mockDataLoader);
  });

  describe('calculateCost', () => {
    it('should calculate cost for a provider', async () => {
      const usage: Usage = {
        compute: 100,
        bandwidth: 50,
        period: 'monthly'
      };

      const estimate = await costEngine.calculateCost('test-provider', usage);

      expect(estimate.provider).toBe('test-provider');
      expect(estimate.monthly).toBe(25); // 10 + 100*0.10 + 50*0.05
      expect(estimate.yearly).toBe(300); // 25 * 12
      expect(estimate.breakdown.totalCost).toBe(25);
    });

    it('should handle zero usage', async () => {
      const usage: Usage = {
        compute: 0,
        bandwidth: 0,
        period: 'monthly'
      };

      const estimate = await costEngine.calculateCost('test-provider', usage);

      expect(estimate.monthly).toBe(10); // Base cost only
      expect(estimate.breakdown.serviceCosts.compute).toBe(0);
      expect(estimate.breakdown.serviceCosts.bandwidth).toBe(0);
    });

    it('should include confidence score', async () => {
      const usage: Usage = {
        compute: 100,
        period: 'monthly'
      };

      const estimate = await costEngine.calculateCost('test-provider', usage);

      expect(estimate.confidence).toBeGreaterThan(0);
      expect(estimate.confidence).toBeLessThanOrEqual(1);
    });

    it('should generate assumptions', async () => {
      const usage: Usage = {
        compute: 100,
        period: 'monthly'
      };

      const estimate = await costEngine.calculateCost('test-provider', usage);

      expect(estimate.assumptions).toBeDefined();
      expect(Array.isArray(estimate.assumptions)).toBe(true);
    });
  });

  describe('compareProviders', () => {
    beforeEach(() => {
      // Add another mock provider
      const anotherProvider = {
        ...mockProvider,
        name: 'another-provider',
        priceCalculator: {
          calculateCost: vi.fn(() => ({
            baseCost: 5,
            serviceCosts: { compute: 15, bandwidth: 3 },
            totalCost: 23,
            currency: 'USD',
            period: 'monthly',
            details: []
          })),
          calculateMonthlyEstimate: vi.fn(() => 23),
          calculateYearlyEstimate: vi.fn(() => 276)
        }
      };

      mockRegistry.getProvider = vi.fn((name: string) => 
        name === 'test-provider' ? mockProvider : anotherProvider
      );
    });

    it('should compare multiple providers', async () => {
      const usage: Usage = {
        compute: 100,
        bandwidth: 50,
        period: 'monthly'
      };

      const comparison = await costEngine.compareProviders(usage);

      expect(comparison.estimates).toHaveLength(2);
      expect(comparison.cheapest.provider).toBe('another-provider');
      expect(comparison.cheapest.monthly).toBe(23);
      expect(comparison.mostExpensive.provider).toBe('test-provider');
      expect(comparison.mostExpensive.monthly).toBe(25);
    });

    it('should sort estimates by monthly cost', async () => {
      const usage: Usage = {
        compute: 100,
        period: 'monthly'
      };

      const comparison = await costEngine.compareProviders(usage);

      for (let i = 1; i < comparison.estimates.length; i++) {
        expect(comparison.estimates[i]!.monthly).toBeGreaterThanOrEqual(
          comparison.estimates[i - 1]!.monthly
        );
      }
    });

    it('should generate recommendations', async () => {
      const usage: Usage = {
        compute: 100,
        period: 'monthly'
      };

      const comparison = await costEngine.compareProviders(usage);

      expect(comparison.recommendations).toBeDefined();
      expect(Array.isArray(comparison.recommendations)).toBe(true);
    });

    it('should handle provider calculation errors gracefully', async () => {
      // Make one provider throw an error
      mockRegistry.getProvider = vi.fn((name: string) => {
        if (name === 'test-provider') {
          throw new Error('Provider error');
        }
        return mockProvider;
      });

      const usage: Usage = {
        compute: 100,
        period: 'monthly'
      };

      const comparison = await costEngine.compareProviders(usage);

      // Should still return results from working provider
      expect(comparison.estimates.length).toBeGreaterThan(0);
    });

    it('should filter by specific providers', async () => {
      const usage: Usage = {
        compute: 100,
        period: 'monthly'
      };

      const comparison = await costEngine.compareProviders(usage, ['test-provider']);

      expect(comparison.estimates).toHaveLength(1);
      expect(comparison.estimates[0]!.provider).toBe('test-provider');
    });
  });

  describe('findOptimalProvider', () => {
    it('should find the cheapest provider meeting requirements', async () => {
      const requirements = {
        regions: ['us-east-1'],
        features: [],
        budget: 100
      };

      const optimal = await costEngine.findOptimalProvider(requirements);

      expect(optimal).not.toBeNull();
      expect(optimal!.provider).toBe('test-provider');
    });

    it('should return null if no providers meet requirements', async () => {
      mockRegistry.findProvidersByRequirements = vi.fn(() => []);

      const requirements = {
        regions: ['mars-1'],
        features: [],
        budget: 10
      };

      const optimal = await costEngine.findOptimalProvider(requirements);

      expect(optimal).toBeNull();
    });

    it('should convert requirements to usage correctly', async () => {
      const requirements = {
        users: 1000,
        requests: 1000000,
        storage: 100,
        regions: ['us-east-1'],
        features: [],
        budget: 100
      };

      const optimal = await costEngine.findOptimalProvider(requirements);

      expect(optimal).not.toBeNull();
      // Verify the conversion happened (check through mock calls)
      expect(mockProvider.priceCalculator.calculateCost).toHaveBeenCalled();
    });
  });

  describe('forecastCosts', () => {
    it('should forecast costs with growth', async () => {
      const usage: Usage = {
        compute: 100,
        bandwidth: 50,
        period: 'monthly'
      };

      const forecasts = await costEngine.forecastCosts('test-provider', usage, 10, 3);

      expect(forecasts).toHaveLength(3);
      
      // Each month should be 10% more than previous
      expect(forecasts[1]!.monthly).toBeCloseTo(forecasts[0]!.monthly * 1.1, 2);
      expect(forecasts[2]!.monthly).toBeCloseTo(forecasts[1]!.monthly * 1.1, 2);
    });

    it('should handle zero growth', async () => {
      const usage: Usage = {
        compute: 100,
        period: 'monthly'
      };

      const forecasts = await costEngine.forecastCosts('test-provider', usage, 0, 3);

      expect(forecasts).toHaveLength(3);
      
      // All months should be the same
      expect(forecasts[0]!.monthly).toBe(forecasts[1]!.monthly);
      expect(forecasts[1]!.monthly).toBe(forecasts[2]!.monthly);
    });

    it('should handle negative growth', async () => {
      const usage: Usage = {
        compute: 100,
        period: 'monthly'
      };

      const forecasts = await costEngine.forecastCosts('test-provider', usage, -10, 3);

      expect(forecasts).toHaveLength(3);
      
      // Each month should be 10% less than previous
      expect(forecasts[1]!.monthly).toBeCloseTo(forecasts[0]!.monthly * 0.9, 2);
      expect(forecasts[2]!.monthly).toBeCloseTo(forecasts[1]!.monthly * 0.9, 2);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown provider', async () => {
      mockRegistry.getProvider = vi.fn(() => {
        throw new Error("Provider 'unknown' not found");
      });

      const usage: Usage = {
        compute: 100,
        period: 'monthly'
      };

      await expect(costEngine.calculateCost('unknown', usage)).rejects.toThrow("Provider 'unknown' not found");
    });

    it('should throw error when no providers can calculate costs', async () => {
      mockRegistry.listProviderNames = vi.fn(() => []);

      const usage: Usage = {
        compute: 100,
        period: 'monthly'
      };

      await expect(costEngine.compareProviders(usage)).rejects.toThrow(
        'No providers could calculate costs for the given usage'
      );
    });
  });
});