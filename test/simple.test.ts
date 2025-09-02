import { describe, it, expect } from 'vitest';
import { validateArchitecture } from '../src/lib/validators.js';
import { CostEngine } from '../src/core/cost-engine.js';

describe('Architecture Simulator - Basic Tests', () => {
  describe('Validators', () => {
    it('should detect missing required fields', () => {
      const architecture = {
        name: 'Invalid Architecture',
        // Missing other required fields
      };

      const result = validateArchitecture(architecture);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate unsupported language', () => {
      const architecture = {
        name: 'Test Architecture',
        application: {
          language: 'invalidlanguage',
          runtime: 'node',
          framework: 'express',
        },
        hosting: {},
        databases: {},
        load_profile: {},
        performance_targets: {},
        budget: {},
      };

      const result = validateArchitecture(architecture);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Unsupported language'))).toBe(true);
    });

    it('should validate load profile numbers', () => {
      const architecture = {
        name: 'Test Architecture',
        application: {
          language: 'javascript',
          runtime: 'node',
          framework: 'express',
        },
        hosting: {},
        databases: {},
        load_profile: {
          concurrent_users: -5, // Invalid negative number
          requests_per_second: 'not-a-number', // Invalid type
        },
        performance_targets: {},
        budget: {},
      };

      const result = validateArchitecture(architecture);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('positive number'))).toBe(true);
    });

    it('should validate read/write ratio format', () => {
      const architecture = {
        name: 'Test Architecture',
        application: {
          language: 'javascript',
          runtime: 'node',
          framework: 'express',
        },
        hosting: {},
        databases: {},
        load_profile: {
          read_write_ratio: 'invalid-format', // Should be XX:YY
        },
        performance_targets: {},
        budget: {},
      };

      const result = validateArchitecture(architecture);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('format "XX:YY"'))).toBe(true);
    });
  });

  describe('Cost Engine', () => {
    it('should instantiate CostEngine', () => {
      const engine = new CostEngine();
      expect(engine).toBeDefined();
      expect(typeof engine.calculateTotalCost).toBe('function');
    });

    it('should handle architecture with basic hosting (without external data)', () => {
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
  });

  describe('Core functionality', () => {
    it('should export main functions', async () => {
      // Test that our main modules export what they should
      const { validateArchitecture } = await import('../src/lib/validators.js');
      const { CostEngine } = await import('../src/core/cost-engine.js');

      expect(typeof validateArchitecture).toBe('function');
      expect(typeof CostEngine).toBe('function');
    });
  });
});
