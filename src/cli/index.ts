#!/usr/bin/env node

import { Command } from 'commander';
import { getDefaultCostEngine, getRegistry, getDataLoader, VERSION } from '../index';
import { createOverrideManager } from '../data/storage/override-manager';
import { RecommendationSystem } from '../intelligence/recommendation-system';
import { PricingCollector } from '../data/collection/pricing-collector';
import { DataStorage } from '../data/storage/data-storage';
import type { Usage, Requirements } from '../providers/base/provider.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

const program = new Command();

program
  .name('architecture-simulator')
  .description('Cloud architecture cost simulator with plugin-based provider system')
  .version(VERSION);

// Simulate command
program
  .command('simulate')
  .description('Simulate costs for a provider')
  .option('-p, --provider <provider>', 'Provider name')
  .option('-c, --config <file>', 'Configuration file (YAML or JSON)')
  .option('-u, --usage <json>', 'Usage data as JSON string')
  .option('-o, --output <format>', 'Output format (json|table)', 'table')
  .action(async (options) => {
    try {
      const engine = getDefaultCostEngine();
      const registry = getRegistry();
      
      // Initialize registry
      await registry.initialize();
      
      let usage: Usage;
      
      if (options.config) {
        const configPath = path.resolve(options.config);
        const content = await fs.readFile(configPath, 'utf-8');
        const ext = path.extname(configPath).toLowerCase();
        
        if (ext === '.yaml' || ext === '.yml') {
          usage = yaml.load(content) as Usage;
        } else {
          usage = JSON.parse(content);
        }
      } else if (options.usage) {
        usage = JSON.parse(options.usage);
      } else {
        // Default usage
        usage = {
          bandwidth: 100,
          storage: 50,
          compute: 720,
          requests: 1000000,
          users: 1000,
          period: 'monthly'
        };
      }
      
      if (options.provider) {
        const estimate = await engine.calculateCost(options.provider, usage);
        
        if (options.output === 'json') {
          console.log(JSON.stringify(estimate, null, 2));
        } else {
          console.log(`\n📊 Cost Estimate for ${estimate.provider}`);
          console.log('─'.repeat(40));
          console.log(`Monthly: $${estimate.monthly.toFixed(2)}`);
          console.log(`Yearly: $${estimate.yearly.toFixed(2)}`);
          console.log(`\nBreakdown:`);
          Object.entries(estimate.breakdown.serviceCosts).forEach(([service, cost]) => {
            console.log(`  ${service}: $${cost.toFixed(2)}`);
          });
          console.log(`\nTotal: $${estimate.breakdown.totalCost.toFixed(2)}`);
          if (estimate.assumptions && estimate.assumptions.length > 0) {
            console.log(`\nAssumptions:`);
            estimate.assumptions.forEach(a => console.log(`  • ${a}`));
          }
        }
      } else {
        const comparison = await engine.compareProviders(usage);
        
        if (options.output === 'json') {
          console.log(JSON.stringify(comparison, null, 2));
        } else {
          console.log(`\n📊 Provider Comparison`);
          console.log('─'.repeat(60));
          console.log(`Provider\t\tMonthly\t\tYearly`);
          console.log('─'.repeat(60));
          comparison.estimates.forEach(e => {
            console.log(`${e.provider}\t\t$${e.monthly.toFixed(2)}\t\t$${e.yearly.toFixed(2)}`);
          });
          console.log('─'.repeat(60));
          console.log(`\n✅ Cheapest: ${comparison.cheapest.provider} ($${comparison.cheapest.monthly.toFixed(2)}/mo)`);
          console.log(`❌ Most Expensive: ${comparison.mostExpensive.provider} ($${comparison.mostExpensive.monthly.toFixed(2)}/mo)`);
          
          if (comparison.recommendations.length > 0) {
            console.log(`\n💡 Recommendations:`);
            comparison.recommendations.forEach(r => console.log(`  • ${r}`));
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

// Optimize command
program
  .command('optimize')
  .description('Find optimal provider based on requirements')
  .option('-r, --requirements <file>', 'Requirements file (YAML or JSON)')
  .option('-b, --budget <amount>', 'Budget constraint')
  .option('-t, --traffic <gb>', 'Expected traffic in GB')
  .option('-s, --storage <gb>', 'Storage requirements in GB')
  .action(async (options) => {
    try {
      const engine = getDefaultCostEngine();
      const registry = getRegistry();
      
      await registry.initialize();
      
      let requirements: Requirements = {};
      
      if (options.requirements) {
        const configPath = path.resolve(options.requirements);
        const content = await fs.readFile(configPath, 'utf-8');
        const ext = path.extname(configPath).toLowerCase();
        
        if (ext === '.yaml' || ext === '.yml') {
          requirements = yaml.load(content) as Requirements;
        } else {
          requirements = JSON.parse(content);
        }
      }
      
      if (options.budget) requirements.budget = parseFloat(options.budget);
      if (options.traffic) requirements.traffic = parseFloat(options.traffic);
      if (options.storage) requirements.storage = parseFloat(options.storage);
      
      const optimal = await engine.findOptimalProvider(requirements);
      
      if (optimal) {
        console.log(`\n🎯 Optimal Provider: ${optimal.provider}`);
        console.log('─'.repeat(40));
        console.log(`Monthly Cost: $${optimal.monthly.toFixed(2)}`);
        console.log(`Yearly Cost: $${optimal.yearly.toFixed(2)}`);
        console.log(`Confidence: ${optimal.confidence}%`);
      } else {
        console.log('❌ No provider found matching the requirements');
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

// Provider management commands
const provider = program.command('provider').description('Provider management commands');

provider
  .command('list')
  .description('List all available providers')
  .action(async () => {
    try {
      const registry = getRegistry();
      await registry.initialize();
      
      const providers = registry.listProviders();
      
      if (providers.length === 0) {
        console.log('No providers registered');
        return;
      }
      
      console.log(`\n📦 Available Providers (${providers.length}):`);
      console.log('─'.repeat(60));
      
      providers.forEach(p => {
        console.log(`\n${p.name} (v${p.version})`);
        console.log(`  Services: ${p.services.join(', ')}`);
        if (p.metadata) {
          console.log(`  Website: ${p.metadata.website}`);
          console.log(`  Regions: ${p.metadata.regions?.join(', ') || 'N/A'}`);
        }
      });
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

provider
  .command('info <name>')
  .description('Show detailed information about a provider')
  .action(async (name) => {
    try {
      const registry = getRegistry();
      await registry.initialize();
      
      const provider = registry.getProvider(name);
      const info = registry.listProviders().find(p => p.name === name);
      
      console.log(`\n📦 Provider: ${provider.name}`);
      console.log('─'.repeat(40));
      console.log(`Version: ${provider.version}`);
      console.log(`Services: ${info?.services.join(', ')}`);
      
      if (provider.metadata) {
        console.log(`\nMetadata:`);
        console.log(`  Website: ${provider.metadata.website}`);
        console.log(`  Pricing URL: ${provider.metadata.pricingUrl}`);
        console.log(`  Regions: ${provider.metadata.regions?.join(', ')}`);
        console.log(`  Frameworks: ${provider.metadata.supportedFrameworks?.join(', ') || 'N/A'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

// Override management commands
const override = program.command('override').description('Pricing override management');

override
  .command('set <path> <value>')
  .description('Set a pricing override')
  .option('-r, --reason <reason>', 'Reason for override')
  .option('-p, --provider <provider>', 'Provider name')
  .action(async (path, value, options) => {
    try {
      const dataLoader = getDataLoader();
      const manager = createOverrideManager(dataLoader);
      
      const numValue = parseFloat(value);
      await manager.setPriceOverride(
        options.provider ? `${options.provider}.${path}` : path,
        numValue,
        options.reason
      );
      
      console.log('✅ Override set successfully');
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

override
  .command('list')
  .description('List all overrides')
  .option('-p, --provider <provider>', 'Filter by provider')
  .action(async (options) => {
    try {
      const dataLoader = getDataLoader();
      const manager = createOverrideManager(dataLoader);
      
      const overrides = await manager.listOverrides();
      
      if (overrides.length === 0) {
        console.log('No overrides configured');
        return;
      }
      
      console.log(`\n⚙️  Active Overrides (${overrides.length}):`);
      console.log('─'.repeat(60));
      
      overrides.forEach(o => {
        if (!options.provider || o.path.startsWith(options.provider)) {
          console.log(`\n${o.path} = ${JSON.stringify(o.value)}`);
          if (o.reason) console.log(`  Reason: ${o.reason}`);
          console.log(`  Applied: ${o.appliedAt}`);
        }
      });
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

override
  .command('remove <path>')
  .description('Remove an override')
  .action(async (path) => {
    try {
      const dataLoader = getDataLoader();
      const manager = createOverrideManager(dataLoader);
      
      const result = await manager.removeOverride(path);
      
      if (result) {
        console.log('✅ Override removed successfully');
      } else {
        console.log('❌ Override not found');
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });


// Forecast command
program
  .command('forecast')
  .description('Forecast future costs based on growth')
  .option('-p, --provider <provider>', 'Provider name', 'vercel')
  .option('-g, --growth <rate>', 'Monthly growth rate (%)', '10')
  .option('-m, --months <months>', 'Number of months to forecast', '12')
  .option('-u, --usage <json>', 'Current usage as JSON')
  .action(async (options) => {
    try {
      const engine = getDefaultCostEngine();
      const registry = getRegistry();
      
      await registry.initialize();
      
      const usage: Usage = options.usage ? JSON.parse(options.usage) : {
        bandwidth: 100,
        storage: 50,
        compute: 720,
        requests: 1000000,
        users: 1000,
        period: 'monthly'
      };
      
      const forecasts = await engine.forecastCosts(
        options.provider,
        usage,
        parseFloat(options.growth),
        parseInt(options.months)
      );
      
      console.log(`\n📈 Cost Forecast for ${options.provider}`);
      console.log(`Growth Rate: ${options.growth}% per month`);
      console.log('─'.repeat(40));
      console.log('Month\t\tMonthly Cost\tYearly Cost');
      console.log('─'.repeat(40));
      
      forecasts.forEach((f, i) => {
        console.log(`${i}\t\t$${f.monthly.toFixed(2)}\t\t$${f.yearly.toFixed(2)}`);
      });
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

// Collection commands
const collect = program.command('collect').description('Pricing data collection');

collect
  .command('provider <name>')
  .description('Collect pricing data for a specific provider')
  .option('-f, --file <path>', 'Update from JSON file instead of web')
  .action(async (name, options) => {
    try {
      const collector = new PricingCollector({
        providers: {
          [name]: { url: `https://${name}.com/pricing` }
        },
        validation: {
          requiredFields: ['provider', 'currency', 'tiers', 'services']
        }
      });
      
      let result;
      if (options.file) {
        result = await collector.updateFromFile(name, options.file);
      } else {
        result = await collector.collectProvider(name);
      }
      
      if (result.success) {
        console.log(`✅ Collection successful for ${name}`);
        if (result.hasChanges) {
          console.log('   Changes detected and saved');
        } else {
          console.log('   No changes detected');
        }
      } else {
        console.log(`❌ Collection failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

collect
  .command('all')
  .description('Collect pricing data for all providers')
  .action(async () => {
    try {
      const registry = getRegistry();
      await registry.initialize();
      const providers = registry.getAllProviders();
      
      const collector = new PricingCollector({
        providers: Object.fromEntries(
          providers.map(p => [p.name, { url: p.metadata.pricingUrl || '' }])
        ),
        validation: {
          requiredFields: ['provider', 'currency']
        }
      });
      
      console.log('🔄 Collecting pricing data for all providers...\n');
      const results = await collector.collectAll();
      
      let successCount = 0;
      let changeCount = 0;
      
      for (const result of results) {
        if (result.success) {
          successCount++;
          if (result.hasChanges) changeCount++;
          console.log(`✅ ${result.provider}: ${result.hasChanges ? 'Updated' : 'No changes'}`);
        } else {
          console.log(`❌ ${result.provider}: ${result.error}`);
        }
      }
      
      console.log(`\n📊 Summary: ${successCount}/${results.length} successful, ${changeCount} with changes`);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

collect
  .command('validate')
  .description('Validate all pricing data')
  .action(async () => {
    try {
      const registry = getRegistry();
      await registry.initialize();
      const providers = registry.getAllProviders();
      
      const collector = new PricingCollector({
        providers: Object.fromEntries(
          providers.map(p => [p.name, { url: '' }])
        ),
        validation: {
          requiredFields: ['provider', 'currency', 'lastUpdated']
        }
      });
      
      const results = await collector.validateAll();
      
      console.log('🔍 Validation Results:\n');
      for (const [provider, isValid] of results) {
        console.log(`${isValid ? '✅' : '❌'} ${provider}`);
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

collect
  .command('history <provider>')
  .description('View collection history for a provider')
  .option('-n, --count <n>', 'Number of snapshots to show', '5')
  .action(async (provider, options) => {
    try {
      const storage = new DataStorage();
      const snapshots = await storage.getSnapshots(provider);
      const count = parseInt(options.count);
      
      console.log(`\n📜 History for ${provider}:\n`);
      
      if (snapshots.length === 0) {
        console.log('No snapshots found');
      } else {
        snapshots.slice(0, count).forEach((snapshot, i) => {
          const date = new Date(snapshot.timestamp);
          console.log(`${i + 1}. ${date.toLocaleString()}`);
          if (snapshot.reason) {
            console.log(`   Reason: ${snapshot.reason}`);
          }
        });
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

// Recommendation commands
program
  .command('recommend <description>')
  .description('Get architecture recommendations based on requirements')
  .option('-o, --optimize', 'Include optimization suggestions')
  .option('-c, --compare', 'Compare all providers')
  .option('-b, --budget <amount>', 'Monthly budget constraint in USD')
  .option('--ai-provider <provider>', 'AI provider to use (local|openai|anthropic)', 'local')
  .action(async (description, options) => {
    try {
      const registry = getRegistry();
      await registry.initialize();
      
      // AI configuration is now handled internally by RecommendationSystem
      const recommender = new RecommendationSystem(registry);
      
      console.log('\n🔍 Analyzing requirements...\n');
      
      const result = await recommender.getRecommendation({ input: description });
      console.log(result);
      
      if (options.compare) {
        console.log('\n📊 Provider Comparison:\n');
        const response = await recommender.getRecommendation({
          input: description,
          compareProviders: true,
          budget: options.budget ? parseFloat(options.budget) : undefined
        });
        
        if (response.comparison) {
          response.comparison.forEach(comp => {
            console.log(`${comp.provider}: $${comp.monthlyC}/mo`);
            console.log(`  Pros: ${comp.pros.join(', ')}`);
            console.log(`  Cons: ${comp.cons.join(', ')}\n`);
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

// Parse and execute
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

export { program as cli };