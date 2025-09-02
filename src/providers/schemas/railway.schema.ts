import { z } from 'zod';

// Railway-specific pricing schema
export const RailwayPricingSchema = z.object({
  provider: z.literal('railway'),
  lastUpdated: z.string().datetime(),
  currency: z.literal('USD'),
  billingPeriod: z.literal('monthly'),
  tiers: z.array(z.object({
    name: z.enum(['Trial', 'Hobby', 'Pro', 'Enterprise']),
    basePrice: z.number().min(0).nullable(),
    limits: z.object({
      vcpu: z.number().optional(),
      memory: z.number().optional(),      // GB
      disk: z.number().optional(),         // GB
      networkEgress: z.number().optional(), // GB
      executionTime: z.number().optional()  // hours
    }),
    features: z.array(z.string())
  })),
  services: z.array(z.object({
    name: z.enum([
      'vcpu',
      'memory',
      'disk',
      'network-egress',
      'postgres',
      'redis',
      'mysql',
      'mongodb'
    ]),
    unit: z.string(),
    price: z.number(),
    freeQuota: z.number()
  }))
});

export type RailwayPricingData = z.infer<typeof RailwayPricingSchema>;