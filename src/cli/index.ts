#!/usr/bin/env node

import { Command } from 'commander';
import { simulateCommand } from './commands/simulate.js';
import { validateCommand } from './commands/validate.js';
import { costCommand } from './commands/cost.js';
import { testCommand } from './commands/test.js';
import { generateCommand } from './commands/generate.js';

const program = new Command();

program
  .name('arch-sim')
  .description('Advanced web architecture modeling and simulation tool')
  .version('2.0.0');

// Register commands
simulateCommand(program);
validateCommand(program);
costCommand(program);
testCommand(program);
generateCommand(program);

// Parse command line arguments
program.parse();

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
