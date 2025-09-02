import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { getConfigLoader } from '../config/config-loader';
import type { Provider } from '../providers/base/provider.interface';

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class UnifiedAIProvider {
  private model: any;
  private modelName: string = '';
  private initialized: boolean = false;

  constructor() {
    // Lazy initialization - don't initialize in constructor
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeModel();
      this.initialized = true;
    }
  }

  private async initializeModel() {
    // Ensure config is loaded first
    const configLoader = getConfigLoader();
    await configLoader.loadConfig();
    const config = configLoader.getConfig();
    this.modelName = config.ai.model;
    process.env.OPENAI_API_KEY = config.ai.apiKey;

    // Determine provider from model name and create appropriate model
    const modelLower = this.modelName.toLowerCase();

    if (modelLower.includes('gpt')) {
      // OpenAI models
      this.model = openai(this.modelName);
    } else if (modelLower.includes('claude')) {
      // Anthropic models
      this.model = anthropic(this.modelName);
    } else if (modelLower.includes('gemini')) {
      // Google models
      this.model = google(this.modelName);
    } else if (modelLower.includes('mistral')) {
      // Mistral models
      this.model = mistral(this.modelName);
    } else {
      // Default to OpenAI
      this.model = openai(this.modelName);
    }
  }

  async generateText(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      system?: string;
    }
  ): Promise<AIResponse> {
    await this.ensureInitialized();
    try {
      const result = await generateText({
        model: this.model,
        prompt,
        maxRetries: 2,
        // temperature: options?.temperature || 0.3,
        system: options?.system,
        providerOptions: {
          openai: {
            openai: {
              reasoningEffort: 'medium',
            },
          },
        },
      });

      return {
        text: result.text,
        usage: result.usage
          ? {
              promptTokens: (result.usage as any).promptTokens || 0,
              completionTokens: (result.usage as any).completionTokens || 0,
              totalTokens: result.usage.totalTokens || 0,
            }
          : undefined,
      };
    } catch (error) {
      console.error('AI generation failed:', error);
      throw error;
    }
  }

  async extractPricingData(provider: Provider): Promise<any> {
    await this.ensureInitialized();
    if (!provider.dataExtraction) {
      throw new Error(`Provider ${provider.name} has no data extraction config`);
    }

    const { prompt, schema, exampleResponse } = provider.dataExtraction;

    const systemPrompt = `You are a pricing data extraction assistant. 
Extract pricing information and return it in the exact JSON format specified.
Use the example as a guide for the structure.

Expected schema:
${JSON.stringify(schema, null, 2)}

Example response:
${JSON.stringify(exampleResponse, null, 2)}`;

    const result = await this.generateText(prompt, {
      system: systemPrompt,
      temperature: 0.1,
    });

    try {
      // Try to parse JSON from the response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw error;
    }
  }

  async getRecommendation(requirements: string): Promise<any> {
    await this.ensureInitialized();
    const prompt = `Analyze these requirements and recommend the best architecture:
    
Requirements: ${requirements}

Provide recommendations for:
1. Architecture type (static, api, full-stack, microservices)
2. Recommended providers and services
3. Estimated monthly cost
4. Key considerations

Return as JSON with structure:
{
  "architectureType": "type",
  "providers": ["provider1", "provider2"],
  "estimatedCost": { "min": 0, "max": 100 },
  "considerations": ["point1", "point2"]
}`;

    const stylePrompt = `You are an expert cloud architecture advisor. Analyze requirements and recommend the best architecture and providers. Always return valid JSON.`;

    const result = await this.generateText(prompt, {
      maxTokens: 1000,
      temperature: 0.3,
      system: stylePrompt,
    });

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { error: 'Could not parse recommendation' };
    } catch (error) {
      return { error: 'Failed to generate recommendation' };
    }
  }

  async compareProviders(providers: string[], requirements: any): Promise<any> {
    await this.ensureInitialized();
    const prompt = `Compare these providers for the given requirements:
    
Providers: ${providers.join(', ')}
Requirements: ${JSON.stringify(requirements)}

Provide a comparison including:
1. Cost comparison
2. Feature comparison
3. Best fit analysis
4. Pros and cons

Return as structured JSON.`;

    const systemPrompt = `You are an expert cloud architecture advisor. Analyze requirements and recommend the best architecture and providers. Always return valid JSON.`;

    const result = await this.generateText(prompt, {
      maxTokens: 1500,
      temperature: 0.3,
      system: systemPrompt,
    });

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { error: 'Could not parse comparison' };
    } catch (error) {
      return { error: 'Failed to compare providers' };
    }
  }
}

// Singleton instance
let aiProvider: UnifiedAIProvider | null = null;

export function getAIProvider(): UnifiedAIProvider {
  if (!aiProvider) {
    aiProvider = new UnifiedAIProvider();
  }
  return aiProvider;
}

export function resetAIProvider(): void {
  aiProvider = null;
}
