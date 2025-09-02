import { z } from 'zod';

// Firebase-specific pricing schema
export const FirebasePricingSchema = z.object({
  provider: z.literal('firebase'),
  lastUpdated: z.string().datetime(),
  currency: z.literal('USD'),
  billingPeriod: z.literal('monthly'),
  plans: z.array(z.object({
    name: z.enum(['Spark', 'Blaze']),
    basePrice: z.number(),
    features: z.array(z.string())
  })),
  services: z.object({
    firestore: z.object({
      documentReads: z.object({
        freeQuota: z.number(),
        pricePerMillion: z.number()
      }),
      documentWrites: z.object({
        freeQuota: z.number(),
        pricePerMillion: z.number()
      }),
      documentDeletes: z.object({
        freeQuota: z.number(),
        pricePerMillion: z.number()
      }),
      storage: z.object({
        freeQuota: z.number(),
        pricePerGBMonth: z.number()
      }),
      networkEgress: z.object({
        freeQuota: z.number(),
        pricePerGB: z.number()
      })
    }),
    realtimeDatabase: z.object({
      storage: z.object({
        freeQuota: z.number(),
        pricePerGBMonth: z.number()
      }),
      bandwidth: z.object({
        freeQuota: z.number(),
        pricePerGB: z.number()
      })
    }),
    storage: z.object({
      storage: z.object({
        freeQuota: z.number(),
        pricePerGBMonth: z.number()
      }),
      bandwidth: z.object({
        freeQuota: z.number(),
        pricePerGB: z.number()
      }),
      operations: z.object({
        classA: z.object({
          freeQuota: z.number(),
          pricePer10k: z.number()
        }),
        classB: z.object({
          freeQuota: z.number(),
          pricePer10k: z.number()
        })
      })
    }),
    functions: z.object({
      invocations: z.object({
        freeQuota: z.number(),
        pricePerMillion: z.number()
      }),
      gbSeconds: z.object({
        freeQuota: z.number(),
        pricePerGBSecond: z.number()
      }),
      cpuSeconds: z.object({
        freeQuota: z.number(),
        pricePerVCPUSecond: z.number()
      })
    }),
    hosting: z.object({
      storage: z.object({
        freeQuota: z.number(),
        pricePerGBMonth: z.number()
      }),
      bandwidth: z.object({
        freeQuota: z.number(),
        pricePerGB: z.number()
      })
    }),
    authentication: z.object({
      mau: z.object({
        freeQuota: z.number(),
        tieredPricing: z.array(z.object({
          upTo: z.number(),
          pricePerUser: z.number()
        }))
      }),
      phoneAuth: z.object({
        freeQuota: z.number(),
        pricePerVerification: z.number()
      })
    })
  })
});

export type FirebasePricingData = z.infer<typeof FirebasePricingSchema>;