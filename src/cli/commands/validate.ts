import chalk from 'chalk';
import { Command } from 'commander';
import { ArchitectureSimulator } from '../../core/simulator.js';

interface ValidateOptions {
  ecosystem: string;
  strict?: boolean;
  json?: boolean;
}

export function validateCommand(program: Command): void {
  program
    .command('validate')
    .alias('val')
    .description('Validate architecture configuration')
    .argument('<config>', 'path to architecture configuration file')
    .option('-e, --ecosystem <path>', 'path to ecosystem data file', 'data/ecosystem.yaml')
    .option('-s, --strict', 'enable strict validation mode')
    .option('-j, --json', 'output results as JSON')
    .action(async (configPath: string, options: ValidateOptions) => {
      try {
        const simulator = new ArchitectureSimulator();

        await simulator.loadEcosystem(options.ecosystem);
        const architecture = await simulator.loadArchitecture(configPath);
        const validation = simulator.validateArchitecture(architecture, {
          strict: options.strict,
        });

        if (options.json) {
          console.log(JSON.stringify(validation, null, 2));
          if (!validation.isValid) {
            process.exit(1);
          }
          return;
        }

        console.log(chalk.bold.blue('🔍 Architecture Validation\n'));

        if (validation.isValid) {
          console.log(chalk.green('✓ Configuration is valid\n'));
        } else {
          console.log(chalk.red('❌ Configuration has issues:\n'));
          validation.issues.forEach((issue: string) => {
            console.log(chalk.red(`  • ${issue}`));
          });
          console.log();
        }

        if (validation.warnings.length > 0) {
          console.log(chalk.yellow('⚠ Warnings:\n'));
          validation.warnings.forEach((warning: string) => {
            console.log(chalk.yellow(`  • ${warning}`));
          });
          console.log();
        }

        // Show detailed checks
        console.log(chalk.bold('Validation Checks:'));
        validation.checks.forEach((check: any) => {
          const statusIcon =
            check.status === 'pass'
              ? chalk.green('✓')
              : check.status === 'fail'
                ? chalk.red('❌')
                : chalk.yellow('⚠');
          console.log(`  ${statusIcon} ${check.name}: ${chalk.gray(check.message)}`);
        });

        if (!validation.isValid) {
          process.exit(1);
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${(error as Error).message}`));
        process.exit(1);
      }
    });
}
