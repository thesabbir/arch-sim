import chalk from 'chalk';
import { Command } from 'commander';
import { EcosystemGenerator } from '../../services/ecosystem-generator.js';
import fs from 'fs/promises';
import path from 'path';
import * as yaml from 'js-yaml';

interface EcosystemOptions {
  output: string;
  format: 'yaml' | 'json';
  update?: boolean;
}

interface ExampleOptions {
  output?: string;
  name?: string;
}

export function generateCommand(program: Command): void {
  const generateCmd = program
    .command('generate')
    .alias('gen')
    .description('Generate ecosystem data or example architectures');

  generateCmd
    .command('ecosystem')
    .description('Generate platform ecosystem data')
    .option('-o, --output <path>', 'output file path', 'data/ecosystem.yaml')
    .option('-f, --format <format>', 'output format (yaml|json)', 'yaml')
    .option('--update', 'update existing ecosystem file')
    .action(async (options: EcosystemOptions) => {
      try {
        console.log(chalk.bold.blue('🔧 Generating Platform Ecosystem...\n'));

        const generator = new EcosystemGenerator();
        const ecosystem = await generator.generate({
          update: options.update,
        });

        // Ensure output directory exists
        const outputDir = path.dirname(options.output);
        await fs.mkdir(outputDir, { recursive: true });

        // Write ecosystem file
        if (options.format === 'json') {
          await fs.writeFile(options.output, JSON.stringify(ecosystem, null, 2));
        } else {
          await fs.writeFile(options.output, yaml.dump(ecosystem));
        }

        console.log(chalk.green(`✓ Ecosystem data generated successfully`));
        console.log(chalk.gray(`  Output: ${options.output}`));
        console.log(chalk.gray(`  Providers: ${Object.keys(ecosystem.providers || {}).length}`));
        console.log(chalk.gray(`  Services: ${Object.keys(ecosystem.services || {}).length}`));
      } catch (error) {
        console.error(chalk.red(`Error: ${(error as Error).message}`));
        process.exit(1);
      }
    });

  generateCmd
    .command('example')
    .description('Generate example architecture configuration')
    .argument('<type>', 'type of architecture (basic|microservices|serverless|enterprise)')
    .option('-o, --output <path>', 'output file path')
    .option('-n, --name <name>', 'architecture name')
    .action(async (type: string, options: ExampleOptions) => {
      try {
        console.log(chalk.bold.blue(`📝 Generating ${type} architecture example...\n`));

        const generator = new EcosystemGenerator();
        const example = await generator.generateExample(type, {
          name: options.name,
        });

        const outputPath = options.output || `architecture-${type}.yaml`;

        await fs.writeFile(outputPath, yaml.dump(example));

        console.log(chalk.green(`✓ Example architecture generated successfully`));
        console.log(chalk.gray(`  Output: ${outputPath}`));
        console.log(chalk.gray(`  Type: ${type}`));
        if (options.name) {
          console.log(chalk.gray(`  Name: ${options.name}`));
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${(error as Error).message}`));
        process.exit(1);
      }
    });
}
