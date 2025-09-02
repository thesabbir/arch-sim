import { z } from 'zod';

// PlanetScale-specific pricing schema (Serverless MySQL)
export const PlanetScalePricingSchema = z.object({
  provider: z.literal('planetscale'),
  lastUpdated: z.string().datetime(),
  currency: z.literal('USD'),
  billingPeriod: z.literal('monthly'),
  plans: z.array(z.object({
    name: z.enum(['Hobby', 'Scaler', 'Scaler Pro', 'Enterprise']),
    basePrice: z.number().nullable(),
    limits: z.object({
      rowsRead: z.number().nullable(),
      rowsWritten: z.number().nullable(),
      storage: z.number(),           // GB
      branches: z.number().nullable(),
      connections: z.number().nullable()
    }),
    features: z.array(z.string())
  })),
  services: z.array(z.object({
    name: z.enum([
      'rows-read',
      'rows-written',
      'storage',
      'branches',
      'connections',
      'data-transfer',
      'insights'
    ]),
    unit: z.string(),
    price: z.number(),
    freeQuota: z.number()
  })),
  performance: z.object({
    readLatency: z.string(),
    writeLatency: z.string(),
    availability: z.string()
  }).optional()
});

export type PlanetScalePricingData = z.infer<typeof PlanetScalePricingSchema>;