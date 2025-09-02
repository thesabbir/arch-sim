import { z } from 'zod';

// Netlify-specific pricing schema
export const NetlifyPricingSchema = z.object({
  provider: z.literal('netlify'),
  lastUpdated: z.string().datetime(),
  currency: z.literal('USD'),
  billingPeriod: z.literal('monthly'),
  tiers: z.array(z.object({
    name: z.enum(['Starter', 'Pro', 'Business', 'Enterprise']),
    basePrice: z.number().min(0).nullable(),
    limits: z.object({
      bandwidth: z.number(),        // GB
      buildMinutes: z.number(),     // minutes
      concurrent: z.number(),       // builds
      teamMembers: z.number().optional(),
      sites: z.number().optional()
    }),
    features: z.array(z.string())
  })),
  services: z.array(z.object({
    name: z.enum([
      'bandwidth',
      'builds',
      'functions',
      'identity',
      'forms',
      'analytics',
      'large-media'
    ]),
    unit: z.string(),
    price: z.number(),
    freeQuota: z.number()
  }))
});

export type NetlifyPricingData = z.infer<typeof NetlifyPricingSchema>;