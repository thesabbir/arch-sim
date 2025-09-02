import { Command } from 'commander';
import { getRegistry } from '../../index';
import { handleError, wrapAsync } from '../../core/error-handler';

export function createProviderCommand(): Command {
  const command = new Command('provider');
  command.description('Provider information and management');
  
  // List providers subcommand
  command
    .command('list')
    .description('List all available providers')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      await wrapAsync(async () => {
        const registry = getRegistry();
        await registry.initialize();
        
        const providers = registry.listProviders();
        
        if (options.json) {
          console.log(JSON.stringify(providers, null, 2));
        } else {
          console.log('\n📦 Available Providers\n');
          console.log('─'.repeat(60));
          console.log('Name\t\tVersion\t\tServices');
          console.log('─'.repeat(60));
          
          providers.forEach(p => {
            const name = p.name.padEnd(16);
            const version = p.version.padEnd(16);
            console.log(`${name}${version}${p.services.join(', ')}`);
          });
          
          console.log('─'.repeat(60));
          console.log(`\nTotal: ${providers.length} providers`);
        }
      });
    });
  
  // Provider info subcommand
  command
    .command('info <name>')
    .description('Get detailed information about a provider')
    .action(async (name) => {
      await wrapAsync(async () => {
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
          
          if (provider.metadata.description) {
            console.log(`  Description: ${provider.metadata.description}`);
          }
        }
        
        // Show service capabilities
        console.log(`\n📊 Service Capabilities:`);
        
        if (provider.services.hosting) {
          const caps = provider.services.hosting.getCapabilities();
          console.log(`\n  Hosting:`);
          console.log(`    Scalable: ${caps.scalable ? '✅' : '❌'}`);
          console.log(`    Features: ${caps.features?.slice(0, 3).join(', ')}...`);
          if (caps.limits) {
            console.log(`    Limits: ${JSON.stringify(caps.limits).substring(0, 50)}...`);
          }
        }
        
        if (provider.services.database) {
          const caps = provider.services.database.getCapabilities();
          console.log(`\n  Database:`);
          console.log(`    Scalable: ${caps.scalable ? '✅' : '❌'}`);
          console.log(`    Features: ${caps.features?.slice(0, 3).join(', ')}...`);
        }
        
        if (provider.services.storage) {
          const caps = provider.services.storage.getCapabilities();
          console.log(`\n  Storage:`);
          console.log(`    Scalable: ${caps.scalable ? '✅' : '❌'}`);
          console.log(`    Features: ${caps.features?.slice(0, 3).join(', ')}...`);
        }
      });
    });
  
  // Validate provider subcommand
  command
    .command('validate <name>')
    .description('Validate provider configuration')
    .option('-c, --config <json>', 'Configuration to validate')
    .action(async (name, options) => {
      await wrapAsync(async () => {
        const registry = getRegistry();
        await registry.initialize();
        
        const provider = registry.getProvider(name);
        
        if (!provider.validator) {
          console.log(`Provider ${name} does not have a validator`);
          return;
        }
        
        const config = options.config ? JSON.parse(options.config) : {};
        const result = provider.validator.validate(config);
        
        if (result.valid) {
          console.log(`✅ Configuration is valid for ${name}`);
        } else {
          console.log(`❌ Configuration is invalid for ${name}`);
        }
        
        if (result.errors && result.errors.length > 0) {
          console.log('\nErrors:');
          result.errors.forEach(e => console.log(`  • ${e}`));
        }
        
        if (result.warnings && result.warnings.length > 0) {
          console.log('\nWarnings:');
          result.warnings.forEach(w => console.log(`  • ${w}`));
        }
      });
    });
  
  return command;
}