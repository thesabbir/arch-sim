import { Command } from 'commander';
import { RecommendationSystem } from '../../intelligence/recommendation-system';
import { getRegistry } from '../../index';
import { handleError, wrapAsync, AppError, ErrorCode } from '../../core/error-handler';

export function createRecommendCommand(): Command {
  const command = new Command('recommend');
  
  command
    .description('Get AI-powered architecture recommendations')
    .argument('<requirements>', 'Natural language requirements')
    .option('-b, --budget <amount>', 'Monthly budget constraint', parseFloat)
    .option('-o, --optimize', 'Optimize for cost', false)
    .option('-c, --compare', 'Compare providers', false)
    .option('--ai-provider <provider>', 'AI provider to use (openai|anthropic|google|mistral|local)', 'local')
    .action(async (requirements, options) => {
      await wrapAsync(async () => {
        const registry = getRegistry();
        await registry.initialize();
        
        const recommender = new RecommendationSystem(registry);
        
        try {
          const recommendation = await recommender.getRecommendation({
            input: requirements,
            budget: options.budget,
            optimize: options.optimize,
            compareProviders: options.compare
          });
          
          displayRecommendation(recommendation);
        } catch (error) {
          // Check if it's an AI configuration error
          if (error instanceof Error && error.message.includes('AI provider')) {
            throw new AppError(
              ErrorCode.AI_PROVIDER_NOT_CONFIGURED,
              'AI provider not properly configured',
              {
                severity: 'high',
                recoverable: true,
                suggestions: [
                  'Ensure AI API key is set in environment or config',
                  'Check that the AI model is specified in asconfig.yaml',
                  'Try using --ai-provider local for offline recommendations'
                ]
              }
            );
          }
          throw error;
        }
      }, {
        retries: 2,
        retryDelay: 3000
      });
    });
  
  return command;
}

function displayRecommendation(recommendation: any): void {
  console.log('\n🤖 AI Recommendation\n');
  console.log('─'.repeat(60));
  
  console.log(`\n📐 Architecture Type: ${recommendation.architectureType}`);
  
  console.log(`\n💰 Estimated Cost:`);
  console.log(`  Monthly: $${recommendation.estimatedCost.min} - $${recommendation.estimatedCost.max}`);
  console.log(`  Yearly: $${recommendation.estimatedCost.min * 12} - $${recommendation.estimatedCost.max * 12}`);
  
  console.log(`\n🏗️  Recommended Services:`);
  Object.entries(recommendation.services).forEach(([service, provider]) => {
    console.log(`  ${service}: ${provider}`);
  });
  
  console.log(`\n☁️  Primary Providers:`);
  recommendation.providers.forEach((p: string) => console.log(`  • ${p}`));
  
  if (recommendation.reasoning) {
    console.log(`\n💭 Reasoning:`);
    console.log(wrapText(recommendation.reasoning, 60));
  }
  
  if (recommendation.optimizations && recommendation.optimizations.length > 0) {
    console.log(`\n⚡ Optimization Tips:`);
    recommendation.optimizations.forEach((opt: string) => {
      console.log(`  • ${opt}`);
    });
  }
  
  if (recommendation.comparison && recommendation.comparison.length > 0) {
    console.log(`\n📊 Provider Comparison:`);
    console.log('─'.repeat(60));
    console.log('Provider\tMonthly\t\tPros/Cons');
    console.log('─'.repeat(60));
    
    recommendation.comparison.forEach((comp: any) => {
      const recommended = comp.recommended ? '✅' : '  ';
      console.log(`${recommended} ${comp.provider}\t$${comp.monthlyC}`);
      
      if (comp.pros.length > 0) {
        console.log(`   Pros: ${comp.pros.slice(0, 2).join(', ')}`);
      }
      if (comp.cons.length > 0) {
        console.log(`   Cons: ${comp.cons.slice(0, 2).join(', ')}`);
      }
    });
  }
  
  console.log('\n─'.repeat(60));
  console.log('\n💡 Next Steps:');
  console.log('  1. Run "simulate" with recommended providers for detailed costs');
  console.log('  2. Review provider documentation for setup guides');
  console.log('  3. Consider starting with free tiers to test the architecture');
}

function wrapText(text: string, width: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 > width) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.map(line => '  ' + line).join('\n');
}