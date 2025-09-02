import { z } from 'zod';

// Neon-specific pricing schema (Serverless Postgres)
export const NeonPricingSchema = z.object({
  provider: z.literal('neon'),
  lastUpdated: z.string().datetime(),
  currency: z.literal('USD'),
  billingPeriod: z.literal('monthly'),
  plans: z.array(z.object({
    name: z.enum(['Free', 'Pro', 'Custom']),
    basePrice: z.number().nullable(),
    limits: z.object({
      computeHours: z.number().nullable(),
      storage: z.number(),           // GB
      projects: z.number().nullable(),
      branches: z.number().nullable(),
      databases: z.number().nullable()
    }),
    features: z.array(z.string())
  })),
  services: z.array(z.object({
    name: z.enum([
      'compute-time',
      'storage',
      'data-transfer',
      'branches',
      'point-in-time-recovery'
    ]),
    unit: z.string(),
    price: z.number(),
    freeQuota: z.number()
  })),
  compute: z.array(z.object({
    size: z.string(),
    cpu: z.number(),
    memory: z.number(),
    pricePerHour: z.number()
  })).optional()
});

export type NeonPricingData = z.infer<typeof NeonPricingSchema>;