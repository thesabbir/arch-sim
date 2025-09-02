import chalk from 'chalk';
import { Command } from 'commander';
import { TestRunner } from '../../services/test-runner.js';

interface TestOptions {
  ecosystem: string;
  verbose?: boolean;
  json?: boolean;
  watch?: boolean;
  failFast?: boolean;
  timeout: string;
}

export function testCommand(program: Command): void {
  program
    .command('test')
    .description('Run architecture tests')
    .argument('[pattern]', 'test file pattern', 'test/*.test.yaml')
    .option('-e, --ecosystem <path>', 'path to ecosystem data file', 'data/ecosystem.yaml')
    .option('-v, --verbose', 'verbose output')
    .option('-j, --json', 'output results as JSON')
    .option('-w, --watch', 'watch for changes and rerun tests')
    .option('--fail-fast', 'stop on first test failure')
    .option('--timeout <ms>', 'test timeout in milliseconds', '30000')
    .action(async (pattern: string, options: TestOptions) => {
      try {
        const runner = new TestRunner({
          failFast: options.failFast,
          timeout: parseInt(options.timeout),
        });

        if (options.watch) {
          await runner.watch(pattern, options);
        } else {
          await runner.runTests(pattern, options);

          if (runner.stats.failed > 0) {
            process.exit(1);
          }
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${(error as Error).message}`));
        process.exit(1);
      }
    });
}
