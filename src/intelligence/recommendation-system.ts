import { getAIProvider, UnifiedAIProvider } from './unified-ai-provider';
import { ProviderRegistry } from '../core/provider-registry';
import type { Provider } from '../providers/base/provider.interface';

export interface RecommendationRequest {
  input: string;
  budget?: number;
  optimize?: boolean;
  compareProviders?: boolean;
}

export interface RecommendationResponse {
  architectureType: string;
  providers: string[];
  estimatedCost: {
    min: number;
    max: number;
  };
  services: Record<string, string>;
  reasoning: string;
  optimizations?: string[];
  comparison?: ProviderComparison[];
}

export interface ProviderComparison {
  provider: string;
  monthlyC: number;
  pros: string[];
  cons: string[];
  recommended: boolean;
}

export class RecommendationSystem {
  private aiProvider: UnifiedAIProvider;
  private providerRegistry: ProviderRegistry;
  
  constructor(providerRegistry: ProviderRegistry) {
    this.providerRegistry = providerRegistry;
    this.aiProvider = getAIProvider();
  }
  
  async getRecommendation(request: RecommendationRequest): Promise<RecommendationResponse> {
    // Build the prompt with all context
    const availableProviders = this.providerRegistry.getAllProviders();
    const prompt = this.buildRecommendationPrompt(request, availableProviders);
    
    // Get AI recommendation
    const result = await this.aiProvider.generateText(prompt, {
      maxTokens: 2000,
      temperature: 0.3,
      system: `You are an expert cloud architecture advisor. Analyze requirements and recommend the best architecture and providers. Always return valid JSON.`
    });
    
    try {
      // Parse the AI response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON in response');
      }
      
      const recommendation = JSON.parse(jsonMatch[0]);
      
      // Add provider comparison if requested
      if (request.compareProviders) {
        recommendation.comparison = await this.compareProviders(request.input, recommendation.providers);
      }
      
      return recommendation;
    } catch (error) {
      console.error('Failed to parse AI recommendation:', error);
      // Return a default recommendation
      return {
        architectureType: 'full-stack',
        providers: ['vercel', 'supabase'],
        estimatedCost: { min: 20, max: 100 },
        services: {
          hosting: 'vercel',
          database: 'supabase',
          authentication: 'supabase'
        },
        reasoning: 'Failed to generate recommendation. Default suggestion provided.',
        optimizations: ['Use caching', 'Optimize images', 'Enable CDN']
      };
    }
  }
  
  private buildRecommendationPrompt(request: RecommendationRequest, providers: Provider[]): string {
    const providerList = providers.map(p => `${p.name}: ${p.metadata.description || 'Cloud provider'}`).join('\n');
    
    let prompt = `Analyze these requirements and recommend the best architecture:

Requirements: ${request.input}`;

    if (request.budget) {
      prompt += `\nBudget constraint: $${request.budget}/month`;
    }

    prompt += `

Available providers:
${providerList}

Provide a recommendation with:
1. Architecture type (static, api, full-stack, microservices, serverless)
2. Best providers for this use case
3. Estimated monthly cost range
4. Which provider for each service (hosting, database, auth, storage, etc.)
5. Clear reasoning for the choices`;

    if (request.optimize) {
      prompt += `\n6. Cost optimization suggestions`;
    }

    prompt += `

Return as JSON with this exact structure:
{
  "architectureType": "type",
  "providers": ["provider1", "provider2"],
  "estimatedCost": { "min": 0, "max": 100 },
  "services": {
    "hosting": "provider",
    "database": "provider",
    "authentication": "provider",
    "storage": "provider"
  },
  "reasoning": "Clear explanation of why these choices",
  "optimizations": ["optimization1", "optimization2", "optimization3"]
}`;

    return prompt;
  }
  
  private async compareProviders(requirements: string, recommendedProviders: string[]): Promise<ProviderComparison[]> {
    const prompt = `Compare these providers for the requirements:
    
Requirements: ${requirements}
Providers to compare: ${recommendedProviders.join(', ')}

For each provider, provide:
1. Estimated monthly cost
2. Top 3 pros
3. Top 3 cons
4. Whether it's recommended for this use case

Return as JSON array:
[
  {
    "provider": "name",
    "monthlyC": 50,
    "pros": ["pro1", "pro2", "pro3"],
    "cons": ["con1", "con2", "con3"],
    "recommended": true
  }
]`;

    const result = await this.aiProvider.generateText(prompt, {
      maxTokens: 1500,
      temperature: 0.3
    });
    
    try {
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse provider comparison:', error);
    }
    
    // Return basic comparison if AI fails
    return recommendedProviders.map(provider => ({
      provider,
      monthlyC: 50,
      pros: ['Reliable', 'Good documentation', 'Active community'],
      cons: ['Learning curve', 'Pricing complexity', 'Limited free tier'],
      recommended: true
    }));
  }
  
  async explainCosts(architecture: any): Promise<string> {
    const prompt = `Explain the cost breakdown for this architecture:
    
Architecture: ${JSON.stringify(architecture, null, 2)}

Provide:
1. Summary of total costs
2. Breakdown by service
3. Main cost drivers
4. Ways to reduce costs

Format as clear, readable text explanation.`;

    const result = await this.aiProvider.generateText(prompt, {
      maxTokens: 1000,
      temperature: 0.3
    });
    
    return result.text;
  }
  
  async suggestOptimizations(currentArchitecture: any, budget?: number): Promise<string[]> {
    const prompt = `Suggest cost optimizations for this architecture:
    
Current setup: ${JSON.stringify(currentArchitecture, null, 2)}
${budget ? `Target budget: $${budget}/month` : ''}

Provide 5 specific, actionable optimization suggestions.
Return as JSON array of strings.`;

    const result = await this.aiProvider.generateText(prompt, {
      maxTokens: 800,
      temperature: 0.4
    });
    
    try {
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse optimizations:', error);
    }
    
    return [
      'Enable caching to reduce compute costs',
      'Use CDN for static assets',
      'Optimize database queries',
      'Implement auto-scaling policies',
      'Review and remove unused resources'
    ];
  }
}