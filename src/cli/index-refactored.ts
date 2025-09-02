#!/usr/bin/env node

import { Command } from 'commander';
import { VERSION } from '../index';
import { errorHandler } from '../core/error-handler';

// Import commands
import { createSimulateCommand } from './commands/simulate.command';
import { createRecommendCommand } from './commands/recommend.command';
import { createProviderCommand } from './commands/provider.command';
import { createOverrideCommand } from './commands/override.command';
import { createForecastCommand } from './commands/forecast.command';
import { createCollectCommand } from './commands/collect.command';

// Setup global error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  errorHandler.handle(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  errorHandler.handle(reason as Error);
  process.exit(1);
});

// Create main program
const program = new Command();

program
  .name('architecture-simulator')
  .description('Cloud architecture cost simulator with AI-powered recommendations')
  .version(VERSION)
  .option('-v, --verbose', 'Verbose output')
  .option('--debug', 'Debug mode with detailed error information');

// Add commands
program.addCommand(createSimulateCommand());
program.addCommand(createRecommendCommand());
program.addCommand(createProviderCommand());
program.addCommand(createOverrideCommand());
program.addCommand(createForecastCommand());
program.addCommand(createCollectCommand());

// Error statistics command
program
  .command('errors')
  .description('Show error statistics and recent errors')
  .option('--clear', 'Clear error log')
  .action((options) => {
    if (options.clear) {
      errorHandler.clearLog();
      console.log('✅ Error log cleared');
      return;
    }
    
    const stats = errorHandler.getStatistics();
    
    console.log('\n📊 Error Statistics\n');
    console.log('─'.repeat(40));
    console.log(`Total Errors: ${stats.total}`);
    
    if (stats.total > 0) {
      console.log('\nBy Severity:');
      Object.entries(stats.bySeverity).forEach(([severity, count]) => {
        const icon = severity === 'critical' ? '🚨' :
                    severity === 'high' ? '⚠️' :
                    severity === 'medium' ? '⚡' : 'ℹ️';
        console.log(`  ${icon} ${severity}: ${count}`);
      });
      
      console.log('\nBy Error Code:');
      Object.entries(stats.byCode)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .forEach(([code, count]) => {
          console.log(`  [${code}]: ${count} occurrences`);
        });
      
      if (stats.recent.length > 0) {
        console.log('\nRecent Errors:');
        stats.recent.slice(-5).forEach(error => {
          console.log(`  [${error.code}] ${error.message.substring(0, 50)}...`);
          console.log(`    ${error.timestamp}`);
        });
      }
    }
  });

// Health check command
program
  .command('health')
  .description('Check system health and configuration')
  .action(async () => {
    console.log('\n🏥 System Health Check\n');
    console.log('─'.repeat(40));
    
    // Check Node version
    const nodeVersion = process.version;
    const requiredVersion = 'v20.0.0';
    const nodeOk = nodeVersion >= requiredVersion;
    console.log(`Node.js: ${nodeVersion} ${nodeOk ? '✅' : '❌'}`);
    
    // Check registry
    try {
      const { getRegistry } = await import('../index');
      const registry = getRegistry();
      await registry.initialize();
      const providers = registry.listProviderNames();
      console.log(`Providers: ${providers.length} loaded ✅`);
    } catch (error) {
      console.log(`Providers: Failed to load ❌`);
    }
    
    // Check AI configuration
    try {
      const { getConfigLoader } = await import('../index');
      const configLoader = getConfigLoader();
      await configLoader.loadConfig();
      const config = configLoader.getConfig();
      const aiConfigured = config.ai?.model && config.ai?.apiKey;
      console.log(`AI Config: ${aiConfigured ? '✅' : '⚠️ Not configured (using fallback)'}`);
    } catch {
      console.log(`AI Config: ⚠️ Not configured`);
    }
    
    // Check data directory
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const dataDir = path.join(process.cwd(), 'data');
      await fs.access(dataDir);
      console.log(`Data Directory: ${dataDir} ✅`);
    } catch {
      console.log(`Data Directory: Not found ❌`);
    }
    
    console.log('\n─'.repeat(40));
    console.log('Run "provider list" to see available providers');
    console.log('Run "simulate" to test cost calculations');
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

// Export for use as a library
export { program as cli };