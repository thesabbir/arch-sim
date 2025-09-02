import { z } from 'zod';

// Cloudflare-specific pricing schema
export const CloudflarePricingSchema = z.object({
  provider: z.literal('cloudflare'),
  lastUpdated: z.string().datetime(),
  currency: z.literal('USD'),
  billingPeriod: z.literal('monthly'),
  tiers: z.array(z.object({
    name: z.enum(['Free', 'Pro', 'Business', 'Enterprise']),
    basePrice: z.number().min(0).nullable(),
    limits: z.object({
      bandwidth: z.number().nullable(),     // unlimited for most tiers
      requests: z.number().nullable(),
      pageRules: z.number(),
      workers: z.number().optional(),
      workerRequests: z.number().optional()
    }),
    features: z.array(z.string())
  })),
  services: z.array(z.object({
    name: z.enum([
      'workers',
      'workers-kv',
      'r2-storage',
      'r2-operations',
      'd1-database',
      'durable-objects',
      'pages-builds',
      'stream',
      'images'
    ]),
    unit: z.string(),
    price: z.number(),
    freeQuota: z.number()
  }))
});

export type CloudflarePricingData = z.infer<typeof CloudflarePricingSchema>;