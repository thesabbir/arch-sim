import { z } from 'zod';

// Render-specific pricing schema
export const RenderPricingSchema = z.object({
  provider: z.literal('render'),
  lastUpdated: z.string().datetime(),
  currency: z.literal('USD'),
  billingPeriod: z.literal('monthly'),
  tiers: z.array(z.object({
    name: z.enum(['Free', 'Starter', 'Standard', 'Pro', 'Enterprise']),
    basePrice: z.number().min(0).nullable(),
    limits: z.object({
      services: z.number().optional(),
      buildMinutes: z.number(),
      bandwidth: z.number(),         // GB
      customDomains: z.number().optional(),
      teamMembers: z.number().optional()
    }),
    features: z.array(z.string())
  })),
  services: z.array(z.object({
    name: z.enum([
      'web-service',
      'private-service',
      'background-worker',
      'cron-job',
      'static-site',
      'postgres',
      'redis',
      'bandwidth',
      'build-minutes',
      'persistent-disk'
    ]),
    unit: z.string(),
    price: z.number(),
    freeQuota: z.number()
  })),
  instanceTypes: z.array(z.object({
    name: z.string(),
    cpu: z.number(),
    memory: z.number(),  // GB
    pricePerMonth: z.number()
  })).optional()
});

export type RenderPricingData = z.infer<typeof RenderPricingSchema>;