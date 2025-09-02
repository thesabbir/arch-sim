import { z } from 'zod';

// Vercel-specific pricing schema
export const VercelPricingSchema = z.object({
  provider: z.literal('vercel'),
  lastUpdated: z.string().datetime(),
  currency: z.literal('USD'),
  billingPeriod: z.literal('monthly'),
  tiers: z.array(z.object({
    name: z.enum(['Hobby', 'Pro', 'Enterprise']),
    basePrice: z.number().min(0),
    limits: z.object({
      bandwidth: z.number(),      // GB
      functions: z.number(),      // invocations
      compute: z.number(),        // GB-hours
      builds: z.number(),         // minutes
      concurrent: z.number(),     // builds
      teamMembers: z.number().optional()
    }),
    features: z.array(z.string())
  })),
  services: z.array(z.object({
    name: z.enum([
      'bandwidth',
      'functions', 
      'compute',
      'builds',
      'edge-requests',
      'image-optimization',
      'analytics'
    ]),
    unit: z.string(),
    price: z.number(),
    freeQuota: z.number()
  }))
});

export type VercelPricingData = z.infer<typeof VercelPricingSchema>;