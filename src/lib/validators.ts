import { SIMULATION_DEFAULTS } from './defaults.js';
import type {
  Architecture,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types/index.js';

export class ArchitectureValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];

  private addError(field: string, message: string, code: string = 'VALIDATION_ERROR'): void {
    this.errors.push({
      field,
      message,
      severity: 'error',
      code,
    });
  }

  private addWarning(field: string, message: string, code: string = 'VALIDATION_WARNING'): void {
    this.warnings.push({
      field,
      message,
      severity: 'warning',
      code,
    });
  }

  validate(architecture: Architecture): ValidationResult {
    this.errors = [];
    this.warnings = [];

    // Required fields validation
    this.validateRequiredFields(architecture);

    // Application configuration
    this.validateApplication(architecture.application);

    // Load profile validation
    this.validateLoadProfile(architecture.load_profile);

    // Performance targets validation
    this.validatePerformanceTargets(architecture.performance_targets, architecture.load_profile);

    // Budget validation
    this.validateBudget((architecture as any).budget);

    // Database configuration
    this.validateDatabases(architecture.databases);

    // Hosting configuration
    this.validateHosting(architecture.hosting);

    // Geographic distribution validation
    this.validateGeographicDistribution(
      (architecture.load_profile as any)?.geographic_distribution
    );

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  private validateRequiredFields(architecture: Architecture): void {
    const required = [
      'name',
      'application',
      'databases',
      'hosting',
      'load_profile',
      'performance_targets',
      'budget',
    ];

    for (const field of required) {
      if (!(architecture as any)[field]) {
        this.addError('${field}', `Missing required field: ${field}`, 'MISSING_FIELD');
      }
    }
  }

  private validateApplication(application: any): void {
    if (!application) return;

    if (!application.language) {
      this.addError('application.language', 'Application language is required', 'MISSING_LANGUAGE');
    }

    if (!application.framework) {
      this.addError(
        'application.framework',
        'Application framework is required',
        'MISSING_FRAMEWORK'
      );
    }

    // Validate language is supported
    const supportedLanguages = [
      'javascript',
      'typescript',
      'python',
      'go',
      'rust',
      'java',
      'csharp',
      'php',
      'ruby',
      'elixir',
    ];
    if (application.language && !supportedLanguages.includes(application.language)) {
      this.addError('general', `Unsupported language: ${application.language}`);
    }
  }

  private validateLoadProfile(loadProfile: any): void {
    if (!loadProfile) return;

    // Validate numeric fields
    if (typeof loadProfile.concurrent_users !== 'number' || loadProfile.concurrent_users < 0) {
      this.addError('general', 'Concurrent users must be a positive number');
    }

    if (
      typeof loadProfile.requests_per_second !== 'number' ||
      loadProfile.requests_per_second < 0
    ) {
      this.addError('general', 'Requests per second must be a positive number');
    }

    if (
      loadProfile.peak_multiplier &&
      (typeof loadProfile.peak_multiplier !== 'number' || loadProfile.peak_multiplier < 1)
    ) {
      this.addError('general', 'Peak multiplier must be >= 1');
    }

    // Validate read/write ratio
    if (loadProfile.read_write_ratio) {
      const ratioPattern = /^\d+:\d+$/;
      if (!ratioPattern.test(loadProfile.read_write_ratio)) {
        this.addError('general', 'Read/write ratio must be in format "XX:YY" (e.g., "80:20")');
      } else {
        const [read, write] = loadProfile.read_write_ratio.split(':').map(Number);
        if (read + write !== 100) {
          this.addWarning(
            'general',
            `Read/write ratio should sum to 100 (currently ${read + write})`
          );
        }
      }
    }

    // Validate data size
    if (loadProfile.data_size) {
      const sizePattern = /^\d+(gb|mb|tb)?$/i;
      if (!sizePattern.test(loadProfile.data_size)) {
        this.addError('general', 'Data size must be in format "XXgb", "XXmb", or "XXtb"');
      }
    }
  }

  private validateGeographicDistribution(geoDistribution: any): void {
    if (!geoDistribution || geoDistribution.length === 0) return;

    const validRegions = Object.keys(SIMULATION_DEFAULTS.latency.network);
    const totalPercentage = geoDistribution.reduce((sum: number, region: any) => {
      // Validate region
      if (!validRegions.includes(region.region) && region.region !== 'default') {
        this.addWarning('general', `Unknown region: ${region.region}. Using default latency.`);
      }

      // Validate percentage
      if (
        typeof region.percentage !== 'number' ||
        region.percentage < 0 ||
        region.percentage > 100
      ) {
        this.addError(
          'load_profile.geographic_distribution',
          `Invalid percentage for region ${region.region}: must be between 0 and 100`,
          'INVALID_PERCENTAGE'
        );
      }

      return sum + (region.percentage || 0);
    }, 0);

    // Check if percentages sum to 100
    if (Math.abs(totalPercentage - 100) > 0.01) {
      this.addError(
        'load_profile.geographic_distribution',
        `Geographic distribution percentages must sum to 100% (currently ${totalPercentage.toFixed(1)}%)`,
        'INVALID_DISTRIBUTION_SUM'
      );
    }
  }

  private validatePerformanceTargets(targets: any, loadProfile: any): void {
    if (!targets) return;

    // Validate response time
    if (typeof targets.response_time_p95 !== 'number' || targets.response_time_p95 <= 0) {
      this.addError('general', 'Response time P95 must be a positive number');
    } else if (targets.response_time_p95 < SIMULATION_DEFAULTS.validation.aggressiveResponseTime) {
      this.addWarning(
        'performance_targets.response_time_p95',
        `Response time target of ${targets.response_time_p95}ms is very aggressive and may be unrealistic`,
        'AGGRESSIVE_TARGET'
      );
    }

    // Validate throughput
    if (typeof targets.throughput_rps !== 'number' || targets.throughput_rps <= 0) {
      this.addError('general', 'Throughput RPS must be a positive number');
    } else if (
      loadProfile &&
      targets.throughput_rps >
        loadProfile.requests_per_second *
          SIMULATION_DEFAULTS.validation.overEngineeredThroughputMultiplier
    ) {
      this.addWarning(
        'performance_targets.throughput_rps',
        `Throughput target (${targets.throughput_rps} RPS) is significantly higher than expected load (${loadProfile.requests_per_second} RPS)`,
        'OVERENGINEERED_TARGET'
      );
    }

    // Validate uptime SLA
    if (targets.uptime_sla) {
      if (
        typeof targets.uptime_sla !== 'number' ||
        targets.uptime_sla < 0 ||
        targets.uptime_sla > 100
      ) {
        this.addError('general', 'Uptime SLA must be between 0 and 100');
      } else if (targets.uptime_sla > 99.99) {
        this.addWarning('general', 'Uptime SLA > 99.99% requires enterprise-grade infrastructure');
      }
    }
  }

  private validateBudget(budget: any): void {
    if (!budget) return;

    if (typeof budget.monthly_limit !== 'number' || budget.monthly_limit <= 0) {
      this.addError('general', 'Monthly budget limit must be a positive number');
    }

    if (budget.currency && !['usd', 'eur', 'gbp'].includes(budget.currency.toLowerCase())) {
      this.addWarning('general', `Currency ${budget.currency} may not be fully supported`);
    }

    if (budget.alerts_at) {
      if (typeof budget.alerts_at !== 'number' || budget.alerts_at < 0 || budget.alerts_at > 100) {
        this.addError('general', 'Budget alert threshold must be between 0 and 100');
      }
    }

    if (
      budget.optimization_priority &&
      !['cost', 'performance', 'balanced'].includes(budget.optimization_priority)
    ) {
      this.addWarning('general', `Unknown optimization priority: ${budget.optimization_priority}`);
    }
  }

  private validateDatabases(databases: any): void {
    if (!databases) return;

    if (!databases.primary) {
      this.addError('general', 'Primary database configuration is required');
    } else {
      if (!databases.primary.provider) {
        this.addError('general', 'Database provider is required');
      }
      if (!databases.primary.type) {
        this.addError('general', 'Database type is required');
      }
    }

    // Validate cache configuration if present
    if (databases.cache) {
      if (!databases.cache.provider) {
        this.addError('general', 'Cache provider is required when cache is configured');
      }
    }
  }

  private validateHosting(hosting: any): void {
    if (!hosting) return;

    if (!hosting.backend) {
      this.addError('general', 'Backend hosting configuration is required');
    } else {
      if (!hosting.backend.provider) {
        this.addError('general', 'Backend hosting provider is required');
      }
      if (!hosting.backend.instance_type) {
        this.addError('general', 'Backend instance type is required');
      }
    }

    // Validate frontend hosting if present
    if (hosting.frontend) {
      if (!hosting.frontend.provider) {
        this.addError(
          'general',
          'Frontend hosting provider is required when frontend is configured'
        );
      }
    }
  }
}

export function validateArchitecture(architecture: Architecture): ValidationResult {
  const validator = new ArchitectureValidator();
  return validator.validate(architecture);
}
