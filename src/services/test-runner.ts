#!/usr/bin/env node

import { glob } from 'glob';
import chalk from 'chalk';
import fs from 'fs/promises';
import * as yaml from 'js-yaml';
import path from 'path';
import { performance } from 'perf_hooks';
import { ArchitectureSimulator } from '../core/simulator.js';

interface TestResult {
  name: string;
  path: string;
  status: string;
  duration: number;
  assertions: any[];
  errors: string[];
  warnings: string[];
}

// TestConfig interface removed as it's not used

interface TestStats {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  totalTime: number;
}

export class TestRunner {
  public results: TestResult[] = [];
  public stats: TestStats;

  constructor(_options: any = {}) {
    this.results = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      skipped: 0,
      totalTime: 0,
    };
  }

  async loadTestConfig(testPath: string) {
    try {
      const content = await fs.readFile(testPath, 'utf8');
      const config = yaml.load(content);
      return {
        path: testPath,
        name: (config as any).test?.name || path.basename(testPath),
        architecture: (config as any).architecture,
        expectations: (config as any).expectations || {},
        metadata: (config as any).test || {},
      };
    } catch (error) {
      throw new Error(`Failed to load test config ${testPath}: ${(error as Error).message}`);
    }
  }

  async runTest(testConfig: any, simulator: any) {
    const startTime = performance.now();
    const testResult = {
      name: testConfig.name,
      path: testConfig.path,
      status: 'running',
      duration: 0,
      assertions: [],
      errors: [] as string[],
      warnings: [],
    };

    try {
      // Run simulation
      const simulationResult = await simulator.simulate(testConfig.path);

      if (!simulationResult.success) {
        testResult.status = 'failed';
        testResult.errors.push(simulationResult.error);
        return testResult;
      }

      const { validation, performance, cost, recommendations } = simulationResult.results;

      // Run assertions
      await this.runAssertions(
        testConfig.expectations,
        {
          validation,
          performance,
          cost,
          recommendations,
        },
        testResult,
        simulator
      );

      // Determine final status
      testResult.status = testResult.errors.length > 0 ? 'failed' : 'passed';
      if (testResult.warnings.length > 0 && testResult.status === 'passed') {
        testResult.status = 'warning';
      }
    } catch (error) {
      testResult.status = 'failed';
      testResult.errors.push((error as Error).message);
    }

    testResult.duration = performance.now() - startTime;
    return testResult;
  }

  async runAssertions(expectations: any, results: any, testResult: any, simulator: any) {
    const { validation, performance, cost, recommendations } = results;

    // Validation assertions
    if (expectations.validation) {
      if (expectations.validation.should_be_valid !== undefined) {
        this.assert(
          validation.isValid === expectations.validation.should_be_valid,
          `Validation should be ${expectations.validation.should_be_valid}`,
          `Expected validation to be ${expectations.validation.should_be_valid}, got ${validation.isValid}`,
          testResult
        );
      }

      if (expectations.validation.max_issues !== undefined) {
        this.assert(
          validation.issues.length <= expectations.validation.max_issues,
          `Should have at most ${expectations.validation.max_issues} issues`,
          `Expected max ${expectations.validation.max_issues} issues, got ${validation.issues.length}`,
          testResult
        );
      }

      if (expectations.validation.max_warnings !== undefined) {
        this.assert(
          validation.warnings.length <= expectations.validation.max_warnings,
          `Should have at most ${expectations.validation.max_warnings} warnings`,
          `Expected max ${expectations.validation.max_warnings} warnings, got ${validation.warnings.length}`,
          testResult
        );
      }
    }

    // Performance assertions
    if (expectations.performance && performance.available) {
      const perf = performance.metrics;

      if (expectations.performance.min_rps !== undefined) {
        this.assert(
          perf.estimatedRPS >= expectations.performance.min_rps,
          `Should achieve at least ${expectations.performance.min_rps} RPS`,
          `Expected min ${expectations.performance.min_rps} RPS, got ${perf.estimatedRPS}`,
          testResult
        );
      }

      if (expectations.performance.max_response_time !== undefined) {
        this.assert(
          perf.estimatedResponseTime <= expectations.performance.max_response_time,
          `Response time should be under ${expectations.performance.max_response_time}ms`,
          `Expected max ${expectations.performance.max_response_time}ms, got ${perf.estimatedResponseTime}ms`,
          testResult
        );
      }

      if (expectations.performance.should_meet_targets !== undefined) {
        const meetsTargets = perf.performanceGap >= 0 && perf.responseTimeGap <= 0;
        this.assert(
          meetsTargets === expectations.performance.should_meet_targets,
          `Should ${
            expectations.performance.should_meet_targets ? 'meet' : 'not meet'
          } performance targets`,
          `Expected to ${
            expectations.performance.should_meet_targets ? 'meet' : 'not meet'
          } targets`,
          testResult
        );
      }
    }

    // Cost assertions
    if (expectations.cost && cost) {
      if (expectations.cost.max_monthly_cost !== undefined) {
        this.assert(
          cost.totalCost <= expectations.cost.max_monthly_cost,
          `Monthly cost should be under $${expectations.cost.max_monthly_cost}`,
          `Expected max $${expectations.cost.max_monthly_cost}, got $${cost.totalCost.toFixed(2)}`,
          testResult,
          `$${cost.totalCost.toFixed(2)}`,
          `≤ $${expectations.cost.max_monthly_cost}`
        );
      }

      if (expectations.cost.should_be_within_budget !== undefined) {
        const architecture = await simulator.loadArchitecture(testResult.path);
        const budgetUsage = (cost.totalCost / architecture.budget.monthly_limit) * 100;
        const withinBudget = budgetUsage <= 100;

        this.assert(
          withinBudget === expectations.cost.should_be_within_budget,
          `Should ${expectations.cost.should_be_within_budget ? 'be' : 'not be'} within budget`,
          `Expected ${
            expectations.cost.should_be_within_budget ? 'within' : 'over'
          } budget, usage is ${budgetUsage.toFixed(1)}%`,
          testResult
        );
      }

      if (expectations.cost.max_budget_usage !== undefined) {
        const architecture = await simulator.loadArchitecture(testResult.path);
        const budgetUsage = (cost.totalCost / architecture.budget.monthly_limit) * 100;

        this.assert(
          budgetUsage <= expectations.cost.max_budget_usage,
          `Budget usage should be under ${expectations.cost.max_budget_usage}%`,
          `Expected max ${
            expectations.cost.max_budget_usage
          }% budget usage, got ${budgetUsage.toFixed(1)}%`,
          testResult
        );
      }
    }

    // Recommendations assertions
    if (expectations.recommendations) {
      if (expectations.recommendations.max_critical !== undefined) {
        const criticalCount = recommendations.filter((r: any) => r.priority === 'critical').length;
        this.assert(
          criticalCount <= expectations.recommendations.max_critical,
          `Should have at most ${expectations.recommendations.max_critical} critical recommendations`,
          `Expected max ${expectations.recommendations.max_critical} critical, got ${criticalCount}`,
          testResult
        );
      }

      if (expectations.recommendations.max_high !== undefined) {
        const highCount = recommendations.filter((r: any) => r.priority === 'high').length;
        this.assert(
          highCount <= expectations.recommendations.max_high,
          `Should have at most ${expectations.recommendations.max_high} high priority recommendations`,
          `Expected max ${expectations.recommendations.max_high} high priority, got ${highCount}`,
          testResult
        );
      }

      if (expectations.recommendations.should_include_types !== undefined) {
        const types = new Set(recommendations.map((r: any) => r.type));
        const expectedTypes = expectations.recommendations.should_include_types;

        for (const expectedType of expectedTypes) {
          this.assert(
            types.has(expectedType),
            `Should include ${expectedType} recommendation`,
            `Expected recommendation type '${expectedType}' not found`,
            testResult
          );
        }
      }
    }
  }

  private assert(
    condition: boolean,
    description: string,
    errorMessage: string,
    testResult: TestResult,
    actualValue: any = null,
    expectedValue: any = null
  ): void {
    const assertion = {
      description,
      passed: condition,
      expected: expectedValue,
      actual: actualValue,
    };

    if (condition) {
      testResult.assertions.push(assertion);
    } else {
      (assertion as any).error = errorMessage;
      testResult.assertions.push(assertion);
      testResult.errors.push(errorMessage);
    }
  }

  async runTests(pattern: string, options: any = {}) {
    console.log(chalk.bold.blue('🧪 Architecture Simulator Test Runner\n'));

    // Check if ecosystem path is provided
    if (!options.ecosystem) {
      console.error(chalk.red('Error: Ecosystem file path is required'));
      console.error(chalk.yellow('Use -e or --ecosystem to specify the ecosystem file path'));
      process.exit(1);
    }

    // Find test files
    const testFiles = await glob(pattern, {
      cwd: options.cwd || process.cwd(),
    });

    if (testFiles.length === 0) {
      console.log(chalk.yellow(`No test files found matching pattern: ${pattern}`));
      return;
    }

    console.log(chalk.gray(`Found ${testFiles.length} test file(s)\n`));

    // Create a new simulator instance for this test run
    const simulator = new ArchitectureSimulator();

    // Load ecosystem once
    try {
      await simulator.loadEcosystem(options.ecosystem);
    } catch (error) {
      console.error(chalk.red(`Failed to load ecosystem: ${(error as Error).message}`));
      process.exit(1);
    }

    this.stats.total = testFiles.length;
    const startTime = performance.now();

    // Run tests
    for (const testFile of testFiles) {
      if (options.verbose) {
        console.log(chalk.blue(`Running: ${testFile}`));
      }

      try {
        const testConfig = await this.loadTestConfig(testFile);
        const result = await this.runTest(testConfig, simulator);

        this.results.push(result);
        this.updateStats(result);
        this.printTestResult(result, options);
      } catch (error) {
        const result = {
          name: path.basename(testFile),
          path: testFile,
          status: 'failed',
          duration: 0,
          assertions: [],
          errors: [(error as Error).message],
          warnings: [],
        };

        this.results.push(result);
        this.stats.failed++;
        this.printTestResult(result, options);
      }
    }

    this.stats.totalTime = performance.now() - startTime;
    this.printSummary(options);
  }

  updateStats(result: any) {
    switch (result.status) {
      case 'passed':
        this.stats.passed++;
        break;
      case 'failed':
        this.stats.failed++;
        break;
      case 'warning':
        this.stats.warnings++;
        break;
      default:
        this.stats.skipped++;
    }
  }

  printTestResult(result: any, options: any) {
    const statusIcons: Record<string, string> = {
      passed: chalk.green('✓'),
      failed: chalk.red('✗'),
      warning: chalk.yellow('⚠'),
      skipped: chalk.gray('○'),
    };
    const statusIcon = statusIcons[result.status] || chalk.gray('?');

    const duration = result.duration.toFixed(2);
    console.log(`${statusIcon} ${result.name} ${chalk.gray(`(${duration}ms)`)}`);

    if (options.verbose || result.status === 'failed') {
      if (result.errors.length > 0) {
        result.errors.forEach((error: any) => {
          console.log(`  ${chalk.red('✗')} ${error}`);
        });
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach((warning: any) => {
          console.log(`  ${chalk.yellow('⚠')} ${warning}`);
        });
      }

      if (options.verbose && result.assertions.length > 0) {
        result.assertions.forEach((assertion: any) => {
          const icon = assertion.passed ? chalk.green('✓') : chalk.red('✗');
          console.log(`    ${icon} ${assertion.description}`);

          // Show expected vs actual values for failed assertions
          if (!assertion.passed && assertion.expected !== null && assertion.actual !== null) {
            console.log(`      ${chalk.gray('Expected:')} ${chalk.cyan(assertion.expected)}`);
            console.log(`      ${chalk.gray('Actual:')} ${chalk.yellow(assertion.actual)}`);
          }
        });
      }
    }
  }

  printSummary(options: any) {
    console.log(chalk.bold('\n📊 Test Summary'));
    console.log(chalk.gray('='.repeat(40)));

    console.log(`Total: ${this.stats.total}`);
    console.log(`${chalk.green('Passed:')} ${this.stats.passed}`);
    console.log(`${chalk.red('Failed:')} ${this.stats.failed}`);

    if (this.stats.warnings > 0) {
      console.log(`${chalk.yellow('Warnings:')} ${this.stats.warnings}`);
    }

    if (this.stats.skipped > 0) {
      console.log(`${chalk.gray('Skipped:')} ${this.stats.skipped}`);
    }

    console.log(`${chalk.gray('Duration:')} ${this.stats.totalTime.toFixed(2)}ms`);

    // Success rate
    const successRate = (
      ((this.stats.passed + this.stats.warnings) / this.stats.total) *
      100
    ).toFixed(1);
    console.log(
      `${chalk.gray('Success Rate:')} ${
        parseFloat(successRate) >= 90
          ? chalk.green(`${successRate}%`)
          : parseFloat(successRate) >= 70
            ? chalk.yellow(`${successRate}%`)
            : chalk.red(`${successRate}%`)
      }`
    );

    if (options.json) {
      console.log(
        `\n${JSON.stringify(
          {
            stats: this.stats,
            results: this.results,
          },
          null,
          2
        )}`
      );
    }
  }

  async watch(pattern: string, options: any = {}): Promise<void> {
    console.log(chalk.blue('👀 Watching for changes...\n'));

    // Initial run
    await this.runTests(pattern, options);

    // Watch implementation would go here
    console.log(chalk.gray('\nWatch mode not implemented yet. Run tests manually.'));
  }
}
