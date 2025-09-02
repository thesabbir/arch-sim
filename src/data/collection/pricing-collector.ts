import type { PricingData } from '../../providers/base/provider.interface';
import { DataStorage } from '../storage/data-storage';
import { PricingValidator } from './pricing-validator';
import { ChangeDetector } from './change-detector';
import { getRegistry } from '../../core/provider-registry';
import * as fs from 'fs/promises';

export interface CollectorConfig {
  providers: {
    [name: string]: {
      url: string;
      selectors?: {
        pricing?: string;
        tiers?: string;
        features?: string;
      };
    };
  };
  validation: {
    requiredFields: string[];
    priceRanges?: {
      min: number;
      max: number;
    };
  };
  scraping?: {
    userAgent?: string;
    timeout?: number;
    retries?: number;
  };
}

export interface CollectionResult {
  provider: string;
  success: boolean;
  data?: PricingData;
  error?: string;
  hasChanges?: boolean;
  timestamp: string;
}

export class PricingCollector {
  private storage: DataStorage;
  private validator: PricingValidator;
  private changeDetector: ChangeDetector;
  private config: CollectorConfig;
  
  constructor(config: CollectorConfig) {
    this.config = config;
    this.storage = new DataStorage();
    this.validator = new PricingValidator(config.validation);
    this.changeDetector = new ChangeDetector();
  }
  
  /**
   * Collect pricing data for a specific provider
   */
  async collectProvider(providerName: string): Promise<CollectionResult> {
    const result: CollectionResult = {
      provider: providerName,
      success: false,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Check if provider exists in registry
      const registry = getRegistry();
      if (!registry.hasProvider(providerName)) {
        // Fall back to config if provider not in registry
        const providerConfig = this.config.providers[providerName];
        if (!providerConfig) {
          throw new Error(`Provider not found in registry or config: ${providerName}`);
        }
      }
      
      // Get provider configuration
      const providerConfig = this.config.providers[providerName] || {};
      
      // Extract pricing data (simulated - in production would use web scraping)
      const extractedData = await this.extractPricingData(providerName, providerConfig);
      
      // Validate the extracted data
      const validationResult = this.validator.validate(extractedData);
      if (!validationResult.valid) {
        throw new Error(`Validation failed: ${validationResult.errors?.join(', ')}`);
      }
      
      // Check for changes
      const currentData = await this.storage.loadProviderData(providerName);
      const hasChanges = await this.changeDetector.detectChanges(currentData, extractedData);
      
      if (hasChanges) {
        // Create snapshot before updating
        await this.storage.createSnapshot(providerName, currentData);
        
        // Update the data
        await this.storage.updateProviderData(providerName, extractedData);
        
        result.hasChanges = true;
      }
      
      result.success = true;
      result.data = extractedData;
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Collection failed for ${providerName}:`, error);
    }
    
    return result;
  }
  
  /**
   * Collect pricing data for all configured providers
   */
  async collectAll(): Promise<CollectionResult[]> {
    const results: CollectionResult[] = [];
    
    for (const providerName of Object.keys(this.config.providers)) {
      const result = await this.collectProvider(providerName);
      results.push(result);
      
      // Add delay between requests to avoid rate limiting
      await this.delay(1000);
    }
    
    return results;
  }
  
  /**
   * Extract pricing data from provider
   * Uses the provider's built-in data extraction configuration
   */
  private async extractPricingData(
    providerName: string,
    _config: any
  ): Promise<PricingData> {
    // Get the provider from registry
    const registry = getRegistry();
    const provider = registry.getProvider(providerName);
    
    // Check if provider has data extraction config
    if (!provider.dataExtraction) {
      // Fallback to existing data with updated timestamp
      const existingData = await this.storage.loadProviderData(providerName);
      return {
        ...existingData,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // In production, this would use the provider's extraction config
    // to make API calls to LLM providers with the prompt and schema
    console.log(`Using extraction config for ${providerName}:`);
    console.log(`- Prompt: ${provider.dataExtraction.prompt.substring(0, 100)}...`);
    console.log(`- Schema fields: ${Object.keys(provider.dataExtraction.schema).join(', ')}`);
    
    // For now, return existing data with updated timestamp
    // In production implementation:
    // 1. Use the provider.dataExtraction.prompt with LLM API
    // 2. Validate response against provider.dataExtraction.schema
    // 3. Transform and return the structured data
    const existingData = await this.storage.loadProviderData(providerName);
    
    return {
      ...existingData,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Update pricing from a JSON file
   */
  async updateFromFile(providerName: string, filePath: string): Promise<CollectionResult> {
    const result: CollectionResult = {
      provider: providerName,
      success: false,
      timestamp: new Date().toISOString()
    };
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as PricingData;
      
      // Validate the data
      const validationResult = this.validator.validate(data);
      if (!validationResult.valid) {
        throw new Error(`Validation failed: ${validationResult.errors?.join(', ')}`);
      }
      
      // Check for changes
      const currentData = await this.storage.loadProviderData(providerName);
      const hasChanges = await this.changeDetector.detectChanges(currentData, data);
      
      if (hasChanges) {
        await this.storage.createSnapshot(providerName, currentData);
        await this.storage.updateProviderData(providerName, data);
        result.hasChanges = true;
      }
      
      result.success = true;
      result.data = data;
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    return result;
  }
  
  /**
   * Get collection history for a provider
   */
  async getHistory(providerName: string): Promise<any[]> {
    return this.storage.getSnapshots(providerName);
  }
  
  /**
   * Validate all provider data
   */
  async validateAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const providerName of Object.keys(this.config.providers)) {
      try {
        const data = await this.storage.loadProviderData(providerName);
        const validationResult = this.validator.validate(data);
        results.set(providerName, validationResult.valid);
      } catch (error) {
        results.set(providerName, false);
      }
    }
    
    return results;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}