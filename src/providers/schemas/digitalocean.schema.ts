import { z } from 'zod';

// DigitalOcean-specific pricing schema
export const DigitalOceanPricingSchema = z.object({
  provider: z.literal('digitalocean'),
  lastUpdated: z.string().datetime(),
  currency: z.literal('USD'),
  billingPeriod: z.literal('monthly'),
  droplets: z.array(z.object({
    name: z.string(),
    vcpu: z.number(),
    memory: z.number(),    // GB
    storage: z.number(),   // GB SSD
    transfer: z.number(),  // TB
    pricePerMonth: z.number(),
    pricePerHour: z.number()
  })),
  appPlatform: z.object({
    tiers: z.array(z.object({
      name: z.enum(['Starter', 'Basic', 'Professional']),
      basePrice: z.number(),
      containers: z.number(),
      features: z.array(z.string())
    }))
  }),
  kubernetes: z.object({
    clusterPrice: z.number(),
    nodeTypes: z.array(z.object({
      name: z.string(),
      vcpu: z.number(),
      memory: z.number(),
      pricePerMonth: z.number()
    }))
  }),
  databases: z.object({
    postgres: z.array(z.object({
      name: z.string(),
      vcpu: z.number(),
      memory: z.number(),
      storage: z.number(),
      pricePerMonth: z.number()
    })),
    mysql: z.array(z.object({
      name: z.string(),
      vcpu: z.number(),
      memory: z.number(),
      storage: z.number(),
      pricePerMonth: z.number()
    }))
  }),
  storage: z.object({
    spaces: z.object({
      storage: z.object({
        pricePerGBMonth: z.number(),
        included: z.number()
      }),
      bandwidth: z.object({
        pricePerGB: z.number(),
        included: z.number()
      })
    }),
    volumes: z.object({
      pricePerGBMonth: z.number()
    })
  })
});

export type DigitalOceanPricingData = z.infer<typeof DigitalOceanPricingSchema>;