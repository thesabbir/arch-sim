import { z } from 'zod';
import { DataLoader } from '../../data/storage/data-loader';
import { VercelPricingSchema } from '../schemas/vercel.schema';
import { AWSPricingSchema } from '../schemas/aws.schema';
import { SupabasePricingSchema } from '../schemas/supabase.schema';
import { NetlifyPricingSchema } from '../schemas/netlify.schema';
import { CloudflarePricingSchema } from '../schemas/cloudflare.schema';
import { RailwayPricingSchema } from '../schemas/railway.schema';
import { RenderPricingSchema } from '../schemas/render.schema';
import { FlyioPricingSchema } from '../schemas/flyio.schema';
import { DigitalOceanPricingSchema } from '../schemas/digitalocean.schema';
import { FirebasePricingSchema } from '../schemas/firebase.schema';
import { NeonPricingSchema } from '../schemas/neon.schema';
import { PlanetScalePricingSchema } from '../schemas/planetscale.schema';
import { GCPPricingSchema } from '../schemas/gcp.schema';

// Map of provider-specific schemas
// For now, providers without specific schemas will use raw data
const PROVIDER_SCHEMAS = {
  vercel: VercelPricingSchema,
  aws: AWSPricingSchema,
  gcp: GCPPricingSchema,
  supabase: SupabasePricingSchema,
  netlify: NetlifyPricingSchema,
  cloudflare: CloudflarePricingSchema,
  railway: RailwayPricingSchema,
  render: RenderPricingSchema,
  flyio: FlyioPricingSchema,
  digitalocean: DigitalOceanPricingSchema,
  firebase: FirebasePricingSchema,
  neon: NeonPricingSchema,
  planetscale: PlanetScalePricingSchema
} as const;

export class PricingLoader {
  private dataLoader: DataLoader;
  private cache = new Map<string, any>();
  
  constructor(dataLoader: DataLoader) {
    this.dataLoader = dataLoader;
  }
  
  /**
   * Load and validate pricing data for a provider
   * Uses provider-specific schema for validation
   */
  async loadPricing<T extends keyof typeof PROVIDER_SCHEMAS>(
    provider: T
  ): Promise<z.infer<(typeof PROVIDER_SCHEMAS)[T]>> {
    // Check cache first
    if (this.cache.has(provider)) {
      return this.cache.get(provider);
    }
    
    // Load raw data
    const rawData = await this.dataLoader.loadProviderData(provider);
    
    // Get provider-specific schema
    const schema = PROVIDER_SCHEMAS[provider];
    if (!schema) {
      // For providers without specific schema, return raw data
      console.warn(`No schema defined for provider: ${provider}`);
      return rawData as any;
    }
    
    // Validate with provider-specific schema
    try {
      const validated = schema.parse(rawData);
      this.cache.set(provider, validated);
      return validated as any;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`Pricing validation failed for ${provider}:`, error.issues);
        throw new Error(`Invalid pricing data for ${provider}: ${error.issues.map((e: any) => e.message).join(', ')}`);
      }
      throw error;
    }
  }
  
  /**
   * Get raw pricing data for any provider
   */
  async getRawPricing(provider: string): Promise<any> {
    return this.dataLoader.loadProviderData(provider);
  }
  
  /**
   * Get a specific value from nested pricing data
   */
  getNestedValue(data: any, path: string): any {
    const keys = path.split('.');
    let result = data;
    for (const key of keys) {
      if (result && typeof result === 'object') {
        result = result[key];
      } else {
        return undefined;
      }
    }
    return result;
  }
  
  /**
   * Get a specific service price from provider data
   */
  async getServicePrice(
    provider: string,
    service: string
  ): Promise<number> {
    const pricing = await this.loadPricing(provider as any);
    
    // Provider-specific logic
    switch (provider) {
      case 'vercel': {
        const vercelPricing = pricing as z.infer<typeof VercelPricingSchema>;
        const serviceData = vercelPricing.services.find(s => s.name === service);
        return serviceData?.price || 0;
      }
      
      case 'aws': {
        const awsPricing = pricing as z.infer<typeof AWSPricingSchema>;
        // AWS has complex nested pricing
        if (service === 'ec2') {
          // Return default t3.micro price
          const t3micro = awsPricing.ec2.instances.find(i => i.type === 't3.micro');
          return t3micro?.pricePerHour.onDemand || 0.0104;
        }
        if (service === 'bandwidth') {
          // Return first tier egress price
          return awsPricing.network.dataTransfer.internetEgress[0]?.pricePerGB || 0.09;
        }
        return 0;
      }
      
      case 'supabase': {
        const supabasePricing = pricing as z.infer<typeof SupabasePricingSchema>;
        // Handle Supabase overages
        if (service === 'database-storage') {
          return supabasePricing.overages.database.storage.pricePerGB;
        }
        if (service === 'bandwidth') {
          return supabasePricing.overages.storage.bandwidth.pricePerGB;
        }
        return 0;
      }
      
      default:
        console.warn(`Unknown provider: ${provider}`);
        return 0;
    }
  }
  
  /**
   * Clear cache to force reload
   */
  clearCache(provider?: string) {
    if (provider) {
      this.cache.delete(provider);
    } else {
      this.cache.clear();
    }
  }
}