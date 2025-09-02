import fs from 'fs/promises';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import { performance } from 'perf_hooks';
import { CostEngine } from './cost-engine.js';
import { SIMULATION_DEFAULTS } from '../lib/defaults.js';
import { latencyCalculator } from '../lib/latency-calculator.js';
import { validateArchitecture } from '../lib/validators.js';
import type { Architecture, EcosystemData } from '../types/index.js';

interface SimulationOptions {
  ecosystemPath?: string;
  verbose?: boolean;
  skipCost?: boolean;
  skipPerformance?: boolean;
  strict?: boolean;
}

interface ValidationCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

interface ValidationOutput {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  checks: ValidationCheck[];
}

interface PerformanceMetrics {
  language: string;
  framework: string;
  baseRPS: number;
  frameworkOverhead: number;
  loadFactor: number;
  estimatedRPS: number;
  targetRPS: number;
  performanceGap: number;
  memoryUsageMB: number;
  coldStartTime: number;
  estimatedResponseTime: number;
  targetResponseTime: number;
  responseTimeGap: number;
}

interface Bottleneck {
  type: string;
  severity: string;
  component: string;
  issue: string;
  impact: number;
  solutions: string[];
}

interface ScalabilityAnalysis {
  currentCapacity: number;
  estimatedMaxCapacity: number;
  scaleMultiplier: number;
  scalingStrategy: string;
  constraints: any[];
}

interface PerformanceOutput {
  available: boolean;
  reason?: string;
  metrics?: PerformanceMetrics;
  bottlenecks?: Bottleneck[];
  scalability?: ScalabilityAnalysis;
}

interface Recommendation {
  category: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  issues?: string[];
  solutions?: string[];
  effort: string;
  impact: string;
  currentCost?: number;
  potentialSavings?: number;
}

interface SimulationMetadata {
  simulationTime: number;
  version: string;
  architecture?: {
    name: string;
    stack: string;
    hosting?: string;
    database?: string;
    budget?: any;
  };
  errors?: any[];
  warnings?: string[];
}

interface InternalResults {
  validation: ValidationOutput | null;
  performance: PerformanceOutput | null;
  cost: any | null;
  recommendations: Recommendation[] | null;
  metadata: SimulationMetadata;
}

export class ArchitectureSimulator {
  private ecosystem: EcosystemData | null = null;
  public costEngine: CostEngine;
  private results: InternalResults;

  constructor() {
    this.costEngine = new CostEngine();
    this.results = {
      validation: null,
      performance: null,
      cost: null,
      recommendations: null,
      metadata: {
        simulationTime: 0,
        version: '2.0.0',
      },
    };
  }

  async loadEcosystem(ecosystemPath: string = 'data/ecosystem.yaml'): Promise<boolean> {
    try {
      const ecosystemData = await fs.readFile(ecosystemPath, 'utf8');
      this.ecosystem = yaml.load(ecosystemData) as EcosystemData;
      await this.costEngine.loadPricing(ecosystemPath);
      return true;
    } catch (error) {
      throw new Error(`Failed to load ecosystem: ${(error as Error).message}`);
    }
  }

  async loadArchitecture(configPath: string): Promise<Architecture> {
    try {
      const architectureData = await fs.readFile(configPath, 'utf8');
      const config = yaml.load(architectureData) as any;
      return config.architecture;
    } catch (error) {
      throw new Error(`Failed to load architecture: ${(error as Error).message}`);
    }
  }

