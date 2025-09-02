import chalk from 'chalk';
import { Command } from 'commander';
import { ArchitectureSimulator } from '../../core/simulator.js';

interface CostOptions {
  ecosystem: string;
  breakdown?: boolean;
  optimize?: boolean;
  json?: boolean;
  currency: string;
}

interface CostOptimization {
  suggestion: string;
  potential_savings: number;
  impact?: string;
}

export function costCommand(program: Command): void {
  program
    .command('cost')
    .description('Analyze architecture costs')
    .argument('<config>', 'path to architecture configuration file')
    .option('-e, --ecosystem <path>', 'path to ecosystem data file', 'data/ecosystem.yaml')
    .option('-b, --breakdown', 'show detailed cost breakdown')
    .option('-o, --optimize', 'show cost optimization suggestions')
    .option('-j, --json', 'output results as JSON')
    .option('--currency <currency>', 'display currency (USD, EUR, GBP)', 'USD')
    .action(async (configPath: string, options: CostOptions) => {
      try {
        const simulator = new ArchitectureSimulator();

        await simulator.loadEcosystem(options.ecosystem);
        const architecture = await simulator.loadArchitecture(configPath);
        const costResult = simulator.costEngine.calculateTotalCost(architecture);

        if (options.json) {
          const output: any = {
            totalCost: costResult.totalCost,
            currency: options.currency,
            breakdown: costResult.breakdown,
            usage: costResult.usage,
          };

          if (options.optimize) {
            output.optimizations = simulator.costEngine.generateCostOptimizations(
              architecture,
              costResult
            );
          }

          console.log(JSON.stringify(output, null, 2));
          return;
        }

        console.log(chalk.bold.blue('💰 Cost Analysis\n'));

        if (options.breakdown) {
          console.log(chalk.bold('Cost Breakdown:'));
          Object.entries(costResult.breakdown).forEach(([service, cost]) => {
            console.log(`  ${service}: ${chalk.green(`$${(cost as number).toFixed(2)}`)}`);
          });
          console.log();
        }

        console.log(
          `${chalk.bold('Total Monthly Cost:')} ${chalk.green(`$${costResult.totalCost.toFixed(2)}`)}`
        );

        if ((architecture as any).budget?.monthly_limit) {
          const budget = (architecture as any).budget;
          const budgetUsage = (costResult.totalCost / budget.monthly_limit) * 100;
          const color =
            budgetUsage > 100 ? chalk.red : budgetUsage > 80 ? chalk.yellow : chalk.green;
          console.log(`${chalk.bold('Budget Usage:')} ${color(`${budgetUsage.toFixed(1)}%`)}`);
          console.log(
            `${chalk.bold('Budget Remaining:')} ${chalk.cyan(`$${(budget.monthly_limit - costResult.totalCost).toFixed(2)}`)}`
          );
        }

        // Show usage metrics
        console.log(`\n${chalk.bold('Usage Metrics:')}`);
        const usage = costResult.usage;
        console.log(`  Monthly Requests: ${chalk.cyan(usage.monthlyRequests.toLocaleString())}`);
        console.log(
          `  Monthly Bandwidth: ${chalk.cyan(`${usage.monthlyBandwidthGB.toFixed(2)} GB`)}`
        );
        console.log(`  Data Storage: ${chalk.cyan(`${usage.dataStorageGB} GB`)}`);
        console.log(`  Concurrent Users: ${chalk.cyan(usage.concurrentUsers.toLocaleString())}`);

        // Show optimizations
        if (options.optimize) {
          const optimizations = simulator.costEngine.generateCostOptimizations(
            architecture,
            costResult
          );
          if (optimizations.length > 0) {
            console.log(`\n${chalk.bold('💡 Cost Optimizations:')}`);
            optimizations.forEach((opt: CostOptimization, index: number) => {
              console.log(`  ${index + 1}. ${opt.suggestion}`);
              console.log(
                `     ${chalk.gray(`Potential savings: $${opt.potential_savings.toFixed(2)}/month`)}`
              );
              if (opt.impact) {
                console.log(`     ${chalk.gray(`Impact: ${opt.impact}`)}`);
              }
            });
          }
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${(error as Error).message}`));
        process.exit(1);
      }
    });
}
