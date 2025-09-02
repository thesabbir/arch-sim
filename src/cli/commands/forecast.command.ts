import { Command } from 'commander';
import { getDefaultCostEngine, getRegistry } from '../../index';
import { handleError, wrapAsync } from '../../core/error-handler';
import type { Usage } from '../../providers/base/provider.interface';

export function createForecastCommand(): Command {
  const command = new Command('forecast');
  
  command
    .description('Forecast future costs based on growth')
    .option('-p, --provider <provider>', 'Provider name', 'vercel')
    .option('-g, --growth <rate>', 'Monthly growth rate (%)', '10')
    .option('-m, --months <months>', 'Number of months to forecast', '12')
    .option('-u, --usage <json>', 'Current usage as JSON')
    .option('-o, --output <format>', 'Output format (json|table|chart)', 'table')
    .action(async (options) => {
      await wrapAsync(async () => {
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
        
        const growthRate = parseFloat(options.growth);
        const months = parseInt(options.months);
        
        if (isNaN(growthRate)) {
          throw new Error(`Invalid growth rate: ${options.growth}`);
        }
        
        if (isNaN(months) || months < 1 || months > 60) {
          throw new Error(`Invalid number of months: ${options.months} (must be 1-60)`);
        }
        
        const forecasts = await engine.forecastCosts(
          options.provider,
          usage,
          growthRate,
          months
        );
        
        displayForecast(forecasts, options.provider, growthRate, options.output);
      });
    });
  
  return command;
}

function displayForecast(
  forecasts: any[], 
  provider: string, 
  growthRate: number,
  format: string
): void {
  if (format === 'json') {
    console.log(JSON.stringify(forecasts, null, 2));
    return;
  }
  
  console.log(`\n📈 Cost Forecast for ${provider}`);
  console.log(`Growth Rate: ${growthRate}% per month`);
  console.log('─'.repeat(60));
  
  if (format === 'chart') {
    displayChart(forecasts);
  } else {
    displayTable(forecasts);
  }
  
  // Summary statistics
  const first = forecasts[0];
  const last = forecasts[forecasts.length - 1];
  const totalGrowth = ((last.monthly - first.monthly) / first.monthly) * 100;
  const totalCost = forecasts.reduce((sum, f) => sum + f.monthly, 0);
  
  console.log('─'.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`  Starting Cost: $${first.monthly.toFixed(2)}/mo`);
  console.log(`  Final Cost: $${last.monthly.toFixed(2)}/mo`);
  console.log(`  Total Growth: ${totalGrowth.toFixed(1)}%`);
  console.log(`  Total Spend: $${totalCost.toFixed(2)}`);
  console.log(`  Average Monthly: $${(totalCost / forecasts.length).toFixed(2)}`);
  
  // Warnings
  if (last.monthly > 1000) {
    console.log('\n⚠️  Warning: Costs exceed $1000/month by end of forecast');
  }
  if (totalGrowth > 200) {
    console.log('\n⚠️  Warning: Costs more than triple during forecast period');
  }
}

function displayTable(forecasts: any[]): void {
  console.log('Month\t\tMonthly Cost\tYearly Cost\tCumulative');
  console.log('─'.repeat(60));
  
  let cumulative = 0;
  forecasts.forEach((f, i) => {
    cumulative += f.monthly;
    const month = `Month ${i + 1}`.padEnd(16);
    const monthly = `$${f.monthly.toFixed(2)}`.padEnd(16);
    const yearly = `$${f.yearly.toFixed(2)}`.padEnd(16);
    const cum = `$${cumulative.toFixed(2)}`;
    console.log(`${month}${monthly}${yearly}${cum}`);
  });
}

function displayChart(forecasts: any[]): void {
  const maxCost = Math.max(...forecasts.map(f => f.monthly));
  const scale = 40 / maxCost;
  
  console.log('\nMonthly Cost Trend:');
  console.log('─'.repeat(60));
  
  forecasts.forEach((f, i) => {
    const barLength = Math.round(f.monthly * scale);
    const bar = '█'.repeat(barLength);
    const month = `M${(i + 1).toString().padStart(2, '0')}`;
    const cost = `$${f.monthly.toFixed(0)}`.padEnd(8);
    console.log(`${month} ${cost}${bar}`);
  });
}