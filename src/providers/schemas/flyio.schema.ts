import { z } from 'zod';

// Fly.io-specific pricing schema
export const FlyioPricingSchema = z.object({
  provider: z.literal('flyio'),
  lastUpdated: z.string().datetime(),
  currency: z.literal('USD'),
  billingPeriod: z.literal('monthly'),
  tiers: z.array(z.object({
    name: z.enum(['Hobby', 'Launch', 'Scale', 'Enterprise']),
    basePrice: z.number().min(0).nullable(),
    limits: z.object({
      sharedCpu: z.number().optional(),
      dedicatedCpu: z.number().optional(),
      memory: z.number(),           // GB
      bandwidth: z.number(),        // GB
      persistentStorage: z.number() // GB
    }),
    features: z.array(z.string())
  })),
  services: z.array(z.object({
    name: z.enum([
      'shared-cpu-1x',
      'dedicated-cpu-1x',
      'dedicated-cpu-2x',
      'dedicated-cpu-4x',
      'dedicated-cpu-8x',
      'memory',
      'persistent-storage',
      'bandwidth',
      'ipv4',
      'ipv6'
    ]),
    unit: z.string(),
    price: z.number(),
    freeQuota: z.number()
  })),
  machines: z.array(z.object({
    type: z.string(),
    cpu: z.string(),
    memory: z.number(),
    pricePerHour: z.number()
  })).optional()
});

export type FlyioPricingData = z.infer<typeof FlyioPricingSchema>;