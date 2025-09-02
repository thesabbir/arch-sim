import { z } from 'zod';

// Supabase-specific pricing schema
export const SupabasePricingSchema = z.object({
  provider: z.literal('supabase'),
  lastUpdated: z.string().datetime(),
  currency: z.literal('USD'),
  billingPeriod: z.literal('monthly'),
  
  tiers: z.array(z.object({
    name: z.enum(['Free', 'Pro', 'Team', 'Enterprise']),
    basePrice: z.number(),
    limits: z.object({
      database: z.object({
        size: z.number(), // GB
        apiRequests: z.number(),
        concurrent: z.number()
      }),
      storage: z.object({
        size: z.number(), // GB
        bandwidth: z.number(), // GB
        transformations: z.number()
      }),
      auth: z.object({
        mau: z.number(), // monthly active users
        sso: z.boolean()
      }),
      realtime: z.object({
        messages: z.number(),
        connections: z.number(),
        peakConnections: z.number()
      }),
      edge: z.object({
        invocations: z.number(),
        runtime: z.number() // GB-seconds
      })
    })
  })),
  
  overages: z.object({
    database: z.object({
      storage: z.object({
        pricePerGB: z.number(),
        includedGB: z.number()
      }),
      apiRequests: z.object({
        pricePerMillion: z.number(),
        includedMillion: z.number()
      })
    }),
    storage: z.object({
      size: z.object({
        pricePerGB: z.number(),
        includedGB: z.number()
      }),
      bandwidth: z.object({
        pricePerGB: z.number(),
        includedGB: z.number()
      })
    }),
    auth: z.object({
      mau: z.object({
        pricePerThousand: z.number(),
        includedThousand: z.number()
      })
    }),
    realtime: z.object({
      messages: z.object({
        pricePerMillion: z.number(),
        includedMillion: z.number()
      }),
      peakConnections: z.object({
        pricePerThousand: z.number(),
        includedThousand: z.number()
      })
    })
  })
});

export type SupabasePricingData = z.infer<typeof SupabasePricingSchema>;