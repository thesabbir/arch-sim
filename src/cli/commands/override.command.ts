import { Command } from 'commander';
import { getDataLoader, createOverrideManager } from '../../index';
import { handleError, wrapAsync } from '../../core/error-handler';

export function createOverrideCommand(): Command {
  const command = new Command('override');
  command.description('Pricing override management');
  
  // Set override
  command
    .command('set <path> <value>')
    .description('Set a pricing override')
    .option('-r, --reason <reason>', 'Reason for override')
    .option('-p, --provider <provider>', 'Provider name')
    .action(async (path, value, options) => {
      await wrapAsync(async () => {
        const dataLoader = getDataLoader();
        const manager = createOverrideManager(dataLoader);
        
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          throw new Error(`Invalid numeric value: ${value}`);
        }
        
        const fullPath = options.provider ? `${options.provider}.${path}` : path;
        
        await manager.setPriceOverride(fullPath, numValue, options.reason);
        
        console.log('✅ Override set successfully');
        console.log(`  Path: ${fullPath}`);
        console.log(`  Value: ${numValue}`);
        if (options.reason) {
          console.log(`  Reason: ${options.reason}`);
        }
      });
    });
  
  // List overrides
  command
    .command('list')
    .description('List all overrides')
    .option('-p, --provider <provider>', 'Filter by provider')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      await wrapAsync(async () => {
        const dataLoader = getDataLoader();
        const manager = createOverrideManager(dataLoader);
        
        const overrides = await manager.listOverrides();
        
        if (overrides.length === 0) {
          console.log('No overrides configured');
          return;
        }
        
        const filtered = options.provider 
          ? overrides.filter(o => o.path.startsWith(options.provider))
          : overrides;
        
        if (options.json) {
          console.log(JSON.stringify(filtered, null, 2));
        } else {
          console.log(`\n⚙️  Active Overrides (${filtered.length}):`);
          console.log('─'.repeat(60));
          
          filtered.forEach(o => {
            console.log(`\n${o.path} = ${JSON.stringify(o.value)}`);
            if (o.reason) console.log(`  Reason: ${o.reason}`);
            console.log(`  Applied: ${o.appliedAt}`);
          });
        }
      });
    });
  
  // Remove override
  command
    .command('remove <path>')
    .description('Remove an override')
    .action(async (path) => {
      await wrapAsync(async () => {
        const dataLoader = getDataLoader();
        const manager = createOverrideManager(dataLoader);
        
        const result = await manager.removeOverride(path);
        
        if (result) {
          console.log('✅ Override removed successfully');
          console.log(`  Path: ${path}`);
        } else {
          console.log('❌ Override not found');
          console.log(`  Path: ${path}`);
          console.log('\nRun "override list" to see active overrides');
        }
      });
    });
  
  // Clear all overrides
  command
    .command('clear')
    .description('Clear all overrides')
    .option('-p, --provider <provider>', 'Clear only for specific provider')
    .option('-f, --force', 'Force clear without confirmation')
    .action(async (options) => {
      await wrapAsync(async () => {
        if (!options.force) {
          console.log('⚠️  This will clear all overrides.');
          console.log('Use --force to confirm.');
          return;
        }
        
        const dataLoader = getDataLoader();
        const manager = createOverrideManager(dataLoader);
        
        const overrides = await manager.listOverrides();
        let count = 0;
        
        for (const override of overrides) {
          if (!options.provider || override.path.startsWith(options.provider)) {
            await manager.removeOverride(override.path);
            count++;
          }
        }
        
        console.log(`✅ Cleared ${count} override(s)`);
      });
    });
  
  return command;
}