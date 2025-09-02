import { z } from 'zod';

// Service pricing schema
export const ServicePricingSchema = z.object({
  name: z.string(),
  unit: z.string(),
  price: z.number().min(0),
  freeQuota: z.number().min(0).optional(),
  description: z.string().optional()
});

// Tier limits schema
export const TierLimitsSchema = z.object({
  bandwidth: z.number().optional(),
  functions: z.number().optional(),
  compute: z.number().optional(),
  storage: z.number().optional(),
  builds: z.number().optional(),
  concurrent: z.number().optional(),
  teamMembers: z.number().optional(),
  databases: z.number().optional(),
  requests: z.number().optional(),
  users: z.number().optional()
});

// Pricing tier schema
export const PricingTierSchema = z.object({
  name: z.string(),
  basePrice: z.number().min(0),
  limits: TierLimitsSchema,
  features: z.array(z.string()),
  overages: z.record(z.string(), z.number()).optional()
});

// Main pricing data schema
export const PricingDataSchema = z.object({
  provider: z.string(),
  lastUpdated: z.string().datetime(),
  currency: z.string().default('USD'),
  billingPeriod: z.enum(['monthly', 'yearly', 'hourly']).default('monthly'),
  tiers: z.array(PricingTierSchema),
  services: z.array(ServicePricingSchema),
  regions: z.record(z.string(), z.object({
    multiplier: z.number().default(1.0),
    available: z.boolean().default(true)
  })).optional(),
  instanceTypes: z.record(z.string(), z.object({
    cpu: z.number(),
    memory: z.number(),
    price: z.number(),
    description: z.string().optional()
  })).optional()
});

// Validate pricing data
export function validatePricingData(data: unknown): z.infer<typeof PricingDataSchema> {
  return PricingDataSchema.parse(data);
}

// Type exports
export type ServicePricing = z.infer<typeof ServicePricingSchema>;
export type TierLimits = z.infer<typeof TierLimitsSchema>;
export type PricingTier = z.infer<typeof PricingTierSchema>;
export type PricingData = z.infer<typeof PricingDataSchema>;