  validateArchitecture(
    architecture: Architecture,
    _options?: { strict?: boolean }
  ): ValidationOutput {
    // Use the new validator for comprehensive validation
    const validatorResult = validateArchitecture(architecture);

    const validation: ValidationOutput = {
      isValid: validatorResult.valid,
      issues: validatorResult.errors.map((e) => (typeof e === 'string' ? e : e.message)),
      warnings: validatorResult.warnings.map((w) => (typeof w === 'string' ? w : w.message)),
      checks: [],
    };

    // Language and framework compatibility
    const langFrameworkValid = this.validateLanguageFramework(
      architecture.application!.language,
      architecture.application!.framework
    );
    validation.checks.push({
      name: 'Language-Framework Compatibility',
      status: langFrameworkValid ? 'pass' : 'fail',
      message: langFrameworkValid
        ? `${architecture.application!.framework} is compatible with ${architecture.application!.language}`
        : `${architecture.application!.framework} is not compatible with ${architecture.application!.language}`,
    });

    if (!langFrameworkValid) {
      validation.issues.push(
        `Framework ${architecture.application!.framework} is not compatible with ${architecture.application!.language}`
      );
      validation.isValid = false;
    }

    // Hosting platform compatibility
    const hostingValid = this.validateHostingCompatibility(
      architecture.hosting!.backend!.provider,
      architecture.application!.language
    );
    validation.checks.push({
      name: 'Hosting Platform Compatibility',
      status: hostingValid ? 'pass' : 'fail',
      message: hostingValid
        ? `${architecture.hosting!.backend!.provider} supports ${architecture.application!.language}`
        : `${architecture.hosting!.backend!.provider} does not support ${architecture.application!.language}`,
    });

    if (!hostingValid) {
      validation.issues.push(
        `Hosting provider ${architecture.hosting!.backend!.provider} doesn't support ${architecture.application!.language}`
      );
      validation.isValid = false;
    }

    // Database provider validation
    const dbValid = this.validateDatabaseProvider(architecture.databases!.primary!.provider);
    validation.checks.push({
      name: 'Database Provider',
      status: dbValid ? 'pass' : 'fail',
      message: dbValid
        ? `${architecture.databases!.primary!.provider} is available`
        : `${architecture.databases!.primary!.provider} not found in ecosystem`,
    });

    if (!dbValid) {
      validation.issues.push(
        `Database provider ${architecture.databases!.primary!.provider} not found in ecosystem`
      );
      validation.isValid = false;
    }

    // Performance target feasibility
    const perfFeasible = this.validatePerformanceTargets(architecture);
    if (!perfFeasible.feasible) {
      validation.warnings.push(perfFeasible.warning!);
    }

    validation.checks.push({
      name: 'Performance Targets',
      status: perfFeasible.feasible ? 'pass' : 'warn',
      message: perfFeasible.message,
    });

    return validation;
  }

  private validateLanguageFramework(language: string, framework: string): boolean {
    const frameworks = (this.ecosystem as any).platform_ecosystem.frameworks;
    const compatibleLanguage = language === 'typescript' ? 'javascript' : language;

    for (const category of Object.keys(frameworks)) {
      const frameworkList = frameworks[category];
      const found = frameworkList.find(
        (f: any) =>
          f.id === framework && (f.language === compatibleLanguage || f.language === language)
      );
      if (found) return true;
    }
    return false;
  }

  private validateHostingCompatibility(provider: string, language: string): boolean {
    const hostingPlatforms = (this.ecosystem as any).platform_ecosystem.hosting_platforms;
    const compatibleLanguages =
      language === 'typescript' ? ['javascript', 'typescript'] : [language];

    for (const category of Object.keys(hostingPlatforms)) {
      const platforms = hostingPlatforms[category];
      const found = platforms.find((p: any) => p.id === provider);
      if (found && compatibleLanguages.some((lang) => found.supported_languages.includes(lang))) {
        return true;
      }
    }
    return false;
  }

  private validateDatabaseProvider(provider: string): boolean {
    const databases = (this.ecosystem as any).platform_ecosystem.databases;

    for (const category of Object.keys(databases)) {
      const dbList = databases[category];
      const found = dbList.find((db: any) => db.id === provider);
      if (found) return true;
    }
    return false;
  }

