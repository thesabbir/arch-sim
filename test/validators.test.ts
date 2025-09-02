import { describe, it, expect } from 'vitest';
import { validateArchitecture } from '../src/lib/validators.js';

describe('Validators', () => {
  describe('validateArchitecture', () => {
    it('should validate a minimal valid architecture', () => {
      const architecture = {
        name: 'Test Architecture',
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
        databases: {
          primary: {
            type: 'relational',
            provider: 'postgresql',
            plan: 'starter',
          },
        },
        load_profile: {
          requests_per_second: 50,
          peak_multiplier: 2,
          monthly_active_users: 1000,
          average_request_size_kb: 1,
          average_response_size_kb: 5,
          concurrent_users: 100,
        },
        performance_targets: {
          response_time_p50: 200,
          response_time_p95: 500,
          uptime_sla: 99.9,
          throughput_rps: 100,
        },
        budget: {
          monthly_limit: 100,
          currency: 'USD',
        },
      };

      const result = validateArchitecture(architecture);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const architecture = {
        name: 'Invalid Architecture',
        application: {
          language: 'javascript',
          // Missing runtime and framework
        },
      };

      const result = validateArchitecture(architecture);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate language compatibility', () => {
      const architecture = {
        name: 'Test Architecture',
        application: {
          language: 'invalidlang', // Invalid language
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
        databases: {
          primary: {
            type: 'relational',
            provider: 'postgresql',
            plan: 'starter',
          },
        },
        load_profile: {
          requests_per_second: 50,
          peak_multiplier: 2,
          monthly_active_users: 1000,
          average_request_size_kb: 1,
          average_response_size_kb: 5,
          concurrent_users: 100,
        },
        performance_targets: {
          response_time_p50: 500,
          response_time_p95: 500,
          uptime_sla: 99.9,
          throughput_rps: 100,
        },
        budget: {
          monthly_limit: 100,
          currency: 'USD',
        },
      };

      const result = validateArchitecture(architecture);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Unsupported language'))).toBe(true);
    });

    it('should warn about performance concerns', () => {
      const architecture = {
        name: 'High Load Architecture',
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
        databases: {
          primary: {
            type: 'relational',
            provider: 'postgresql',
            plan: 'starter',
          },
        },
        load_profile: {
          requests_per_second: 5000, // Very high load
          peak_multiplier: 5,
          monthly_active_users: 100000,
          average_request_size_kb: 1,
          average_response_size_kb: 5,
          concurrent_users: 10000,
        },
        performance_targets: {
          response_time_p50: 5,
          response_time_p95: 5, // Very aggressive target (below 10ms threshold)
          uptime_sla: 99.99,
          throughput_rps: 25000, // Way higher than load
        },
        budget: {
          monthly_limit: 50,
          currency: 'USD',
        },
      };

      const result = validateArchitecture(architecture);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some(
          (w) => w.message.includes('aggressive') || w.message.includes('higher')
        )
      ).toBe(true);
    });

    it('should validate database configuration', () => {
      const architecture = {
        name: 'Database Architecture',
        application: {
          language: 'javascript',
          runtime: 'node',
          framework: 'express',
        },
        databases: {
          primary: {
            type: 'relational',
            provider: 'postgresql',
            plan: 'starter',
          },
          cache: {
            provider: 'redis',
            plan: 'free',
          },
        },
        hosting: {
          backend: {
            provider: 'render',
            service_type: 'container',
            instance_type: 'starter',
          },
        },
        load_profile: {
          requests_per_second: 50,
          peak_multiplier: 2,
          monthly_active_users: 1000,
          average_request_size_kb: 1,
          average_response_size_kb: 5,
          concurrent_users: 100,
        },
        performance_targets: {
          response_time_p50: 200,
          response_time_p95: 500,
          uptime_sla: 99.9,
          throughput_rps: 100,
        },
        budget: {
          monthly_limit: 100,
          currency: 'USD',
        },
      };

      const result = validateArchitecture(architecture);
      expect(result.valid).toBe(true);
    });

    it('should validate load profile ratios', () => {
      const architecture = {
        name: 'Test Architecture',
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
        databases: {
          primary: {
            type: 'relational',
            provider: 'postgresql',
            plan: 'starter',
          },
        },
        load_profile: {
          requests_per_second: 50,
          peak_multiplier: 2,
          monthly_active_users: 1000,
          average_request_size_kb: 1,
          average_response_size_kb: 5,
          concurrent_users: 100,
          read_write_ratio: '70:40', // Doesn't sum to 100
        },
        performance_targets: {
          response_time_p50: 200,
          response_time_p95: 500,
          uptime_sla: 99.9,
          throughput_rps: 100,
        },
        budget: {
          monthly_limit: 100,
          currency: 'USD',
        },
      };

      const result = validateArchitecture(architecture);
      expect(result.warnings.some((w) => w.message.includes('sum to 100'))).toBe(true);
    });
  });
});
