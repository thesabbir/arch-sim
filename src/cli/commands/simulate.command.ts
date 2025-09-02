import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { getDefaultCostEngine, getRegistry } from '../../index';
import { handleError, wrapAsync } from '../../core/error-handler';
import type { Usage } from '../../providers/base/provider.interface';

export function createSimulateCommand(): Command {
  const command = new Command('simulate');
  
  command
    .description('Simulate costs for a provider')
    .option('-p, --provider <provider>', 'Provider name')
    .option('-c, --config <file>', 'Configuration file (YAML or JSON)')
    .option('-u, --usage <json>', 'Usage data as JSON string')
    .option('-o, --output <format>', 'Output format (json|table)', 'table')
    .action(async (options) => {
      await wrapAsync(async () => {
        const engine = getDefaultCostEngine();
        const registry = getRegistry();
        
        // Initialize registry
        await registry.initialize();
        
        let usage: Usage = await loadUsage(options);
        
        if (options.provider) {
          await simulateSingleProvider(options.provider, usage, options.output);
        } else {
          await compareAllProviders(usage, options.output);
        }
      }, {
        retries: 1,
        retryDelay: 2000
      });
    });
  
  return command;
}

async function loadUsage(options: any): Promise<Usage> {
  if (options.config) {
    const configPath = path.resolve(options.config);
    const content = await fs.readFile(configPath, 'utf-8');
    const ext = path.extname(configPath).toLowerCase();
    
    if (ext === '.yaml' || ext === '.yml') {
      return yaml.load(content) as Usage;
    } else {
      return JSON.parse(content);
    }
  } else if (options.usage) {
    return JSON.parse(options.usage);
  } else {
    // Default usage
    return {
      bandwidth: 100,
      storage: 50,
      compute: 720,
      requests: 1000000,
      users: 1000,
      period: 'monthly'
    };
  }
}

async function simulateSingleProvider(provider: string, usage: Usage, format: string): Promise<void> {
  const engine = getDefaultCostEngine();
  const estimate = await engine.calculateCost(provider, usage);
  
  if (format === 'json') {
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
    
    if (estimate.confidence) {
      console.log(`\nConfidence: ${(estimate.confidence * 100).toFixed(0)}%`);
    }
  }
}

async function compareAllProviders(usage: Usage, format: string): Promise<void> {
  const engine = getDefaultCostEngine();
  const comparison = await engine.compareProviders(usage);
  
  if (format === 'json') {
    console.log(JSON.stringify(comparison, null, 2));
  } else {
    console.log(`\n📊 Provider Comparison`);
    console.log('─'.repeat(60));
    console.log(`Provider\t\tMonthly\t\tYearly`);
    console.log('─'.repeat(60));
    
    comparison.estimates.forEach(e => {
      const providerName = e.provider.padEnd(16);
      console.log(`${providerName}$${e.monthly.toFixed(2)}\t\t$${e.yearly.toFixed(2)}`);
    });
    
    console.log('─'.repeat(60));
    console.log(`\n✅ Cheapest: ${comparison.cheapest.provider} ($${comparison.cheapest.monthly.toFixed(2)}/mo)`);
    console.log(`❌ Most Expensive: ${comparison.mostExpensive.provider} ($${comparison.mostExpensive.monthly.toFixed(2)}/mo)`);
    
    const savings = comparison.mostExpensive.monthly - comparison.cheapest.monthly;
    const savingsPercent = (savings / comparison.mostExpensive.monthly) * 100;
    console.log(`💰 Potential Savings: $${savings.toFixed(2)}/mo (${savingsPercent.toFixed(0)}%)`);
    
    if (comparison.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      comparison.recommendations.forEach(r => console.log(`  • ${r}`));
    }
  }
}