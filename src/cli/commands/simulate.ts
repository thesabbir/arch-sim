import chalk from 'chalk';
import { Command } from 'commander';
import { ArchitectureSimulator } from '../../core/simulator.js';

interface SimulateOptions {
  ecosystem: string;
  verbose?: boolean;
  json?: boolean;
  cost: boolean;
  performance: boolean;
}

export function simulateCommand(program: Command): void {
  program
    .command('simulate')
    .alias('sim')
    .description('Run architecture simulation')
    .argument('<config>', 'path to architecture configuration file')
    .option('-e, --ecosystem <path>', 'path to ecosystem data file', 'data/ecosystem.yaml')
    .option('-v, --verbose', 'verbose output')
    .option('-j, --json', 'output results as JSON')
    .option('--no-cost', 'skip cost analysis')
    .option('--no-performance', 'skip performance analysis')
    .action(async (configPath: string, options: SimulateOptions) => {
      try {
        const simulator = new ArchitectureSimulator();

        console.log(chalk.bold.blue('🚀 Starting Architecture Simulation...\n'));

        const results = await simulator.simulate(configPath, {
          ecosystemPath: options.ecosystem,
          verbose: options.verbose,
          skipCost: !options.cost,
          skipPerformance: !options.performance,
        });

        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
        } else {
          console.log(simulator.formatResults(results, { verbose: options.verbose }));
        }

        if (!results.success) {
          process.exit(1);
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${(error as Error).message}`));
        if (options.verbose) {
          console.error((error as Error).stack);
        }
        process.exit(1);
      }
    });
}
