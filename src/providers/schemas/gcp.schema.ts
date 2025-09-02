import { z } from 'zod';

// GCP instance types
export const GCPInstanceSchema = z.object({
  type: z.string(),
  vcpu: z.number(),
  memory: z.number(), // GB
  pricePerHour: z.object({
    onDemand: z.number(),
    spot: z.number().optional(),
    committed1yr: z.number().optional(),
    committed3yr: z.number().optional()
  })
});

// GCP regions with pricing multipliers
export const GCPRegionSchema = z.object({
  code: z.string(),
  name: z.string(),
  priceMultiplier: z.number().default(1.0)
});

// GCP-specific pricing schema
export const GCPPricingSchema = z.object({
  provider: z.literal('gcp'),
  lastUpdated: z.string().datetime(),
  currency: z.literal('USD'),
  billingPeriod: z.literal('monthly'),
  
  // Compute Engine
  compute: z.object({
    instances: z.array(GCPInstanceSchema),
    regions: z.array(GCPRegionSchema)
  }),
  
  // Storage
  storage: z.object({
    persistentDisk: z.object({
      standard: z.object({
        pricePerGBMonth: z.number()
      }),
      ssd: z.object({
        pricePerGBMonth: z.number()
      }),
      balanced: z.object({
        pricePerGBMonth: z.number()
      })
    }),
    cloudStorage: z.object({
      standard: z.object({
        pricePerGBMonth: z.number(),
        classA: z.number(),
        classB: z.number()
      }),
      nearline: z.object({
        pricePerGBMonth: z.number(),
        retrieval: z.number()
      }),
      coldline: z.object({
        pricePerGBMonth: z.number(),
        retrieval: z.number()
      }),
      archive: z.object({
        pricePerGBMonth: z.number(),
        retrieval: z.number()
      })
    })
  }),
  
  // Network
  network: z.object({
    dataTransfer: z.object({
      internetEgress: z.array(z.object({
        upToGB: z.number(),
        pricePerGB: z.number()
      })),
      interRegion: z.number(),
      interZone: z.number()
    }),
    loadBalancer: z.object({
      forwardingRule: z.object({
        pricePerHour: z.number()
      }),
      dataProcessing: z.object({
        pricePerGB: z.number()
      })
    })
  }),
  
  // Cloud SQL
  database: z.object({
    cloudSQL: z.object({
      mysql: z.array(z.object({
        type: z.string(),
        vcpu: z.number(),
        memory: z.number(),
        pricePerHour: z.number()
      })),
      storage: z.object({
        ssd: z.object({
          pricePerGBMonth: z.number()
        }),
        hdd: z.object({
          pricePerGBMonth: z.number()
        })
      }),
      backup: z.object({
        pricePerGBMonth: z.number()
      })
    }),
    firestore: z.object({
      documentReads: z.object({
        pricePerMillion: z.number()
      }),
      documentWrites: z.object({
        pricePerMillion: z.number()
      }),
      documentDeletes: z.object({
        pricePerMillion: z.number()
      }),
      storage: z.object({
        pricePerGBMonth: z.number()
      })
    })
  }),
  
  // Serverless
  serverless: z.object({
    cloudRun: z.object({
      cpu: z.object({
        pricePerVCPUSecond: z.number()
      }),
      memory: z.object({
        pricePerGBSecond: z.number()
      }),
      requests: z.object({
        pricePerMillion: z.number()
      })
    }),
    cloudFunctions: z.object({
      invocations: z.object({
        freePerMonth: z.number(),
        pricePerMillion: z.number()
      }),
      compute: z.object({
        freeGBSeconds: z.number(),
        pricePerGBSecond: z.number(),
        freeCPUSeconds: z.number(),
        pricePerGHzSecond: z.number()
      })
    })
  }),
  
  // AI/ML
  ai: z.object({
    vertexAI: z.object({
      palm2: z.object({
        inputTokens: z.number(),
        outputTokens: z.number()
      }),
      gemini: z.object({
        inputTokens: z.number(),
        outputTokens: z.number()
      })
    })
  }).optional()
});

export type GCPPricingData = z.infer<typeof GCPPricingSchema>;