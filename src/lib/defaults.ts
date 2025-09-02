export const SIMULATION_DEFAULTS = {
  // Network response characteristics
  avgResponseSizeKB: 2, // Average API response size in KB

  // Latency configurations (in milliseconds)
  latency: {
    database: {
      neon: 12,
      planetscale: 15,
      supabase: 18,
      mongodb_atlas: 22,
      fauna: 35,
      default: 20,
    } as Record<string, number>,
    cache: {
      upstash_redis: 3,
      redis_cloud: 2,
      default: 3,
    } as Record<string, number>,
    network: {
      'us-east': 2,
      'us-west': 5,
      'eu-west': 8,
      'asia-pacific': 15,
      default: 10,
    } as Record<string, number>,
  },

  // Performance benchmarks
  performance: {
    baseResponseTime: 20, // Base application response time in ms
    coldStart: {
      javascript: 100,
      typescript: 100,
      python: 200,
      go: 50,
      rust: 30,
      default: 100,
    } as Record<string, number>,
  },

  // Cost calculation defaults
  cost: {
    // Monthly time calculations
    monthlySeconds: 30 * 24 * 60 * 60,
    monthlyHours: 30 * 24,

    // Cache hit ratios
    defaultCacheHitRatio: 0.7,

    // Regional multipliers for pricing
    regionalMultipliers: {
      'us-east': 1.0,
      'us-west': 1.0,
      'eu-west': 1.1,
      'eu-central': 1.05,
      'asia-pacific': 1.15,
      global: 1.0,
    } as Record<string, number>,

    // Default pricing fallbacks (when platform pricing not available)
    fallbackPricing: {
      hosting: {
        free: 0,
        starter: 7,
        basic: 25,
        pro: 50,
        enterprise: 200,
      },
      database: {
        baseStorageCostPerGB: 0.15,
        baseComputeCostPerHour: 0.16,
        minimumCost: 15,
      },
      cache: {
        baseRequestCostPerMillion: 5,
        minimumCost: 10,
        maximumCost: 200,
      },
    },
  },

  // Load degradation factors
  loadDegradation: {
    thresholds: [
      { users: 100, factor: 0.95 },
      { users: 500, factor: 0.9 },
      { users: 1000, factor: 0.8 },
      { users: 5000, factor: 0.7 },
    ],
    minimumFactor: 0.5,
    scalingDivisor: 50000,
  },

  // Scaling limits by platform
  platformScaling: {
    vercel: 10000,
    netlify: 5000,
    render: 15000,
    railway: 8000,
    flyio: 25000,
    default: 10000,
  } as Record<string, number>,

  // Validation thresholds
  validation: {
    aggressiveResponseTime: 10, // ms - warn if target is below this
    overEngineeredThroughputMultiplier: 10, // warn if target exceeds load by this factor
    highMemoryUsage: 4000, // MB - warn if memory usage exceeds
    budgetWarningThreshold: 80, // % - warn when budget usage exceeds
    criticalBudgetThreshold: 100, // % - critical when over budget
  },
};

export const TEST_DEFAULTS = {
  // Test runner configuration
  maxTestDuration: 30000, // 30 seconds max per test
  defaultPattern: 'test/*.test.yaml',

  // Memory management
  cleanupThreshold: 100, // MB - cleanup if memory usage exceeds
  reuseSimulator: false, // Whether to reuse simulator instance across tests

  // Reporting
  verboseErrors: true,
  showStackTrace: false,
  maxErrorsToShow: 10,
};
