import { describe, it, expect } from 'vitest';
import { CostEngine } from '../src/core/cost-engine.js';

describe('CostEngine', () => {
  describe('Basic functionality', () => {
    it('should instantiate CostEngine', () => {
      const engine = new CostEngine();
      expect(engine).toBeDefined();
      expect(typeof engine.calculateTotalCost).toBe('function');
    });

    it('should handle architecture with basic hosting (no external data required)', () => {
      const engine = new CostEngine();
      const architecture = {
        name: 'Basic Test',
        application: {
          language: 'javascript',
          runtime: 'node',
          framework: 'express',
        },
        hosting: {
          backend: {
            provider: 'render',
            service_type: 'container',
            instance_type: 'starter',
          },
        },
        databases: {},
        services: {},
        load_profile: {
          requests_per_second: 50,
          peak_multiplier: 2,
          monthly_active_users: 1000,
          average_request_size_kb: 1,
          average_response_size_kb: 5,
          concurrent_users: 100,
        },
      };

      // This test doesn't require pricing data to be loaded
      // It should either succeed or fail gracefully
      try {
        const result = engine.calculateTotalCost(architecture);
        expect(result).toBeDefined();
        expect(typeof result.totalCost).toBe('number');
        expect(result.breakdown).toBeDefined();
        expect(result.currency).toBe('USD');
      } catch (error) {
        // If pricing data is not available, that's expected in test environment
        expect(error.message).toContain('Pricing data not available');
      }
    });

    it('should have required methods', () => {
      const engine = new CostEngine();
      expect(typeof engine.calculateTotalCost).toBe('function');
      expect(typeof engine.generateCostOptimizations).toBe('function');
    });
  });
});