  private validatePerformanceTargets(architecture: Architecture): {
    feasible: boolean;
    warning?: string;
    message: string;
  } {
    const targets = architecture.performance_targets!;
    const loadProfile = architecture.load_profile!;

    // Very aggressive targets check
    if ((targets as any).response_time_p95 < 10) {
      return {
        feasible: false,
        warning: 'Response time target under 10ms may be unrealistic for most applications',
        message: 'Extremely aggressive response time target',
      };
    }

    if ((targets as any).throughput_rps > loadProfile.requests_per_second * 10) {
      return {
        feasible: false,
        warning: 'Throughput target significantly exceeds expected load',
        message: 'Throughput target may be over-engineered',
      };
    }

    return {
      feasible: true,
      message: 'Performance targets appear reasonable',
    };
  }

  private simulatePerformance(architecture: Architecture): PerformanceOutput {
    const performanceBenchmarks = (this.ecosystem as any).performance_benchmarks;
    const languagePerf = performanceBenchmarks.languages[architecture.application!.language];
    const frameworkPerf = performanceBenchmarks.frameworks[architecture.application!.framework];

    if (!languagePerf || !frameworkPerf) {
      return {
        available: false,
        reason: 'Performance benchmarks not available for this stack',
      };
    }

    // Enhanced performance calculation
    const baseRPS = languagePerf.requests_per_second;
    const frameworkOverhead = frameworkPerf.overhead_factor;
    const adjustedRPS = Math.floor(baseRPS / frameworkOverhead);

    // Load degradation factor (more sophisticated)
    const concurrentUsers = (architecture.load_profile as any).concurrent_users;
    const loadFactor = this.calculateLoadDegradation(concurrentUsers);
    const estimatedRPS = Math.floor(adjustedRPS * loadFactor);

    // Memory estimation
    const memoryPerUser = languagePerf.memory_usage_mb * 0.1; // 0.1MB per concurrent user
    const totalMemoryMB = Math.floor(memoryPerUser * concurrentUsers);

    // Response time estimation
    const baseResponseTime = SIMULATION_DEFAULTS.performance.baseResponseTime;
    const dbLatency = this.estimateDatabaseLatency(architecture.databases!.primary!.provider);
    const cacheLatency = architecture.databases!.cache
      ? this.estimateCacheLatency(architecture.databases!.cache.provider)
      : 0;
    const networkLatency = this.estimateNetworkLatency(architecture);

    const estimatedResponseTime = baseResponseTime + dbLatency + cacheLatency + networkLatency;

    // Bottleneck analysis
    const bottlenecks = this.identifyBottlenecks(architecture, {
      estimatedRPS,
      estimatedResponseTime,
      totalMemoryMB,
      targetRPS: architecture.load_profile!.requests_per_second,
      targetResponseTime: (architecture.performance_targets as any).response_time_p95,
    });

    return {
      available: true,
      metrics: {
        language: architecture.application!.language,
        framework: architecture.application!.framework,
        baseRPS,
        frameworkOverhead,
        loadFactor,
        estimatedRPS,
        targetRPS: architecture.load_profile!.requests_per_second,
        performanceGap: estimatedRPS - architecture.load_profile!.requests_per_second,
        memoryUsageMB: totalMemoryMB,
        coldStartTime: languagePerf.cold_start_ms,
        estimatedResponseTime,
        targetResponseTime: (architecture.performance_targets as any).response_time_p95,
        responseTimeGap:
          estimatedResponseTime - (architecture.performance_targets as any).response_time_p95,
      },
      bottlenecks,
      scalability: this.analyzeScalability(architecture, estimatedRPS),
    };
  }

