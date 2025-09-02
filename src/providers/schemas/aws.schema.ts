import { z } from 'zod';

// AWS EC2 instance types
export const EC2InstanceSchema = z.object({
  type: z.string(),
  vcpu: z.number(),
  memory: z.number(), // GB
  pricePerHour: z.object({
    onDemand: z.number(),
    spot: z.number().optional(),
    reserved1yr: z.number().optional(),
    reserved3yr: z.number().optional()
  }),
  networkPerformance: z.string().optional()
});

// AWS regions with pricing multipliers
export const AWSRegionSchema = z.object({
  code: z.string(),
  name: z.string(),
  priceMultiplier: z.number().default(1.0)
});

// AWS-specific pricing schema
export const AWSPricingSchema = z.object({
  provider: z.literal('aws'),
  lastUpdated: z.string().datetime(),
  currency: z.literal('USD'),
  
  // EC2 Compute
  ec2: z.object({
    instances: z.array(EC2InstanceSchema),
    regions: z.array(AWSRegionSchema)
  }),
  
  // Storage
  storage: z.object({
    ebs: z.object({
      gp3: z.object({
        pricePerGBMonth: z.number(),
        iopsIncluded: z.number(),
        additionalIOPSPrice: z.number()
      }),
      gp2: z.object({
        pricePerGBMonth: z.number()
      }),
      io2: z.object({
        pricePerGBMonth: z.number(),
        pricePerIOPS: z.number()
      })
    }),
    s3: z.object({
      standard: z.object({
        firstTB: z.number(),
        next49TB: z.number(),
        over50TB: z.number()
      }),
      infrequentAccess: z.object({
        pricePerGB: z.number()
      }),
      glacier: z.object({
        instant: z.number(),
        flexible: z.number(),
        deep: z.number()
      })
    })
  }),
  
  // Network costs (often hidden!)
  network: z.object({
    dataTransfer: z.object({
      internetEgress: z.array(z.object({
        upToGB: z.number(),
        pricePerGB: z.number()
      })),
      interRegion: z.number(),
      interAZ: z.number()
    }),
    elasticIP: z.object({
      attached: z.number(),
      unattached: z.number() // per hour
    }),
    natGateway: z.object({
      hourly: z.number(),
      dataProcessingPerGB: z.number()
    }),
    loadBalancer: z.object({
      alb: z.object({
        hourly: z.number(),
        lcuHour: z.number()
      }),
      nlb: z.object({
        hourly: z.number(),
        nlcuHour: z.number()
      })
    })
  }),
  
  // RDS Database
  rds: z.object({
    instances: z.array(z.object({
      type: z.string(),
      vcpu: z.number(),
      memory: z.number(),
      pricePerHour: z.number()
    })),
    storage: z.object({
      gp3: z.number(), // per GB-month
      io1: z.number()
    }),
    backup: z.object({
      pricePerGB: z.number()
    })
  }),
  
  // Lambda
  lambda: z.object({
    requests: z.object({
      freePerMonth: z.number(),
      pricePerMillion: z.number()
    }),
    compute: z.object({
      freeGBSeconds: z.number(),
      pricePerGBSecond: z.number()
    })
  })
});

export type AWSPricingData = z.infer<typeof AWSPricingSchema>;