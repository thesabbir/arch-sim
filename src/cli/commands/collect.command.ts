import { Command } from 'commander';
import { PricingCollector } from '../../data/collection/pricing-collector';
import { DataStorage } from '../../data/storage/data-storage';
import { getRegistry } from '../../index';
import { handleError, wrapAsync, AppError, ErrorCode } from '../../core/error-handler';

export function createCollectCommand(): Command {
  const command = new Command('collect');
  command.description('Pricing data collection and management');
  
  // Collect single provider
  command
    .command('provider <name>')
    .description('Collect pricing data for a specific provider')
    .option('-f, --file <path>', 'Update from JSON file instead of web')
    .option('-o, --output <path>', 'Output path for collected data')
    .action(async (name, options) => {
      await wrapAsync(async () => {
        const collector = new PricingCollector({
          providers: {
            [name]: { url: `https://${name}.com/pricing` }
          },
          validation: {
            requiredFields: ['provider', 'currency', 'tiers', 'services']
          }
        });
        
        console.log(`🔄 Collecting pricing data for ${name}...`);
        
        let result;
        if (options.file) {
          result = await collector.updateFromFile(name, options.file);
        } else {
          result = await collector.collectProvider(name);
        }
        
        if (result.success) {
          console.log(`✅ Collection successful for ${name}`);
          
          if (result.hasChanges) {
            console.log('   📝 Changes detected and saved');
            
            if (result.changes && result.changes.length > 0) {
              console.log('\n   Changes:');
              result.changes.slice(0, 5).forEach((change: any) => {
                console.log(`     • ${change.field}: ${change.old} → ${change.new}`);
              });
            }
          } else {
            console.log('   ℹ️  No changes detected');
          }
          
          if (options.output && result.data) {
            const fs = await import('fs/promises');
            await fs.writeFile(options.output, JSON.stringify(result.data, null, 2));
            console.log(`   💾 Data saved to ${options.output}`);
          }
        } else {
          throw new AppError(
            ErrorCode.DATA_LOAD_FAILED,
            `Collection failed: ${result.error}`,
            {
              severity: 'high',
              details: { provider: name, error: result.error }
            }
          );
        }
      }, {
        retries: 2,
        retryDelay: 5000
      });
    });
  
  // Collect all providers
  command
    .command('all')
    .description('Collect pricing data for all providers')
    .option('--parallel <n>', 'Number of parallel collections', '3')
    .action(async (options) => {
      await wrapAsync(async () => {
        const registry = getRegistry();
        await registry.initialize();
        
        const providers = registry.listProviderNames();
        const parallelLimit = parseInt(options.parallel) || 3;
        
        console.log(`🔄 Collecting data for ${providers.length} providers...`);
        console.log(`   Parallel limit: ${parallelLimit}`);
        console.log('─'.repeat(40));
        
        const results = {
          success: 0,
          failed: 0,
          unchanged: 0,
          errors: [] as string[]
        };
        
        // Process in batches
        for (let i = 0; i < providers.length; i += parallelLimit) {
          const batch = providers.slice(i, i + parallelLimit);
          const promises = batch.map(async (provider) => {
            try {
              const collector = new PricingCollector({
                providers: {
                  [provider]: { url: `https://${provider}.com/pricing` }
                },
                validation: {
                  requiredFields: ['provider', 'currency']
                }
              });
              
              const result = await collector.collectProvider(provider);
              
              if (result.success) {
                if (result.hasChanges) {
                  results.success++;
                  console.log(`  ✅ ${provider}: Updated`);
                } else {
                  results.unchanged++;
                  console.log(`  ℹ️  ${provider}: No changes`);
                }
              } else {
                results.failed++;
                results.errors.push(`${provider}: ${result.error}`);
                console.log(`  ❌ ${provider}: Failed`);
              }
            } catch (error) {
              results.failed++;
              results.errors.push(`${provider}: ${error}`);
              console.log(`  ❌ ${provider}: Error`);
            }
          });
          
          await Promise.all(promises);
        }
        
        console.log('─'.repeat(40));
        console.log('\n📊 Collection Summary:');
        console.log(`  ✅ Updated: ${results.success}`);
        console.log(`  ℹ️  Unchanged: ${results.unchanged}`);
        console.log(`  ❌ Failed: ${results.failed}`);
        
        if (results.errors.length > 0) {
          console.log('\n❌ Errors:');
          results.errors.forEach(e => console.log(`  • ${e}`));
        }
      });
    });
  
  // Validate collected data
  command
    .command('validate')
    .description('Validate all collected pricing data')
    .action(async () => {
      await wrapAsync(async () => {
        const registry = getRegistry();
        await registry.initialize();
        
        const providers = registry.listProviderNames();
        const storage = new DataStorage();
        
        console.log(`🔍 Validating pricing data for ${providers.length} providers...`);
        console.log('─'.repeat(40));
        
        let validCount = 0;
        let invalidCount = 0;
        const issues: string[] = [];
        
        for (const providerName of providers) {
          const provider = registry.getProvider(providerName);
          
          if (!provider.validator) {
            console.log(`  ⚠️  ${providerName}: No validator`);
            continue;
          }
          
          try {
            const pricingData = await provider.dataLoader.loadProviderData(providerName);
            const result = provider.validator.validatePricing(pricingData);
            
            if (result.valid) {
              validCount++;
              console.log(`  ✅ ${providerName}: Valid`);
            } else {
              invalidCount++;
              console.log(`  ❌ ${providerName}: Invalid`);
              if (result.errors) {
                issues.push(...result.errors.map(e => `${providerName}: ${e}`));
              }
            }
          } catch (error) {
            invalidCount++;
            console.log(`  ❌ ${providerName}: Error loading data`);
            issues.push(`${providerName}: ${error}`);
          }
        }
        
        console.log('─'.repeat(40));
        console.log('\n📊 Validation Summary:');
        console.log(`  ✅ Valid: ${validCount}`);
        console.log(`  ❌ Invalid: ${invalidCount}`);
        
        if (issues.length > 0) {
          console.log('\n❌ Issues Found:');
          issues.slice(0, 10).forEach(i => console.log(`  • ${i}`));
          if (issues.length > 10) {
            console.log(`  ... and ${issues.length - 10} more`);
          }
        }
      });
    });
  
  // Show collection history
  command
    .command('history <provider>')
    .description('Show pricing collection history for a provider')
    .option('-n, --number <n>', 'Number of entries to show', '10')
    .action(async (provider, options) => {
      await wrapAsync(async () => {
        const storage = new DataStorage();
        const history = await storage.getHistory(provider);
        
        if (!history || history.length === 0) {
          console.log(`No collection history for ${provider}`);
          return;
        }
        
        const limit = parseInt(options.number) || 10;
        const entries = history.slice(-limit);
        
        console.log(`\n📜 Collection History for ${provider}`);
        console.log('─'.repeat(40));
        
        entries.forEach((entry: any) => {
          console.log(`\n${entry.timestamp}`);
          console.log(`  Version: ${entry.version}`);
          if (entry.changes) {
            console.log(`  Changes: ${entry.changes.length}`);
          }
          if (entry.source) {
            console.log(`  Source: ${entry.source}`);
          }
        });
      });
    });
  
  return command;
}