  private calculateLoadDegradation(concurrentUsers: number): number {
    // Sophisticated load degradation curve
    const thresholds = SIMULATION_DEFAULTS.loadDegradation.thresholds;

    for (const threshold of thresholds) {
      if (concurrentUsers <= threshold.users) {
        return threshold.factor;
      }
    }

    const lastThreshold = thresholds[thresholds.length - 1];
    if (!lastThreshold) {
      return SIMULATION_DEFAULTS.loadDegradation.minimumFactor;
    }
    return Math.max(
      SIMULATION_DEFAULTS.loadDegradation.minimumFactor,
      lastThreshold.factor -
        (concurrentUsers - lastThreshold.users) / SIMULATION_DEFAULTS.loadDegradation.scalingDivisor
    );
  }

  private estimateDatabaseLatency(provider: string): number {
    const latencyMap = SIMULATION_DEFAULTS.latency.database as Record<string, number>;
    return latencyMap[provider] ?? latencyMap.default ?? 5;
  }

  private estimateCacheLatency(provider: string): number {
    const latencyMap = SIMULATION_DEFAULTS.latency.cache as Record<string, number>;
    return latencyMap[provider] ?? latencyMap.default ?? 1;
  }

  private estimateNetworkLatency(architecture: Architecture): number {
    const geoDistribution = (architecture.load_profile as any)?.geographic_distribution;
    if (!geoDistribution) return 5;

    // Get service hosting region
    const serviceRegion = (architecture.hosting?.backend as any)?.region || 'us-east';

    // Calculate using the new distance-based latency calculator
    const options = {
      cdn: (architecture.services as any)?.cdn?.provider,
      caching: !!architecture.databases?.cache,
      cacheHitRatio: SIMULATION_DEFAULTS.cost.defaultCacheHitRatio,
      cacheLatency: architecture.databases?.cache
        ? this.estimateCacheLatency(architecture.databases.cache.provider)
        : 0,
    };

    const latencyResult = latencyCalculator.calculateWeightedLatency(
      serviceRegion,
      geoDistribution,
      options
    );

    return Math.floor(latencyResult.weightedLatency);
  }

  private identifyBottlenecks(_architecture: Architecture, metrics: any): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Performance bottlenecks
    if (metrics.performanceGap < 0) {
      bottlenecks.push({
        type: 'performance',
        severity: 'critical',
        component: 'application',
        issue: `Estimated RPS (${metrics.estimatedRPS}) below target (${metrics.targetRPS})`,
        impact: Math.abs(metrics.performanceGap),
        solutions: ['Horizontal scaling', 'Performance optimization', 'Framework upgrade'],
      });
    }

    // Memory bottlenecks
    if (metrics.totalMemoryMB > SIMULATION_DEFAULTS.validation.highMemoryUsage) {
      bottlenecks.push({
        type: 'resource',
        severity: 'high',
        component: 'memory',
        issue: `High memory usage: ${metrics.totalMemoryMB}MB`,
        impact: metrics.totalMemoryMB,
        solutions: ['Memory optimization', 'Instance upgrade', 'Memory profiling'],
      });
    }

    // Response time bottlenecks
    if (metrics.responseTimeGap > 0) {
      bottlenecks.push({
        type: 'latency',
        severity: 'medium',
        component: 'response_time',
        issue: `Response time (${metrics.estimatedResponseTime}ms) exceeds target (${metrics.targetResponseTime}ms)`,
        impact: metrics.responseTimeGap,
        solutions: ['Caching optimization', 'Database indexing', 'CDN implementation'],
      });
    }

    return bottlenecks;
  }

  private analyzeScalability(architecture: Architecture, currentRPS: number): ScalabilityAnalysis {
    const maxScale = this.estimateMaxScale(architecture);
    const scaleRoom = Math.floor(maxScale / currentRPS);

    return {
      currentCapacity: currentRPS,
      estimatedMaxCapacity: maxScale,
      scaleMultiplier: scaleRoom,
      scalingStrategy: this.recommendScalingStrategy(architecture, scaleRoom),
      constraints: this.identifyScalingConstraints(architecture),
    };
  }

  private estimateMaxScale(architecture: Architecture): number {
    // Base scaling on hosting platform and architecture
    const platformScaling = SIMULATION_DEFAULTS.platformScaling;

    const baseMax =
      platformScaling[architecture.hosting!.backend!.provider] || platformScaling.default;

    // Adjust for caching
    const cacheMultiplier = architecture.databases!.cache ? 2.0 : 1.0;

    return Math.floor((baseMax ?? 5000) * cacheMultiplier);
  }

  private recommendScalingStrategy(_architecture: Architecture, scaleRoom: number): string {
    if (scaleRoom > 5) {
      return 'vertical_scaling_sufficient';
    } else if (scaleRoom > 2) {
      return 'horizontal_scaling_recommended';
    } else {
      return 'architectural_refactoring_needed';
    }
  }

  private identifyScalingConstraints(architecture: Architecture): any[] {
    const constraints = [];

    // Database constraints
    if (!architecture.databases!.cache) {
      constraints.push({
        type: 'database',
        constraint: 'No caching layer - database will become bottleneck',
        severity: 'high',
      });
    }

    // Single region constraint
    if ((architecture.load_profile as any).geographic_distribution?.length === 1) {
      constraints.push({
        type: 'geographic',
        constraint: 'Single region deployment limits global scaling',
        severity: 'medium',
      });
    }

    return constraints;
  }

  private generateRecommendations(
    architecture: Architecture,
    validationResult: ValidationOutput,
    performanceResult: PerformanceOutput,
    costResult: any
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Validation-based recommendations
    if (!validationResult.isValid) {
      recommendations.push({
        category: 'critical',
        type: 'validation',
        priority: 'critical',
        title: 'Configuration Issues Detected',
        description: 'Fix validation issues before deployment',
        issues: validationResult.issues,
        effort: 'high',
        impact: 'critical',
      });
    }

    // Performance-based recommendations
    if (performanceResult.available && performanceResult.metrics) {
      const perf = performanceResult.metrics;

      if (perf.performanceGap < 0) {
        recommendations.push({
          category: 'performance',
          type: 'scaling',
          priority: 'high',
          title: 'Performance Target Not Achievable',
          description: `Need ${Math.abs(perf.performanceGap)} additional RPS capacity`,
          solutions:
            performanceResult.scalability!.scalingStrategy === 'horizontal_scaling_recommended'
              ? ['Add load balancer', 'Implement horizontal scaling', 'Optimize database queries']
              : ['Upgrade instance size', 'Optimize application code', 'Implement caching'],
          effort: 'medium',
          impact: 'high',
        });
      }

      // Bottleneck recommendations
      for (const bottleneck of performanceResult.bottlenecks || []) {
        recommendations.push({
          category: 'performance',
          type: 'bottleneck',
          priority: bottleneck.severity as any,
          title: `${bottleneck.component.toUpperCase()} Bottleneck`,
          description: bottleneck.issue,
          solutions: bottleneck.solutions,
          effort: 'medium',
          impact: bottleneck.severity,
        });
      }
    }

    // Cost-based recommendations
    if (costResult && (architecture as any).budget) {
      const budgetUsage = (costResult.totalCost / (architecture as any).budget.monthly_limit) * 100;

      if (budgetUsage > 100) {
        recommendations.push({
          category: 'cost',
          type: 'budget',
          priority: 'critical',
          title: 'Over Budget',
          description: `Monthly cost ($${costResult.totalCost.toFixed(2)}) exceeds budget ($${(architecture as any).budget.monthly_limit})`,
          solutions: [
            'Optimize resource usage',
            'Consider alternative platforms',
            'Implement usage-based scaling',
          ],
          effort: 'medium',
          impact: 'high',
          potentialSavings: costResult.totalCost - (architecture as any).budget.monthly_limit,
        });
      }

      // Cost optimization recommendations
      const optimizations = this.costEngine.generateCostOptimizations(architecture, costResult);
      for (const opt of optimizations) {
        recommendations.push({
          category: 'cost',
          type: 'optimization',
          priority: 'medium',
          title: `${opt.type.toUpperCase()} Cost Optimization`,
          description: opt.suggestion,
          effort: opt.effort,
          impact: 'medium',
          currentCost: opt.current_cost,
          potentialSavings: opt.potential_savings,
        });
      }
    }

    // Architecture recommendations
    const archRecommendations = this.generateArchitecturalRecommendations(architecture);
    recommendations.push(...archRecommendations);

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private generateArchitecturalRecommendations(architecture: Architecture): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Monitoring recommendations
    if (!(architecture.services as any)?.monitoring?.error_tracking) {
      recommendations.push({
        category: 'reliability',
        type: 'monitoring',
        priority: 'high',
        title: 'Add Error Tracking',
        description: 'No error tracking service configured',
        solutions: ['Implement Sentry', 'Add application logging', 'Set up alerting'],
        effort: 'low',
        impact: 'high',
      });
    }

    // Security recommendations
    if (!(architecture.services as any)?.cdn?.features?.includes('ddos_protection')) {
      recommendations.push({
        category: 'security',
        type: 'protection',
        priority: 'medium',
        title: 'Add DDoS Protection',
        description: 'No DDoS protection detected',
        solutions: ['Enable CDN security features', 'Implement rate limiting', 'Add WAF'],
        effort: 'low',
        impact: 'medium',
      });
    }

    // Performance recommendations
    if (
      (architecture.load_profile as any).concurrent_users > 1000 &&
      !architecture.databases!.cache
    ) {
      recommendations.push({
        category: 'performance',
        type: 'caching',
        priority: 'high',
        title: 'Implement Caching Layer',
        description: 'High user load without caching will cause database bottlenecks',
        solutions: [
          'Add Redis cache',
          'Implement application-level caching',
          'Use CDN for static content',
        ],
        effort: 'medium',
        impact: 'high',
      });
    }

    return recommendations;
  }

  async simulate(configPath: string, options: SimulationOptions = {}): Promise<any> {
    const startTime = performance.now();
    const errors: any[] = [];
    const warnings: string[] = [];

    try {
      // Load ecosystem and architecture
      let architecture: Architecture;
      try {
        await this.loadEcosystem(options.ecosystemPath);
        architecture = await this.loadArchitecture(configPath);
      } catch (error) {
        return {
          success: false,
          error: `Failed to load configuration: ${(error as Error).message}`,
          results: null,
        };
      }

      // Run validation
      try {
        this.results.validation = this.validateArchitecture(architecture, {
          strict: options.strict,
        });
      } catch (error) {
        errors.push({ phase: 'validation', message: (error as Error).message });
        this.results.validation = {
          isValid: false,
          issues: [`Validation error: ${(error as Error).message}`],
          warnings: [],
          checks: [],
        };
      }

      // Run performance simulation
      try {
        this.results.performance = this.simulatePerformance(architecture);
      } catch (error) {
        errors.push({ phase: 'performance', message: (error as Error).message });
        warnings.push(`Performance simulation failed: ${(error as Error).message}`);
        this.results.performance = {
          available: false,
          reason: (error as Error).message,
        };
      }

      // Run cost analysis
      try {
        this.results.cost = this.costEngine.calculateTotalCost(architecture);
      } catch (error) {
        errors.push({ phase: 'cost', message: (error as Error).message });
        warnings.push(`Cost calculation failed: ${(error as Error).message}`);
        this.results.cost = null;
      }

      // Generate recommendations
      try {
        this.results.recommendations = this.generateRecommendations(
          architecture,
          this.results.validation!,
          this.results.performance!,
          this.results.cost
        );
      } catch (error) {
        errors.push({ phase: 'recommendations', message: (error as Error).message });
        this.results.recommendations = [];
      }

      // Add metadata
      this.results.metadata.simulationTime = performance.now() - startTime;
      this.results.metadata.architecture = {
        name: architecture.name,
        stack: `${architecture.application!.language} + ${architecture.application!.framework}`,
        hosting: architecture.hosting?.backend?.provider,
        database: architecture.databases?.primary?.provider,
        budget: (architecture as any).budget,
      };
      this.results.metadata.errors = errors;
      this.results.metadata.warnings = warnings;

      return {
        success: errors.filter((e) => e.phase === 'validation' || e.phase === 'cost').length === 0,
        results: this.results,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        results: null,
      };
    }
  }

  formatResults(results: any, _options: any = {}): string {
    if (!results.success) {
      return chalk.red(`❌ Simulation failed: ${results.error}`);
    }

    const { validation, performance, cost, recommendations, metadata } = results.results;
    const lines: string[] = [];

    // Header
    lines.push(chalk.bold.blue(`🏗️  Architecture Simulation Results`));
    lines.push(
      chalk.gray(`Simulated: ${metadata.architecture.name} (${metadata.architecture.stack})`)
    );
    lines.push(chalk.gray(`Completed in: ${metadata.simulationTime.toFixed(2)}ms`));
    lines.push('');

    // Validation Summary
    lines.push(chalk.bold('📋 Validation'));
    lines.push(`Status: ${validation.isValid ? chalk.green('✓ Valid') : chalk.red('❌ Invalid')}`);
    if (validation.issues.length > 0) {
      lines.push(chalk.red(`Issues: ${validation.issues.length}`));
    }
    if (validation.warnings.length > 0) {
      lines.push(chalk.yellow(`Warnings: ${validation.warnings.length}`));
    }
    lines.push('');

    // Performance Summary
    if (performance.available) {
      lines.push(chalk.bold('⚡ Performance'));
      const perf = performance.metrics;
      lines.push(`Estimated RPS: ${chalk.cyan(perf.estimatedRPS)} (target: ${perf.targetRPS})`);
      lines.push(
        `Response Time: ${chalk.cyan(`${perf.estimatedResponseTime}ms`)} (target: ${perf.targetResponseTime}ms)`
      );
      lines.push(
        `Performance Gap: ${perf.performanceGap >= 0 ? chalk.green(`+${perf.performanceGap}`) : chalk.red(perf.performanceGap)} RPS`
      );
      if (performance.bottlenecks.length > 0) {
        lines.push(chalk.red(`Bottlenecks: ${performance.bottlenecks.length} identified`));
      }
      lines.push('');
    }

    // Cost Summary
    if (cost) {
      lines.push(chalk.bold('💰 Cost Analysis'));
      lines.push(`Monthly Cost: ${chalk.green(`$${cost.totalCost.toFixed(2)}`)}`);
      const budgetUsage =
        (cost.totalCost / metadata.architecture.budget?.monthly_limit || 1000) * 100;
      lines.push(
        `Budget Usage: ${
          budgetUsage > 100
            ? chalk.red(`${budgetUsage.toFixed(1)}%`)
            : budgetUsage > 80
              ? chalk.yellow(`${budgetUsage.toFixed(1)}%`)
              : chalk.green(`${budgetUsage.toFixed(1)}%`)
        }`
      );
      lines.push('');
    }

    // Recommendations Summary
    lines.push(chalk.bold('🎯 Recommendations'));
    const criticalCount = recommendations.filter((r: any) => r.priority === 'critical').length;
    const highCount = recommendations.filter((r: any) => r.priority === 'high').length;

    lines.push(`Total: ${recommendations.length} recommendations`);
    if (criticalCount > 0) lines.push(`Critical: ${chalk.red(criticalCount)}`);
    if (highCount > 0) lines.push(`High: ${chalk.yellow(highCount)}`);

    return lines.join('\n');
  }
}

export default ArchitectureSimulator;
