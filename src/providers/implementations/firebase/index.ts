import type {
  Provider,
  ProviderServices,
  ProviderMetadata,
  DataLoader,
  PriceCalculator,
  ProviderValidator,
  ValidationResult,
  PricingData,
  Usage,
  CostBreakdown,
  Override,
  Requirements,
  HostingService,
  DatabaseService,
  StorageService,
  AuthService,
  ServiceCapabilities,
  Cost,
  Runtime,
  ScalingOption
} from '../../base/provider.interface';
import { AbstractService } from '../../base/service.interface';
import { DataLoader as DataLoaderImpl } from '../../../data/storage/data-loader';

// Firebase Hosting Service
class FirebaseHostingService extends AbstractService implements HostingService {
  supportedRuntimes: Runtime[] = [
    { name: 'Static Sites', version: 'all', supported: true },
    { name: 'Node.js', version: '18', supported: true },
    { name: 'React', version: '18', supported: true },
    { name: 'Vue', version: '3', supported: true },
    { name: 'Angular', version: '16', supported: true },
    { name: 'Next.js', version: '13', supported: true }
  ];
  
  scalingOptions: ScalingOption[] = [
    { type: 'automatic', scalingMetric: 'global-cdn' }
  ];
  
  constructor() {
    super('Firebase Hosting');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global'],
      features: [
        'global-cdn',
        'automatic-ssl',
        'custom-domains',
        'github-integration',
        'preview-channels',
        'rollback-releases',
        'firebase-functions-integration',
        'cloud-run-integration',
        'i18n-support',
        'url-rewrites'
      ],
      limits: {
        storage: 10, // GB free tier
        bandwidth: 360, // GB/month free tier
        custom_domains: 100
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const storageCost = this.calculateStorageCost(usage.storage || 0);
    const bandwidthCost = this.calculateBandwidthCost(usage.bandwidth || 0);
    
    return {
      amount: storageCost + bandwidthCost,
      currency: 'USD',
      breakdown: {
        storage: storageCost,
        bandwidth: bandwidthCost
      }
    };
  }
  
  private calculateStorageCost(gb: number): number {
    // First 10GB free
    if (gb <= 10) return 0;
    // $0.026 per GB after that
    return (gb - 10) * 0.026;
  }
  
  calculateBandwidthCost(gb: number): number {
    // First 10GB/day (300GB/month) free
    if (gb <= 360) return 0;
    // $0.15 per GB after that
    return (gb - 360) * 0.15;
  }
  
  calculateComputeCost(_hours: number): number {
    // Hosting doesn't charge for compute, Cloud Functions does
    return 0;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.rewrites && config.rewrites.length > 1000) {
      errors.push('Cannot have more than 1000 URL rewrites');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Firebase Firestore Database Service
class FirestoreService extends AbstractService implements DatabaseService {
  supportedEngines: string[] = ['firestore', 'realtime-database'];
  
  constructor() {
    super('Firestore');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: [
        'us-central1', 'us-east1', 'us-west1', 'europe-west1', 
        'europe-west2', 'asia-east1', 'asia-northeast1', 'asia-southeast1'
      ],
      features: [
        'nosql-document-database',
        'real-time-sync',
        'offline-support',
        'acid-transactions',
        'automatic-scaling',
        'security-rules',
        'composite-indexes',
        'collection-groups',
        'sub-collections'
      ],
      limits: {
        storage: 1, // GB free tier
        reads: 50000, // per day free
        writes: 20000, // per day free
        deletes: 20000 // per day free
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const storageCost = this.calculateStorageCost(usage.storage || 0);
    const operationsCost = this.calculateOperationsCost(usage.requests || 0);
    
    return {
      amount: storageCost + operationsCost,
      currency: 'USD',
      breakdown: {
        storage: storageCost,
        operations: operationsCost
      }
    };
  }
  
  calculateStorageCost(gb: number): number {
    // First 1GB free
    if (gb <= 1) return 0;
    // $0.18 per GB/month after that
    return (gb - 1) * 0.18;
  }
  
  calculateOperationsCost(operations: number): number {
    // Assuming 60% reads, 30% writes, 10% deletes
    const reads = operations * 0.6;
    const writes = operations * 0.3;
    const deletes = operations * 0.1;
    
    let cost = 0;
    
    // Reads: First 50k/day free, then $0.06 per 100k
    const dailyReads = reads / 30; // Monthly to daily
    if (dailyReads > 50000) {
      cost += ((reads - 1500000) / 100000) * 0.06; // 1.5M monthly free
    }
    
    // Writes: First 20k/day free, then $0.18 per 100k
    const dailyWrites = writes / 30;
    if (dailyWrites > 20000) {
      cost += ((writes - 600000) / 100000) * 0.18;
    }
    
    // Deletes: First 20k/day free, then $0.02 per 100k
    const dailyDeletes = deletes / 30;
    if (dailyDeletes > 20000) {
      cost += ((deletes - 600000) / 100000) * 0.02;
    }
    
    return cost;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.region && !this.getCapabilities().regions.includes(config.region)) {
      errors.push(`Invalid region: ${config.region}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Firebase Cloud Storage Service
class FirebaseStorageService extends AbstractService implements StorageService {
  constructor() {
    super('Firebase Storage');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['us', 'eu', 'asia'],
      features: [
        'file-storage',
        'cdn-delivery',
        'automatic-scaling',
        'security-rules',
        'resumable-uploads',
        'file-metadata',
        'firebase-auth-integration',
        'cloud-functions-triggers'
      ],
      limits: {
        storage: 5, // GB free tier
        bandwidth: 1, // GB/day free
        operations: 20000 // per day free
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const storageCost = this.calculateStorageCost(usage.storage || 0);
    const bandwidthCost = this.calculateBandwidthCost(usage.bandwidth || 0);
    
    return {
      amount: storageCost + bandwidthCost,
      currency: 'USD',
      breakdown: {
        storage: storageCost,
        bandwidth: bandwidthCost
      }
    };
  }
  
  calculateStorageCost(gb: number): number {
    // First 5GB free
    if (gb <= 5) return 0;
    // $0.026 per GB/month after that
    return (gb - 5) * 0.026;
  }
  
  private calculateBandwidthCost(gb: number): number {
    // First 1GB/day (30GB/month) free
    if (gb <= 30) return 0;
    // $0.12 per GB after that
    return (gb - 30) * 0.12;
  }
  
  calculateOperationsCost(operations: number): number {
    // First 20k operations/day (600k/month) free
    if (operations <= 600000) return 0;
    // $0.05 per 10k operations after that
    return ((operations - 600000) / 10000) * 0.05;
  }
  
  validateConfiguration(_config: any): ValidationResult {
    return { valid: true };
  }
}

// Firebase Authentication Service
class FirebaseAuthService extends AbstractService implements AuthService {
  constructor() {
    super('Firebase Auth');
  }
  
  getCapabilities(): ServiceCapabilities {
    return {
      scalable: true,
      regions: ['global'],
      features: [
        'email-password',
        'phone-auth',
        'google-signin',
        'facebook-login',
        'twitter-login',
        'github-login',
        'apple-signin',
        'anonymous-auth',
        'custom-tokens',
        'multi-factor-auth'
      ],
      limits: {
        users: 10000, // free tier MAU
        phone_verifications: 10000 // per month free
      }
    };
  }
  
  calculateCost(usage: Usage): Cost {
    const userCost = this.calculateUserCost(usage.users || 0);
    
    return {
      amount: userCost,
      currency: 'USD',
      breakdown: {
        users: userCost
      }
    };
  }
  
  calculateUserCost(users: number): number {
    // First 10k MAU free
    if (users <= 10000) return 0;
    // $0.06 per MAU for 10k-100k
    if (users <= 100000) {
      return (users - 10000) * 0.06;
    }
    // $0.045 per MAU for 100k-1M
    const first90k = 90000 * 0.06;
    if (users <= 1000000) {
      return first90k + (users - 100000) * 0.045;
    }
    // $0.03 per MAU above 1M
    const first900k = first90k + 900000 * 0.045;
    return first900k + (users - 1000000) * 0.03;
  }
  
  calculateAuthenticationCost(authentications: number): number {
    // Phone auth: $0.06 per verification after 10k/month
    if (authentications <= 10000) return 0;
    return (authentications - 10000) * 0.06;
  }
  
  validateConfiguration(_config: any): ValidationResult {
    return { valid: true };
  }
}

// Firebase Data Loader
class FirebaseDataLoader implements DataLoader {
  private dataLoader: DataLoaderImpl;
  
  constructor() {
    this.dataLoader = new DataLoaderImpl();
  }
  
  async loadProviderData(provider: string): Promise<PricingData> {
    return this.dataLoader.loadProviderData(provider);
  }
  
  async loadBaseData(provider: string): Promise<PricingData> {
    return this.dataLoader.loadBaseData(provider);
  }
  
  async loadGlobalOverrides(): Promise<Override[]> {
    return this.dataLoader.loadGlobalOverrides();
  }
  
  async loadProviderOverrides(provider: string): Promise<Override[]> {
    return this.dataLoader.loadProviderOverrides(provider);
  }
  
  async loadLocalOverrides(provider: string): Promise<Override[]> {
    return this.dataLoader.loadLocalOverrides(provider);
  }
}

// Firebase Price Calculator
class FirebasePriceCalculator implements PriceCalculator {
  calculateCost(usage: Usage, pricing: PricingData): CostBreakdown {
    const serviceCosts: Record<string, number> = {};
    
    // Hosting costs
    if (usage.storage) {
      if (usage.storage > 10) {
        serviceCosts.hostingStorage = (usage.storage - 10) * 0.026;
      }
    }
    
    if (usage.bandwidth) {
      if (usage.bandwidth > 360) {
        serviceCosts.hostingBandwidth = (usage.bandwidth - 360) * 0.15;
      }
    }
    
    // Firestore costs
    const dbStorage = usage.storage || 0;
    if (dbStorage > 1) {
      serviceCosts.firestoreStorage = (dbStorage - 1) * 0.18;
    }
    
    if (usage.requests) {
      const reads = usage.requests * 0.6;
      const writes = usage.requests * 0.3;
      
      if (reads > 1500000) { // 50k/day * 30
        serviceCosts.firestoreReads = ((reads - 1500000) / 100000) * 0.06;
      }
      if (writes > 600000) { // 20k/day * 30
        serviceCosts.firestoreWrites = ((writes - 600000) / 100000) * 0.18;
      }
    }
    
    // Auth costs
    if (usage.users && usage.users > 10000) {
      if (usage.users <= 100000) {
        serviceCosts.auth = (usage.users - 10000) * 0.06;
      } else {
        serviceCosts.auth = 5400 + (usage.users - 100000) * 0.045;
      }
    }
    
    const totalCost = Object.values(serviceCosts).reduce((sum, cost) => sum + cost, 0);
    
    return {
      baseCost: 0, // Spark plan is free, Blaze is pay-as-you-go
      serviceCosts,
      totalCost,
      currency: pricing.currency || 'USD',
      period: usage.period || 'monthly',
      details: [
        'Spark plan: Generous free tier',
        'Blaze plan: Pay only for what you use',
        'Hosting: 10GB storage, 360GB bandwidth free',
        'Firestore: 1GB storage, 50k reads/day free',
        'Auth: 10k MAU free'
      ]
    };
  }
  
  calculateMonthlyEstimate(usage: Usage, pricing: PricingData): number {
    const breakdown = this.calculateCost({ ...usage, period: 'monthly' }, pricing);
    return breakdown.totalCost;
  }
  
  calculateYearlyEstimate(usage: Usage, pricing: PricingData): number {
    const monthly = this.calculateMonthlyEstimate(usage, pricing);
    return monthly * 12;
  }
}

// Firebase Validator
class FirebaseValidator implements ProviderValidator {
  validate(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.projectId) {
      errors.push('Firebase project ID is required');
    }
    
    if (config.plan && !['spark', 'blaze'].includes(config.plan)) {
      errors.push('Invalid plan: must be spark or blaze');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  validatePricing(pricing: any): ValidationResult {
    const errors: string[] = [];
    
    if (!pricing.services || pricing.services.length === 0) {
      errors.push('No service pricing defined');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Main Firebase Provider
export class FirebaseProvider implements Provider {
  name = 'firebase';
  version = '1.0.0';
  
  services: ProviderServices = {
    hosting: new FirebaseHostingService(),
    database: new FirestoreService(),
    storage: new FirebaseStorageService(),
    auth: new FirebaseAuthService()
  };
  
  dataLoader = new FirebaseDataLoader();
  priceCalculator = new FirebasePriceCalculator();
  validator = new FirebaseValidator();
  
  metadata: ProviderMetadata = {
    name: 'Firebase',
    website: 'https://firebase.google.com',
    regions: ['global'],
    supportedFrameworks: ['React', 'Vue', 'Angular', 'Next.js', 'Flutter', 'iOS', 'Android'],
    pricingUrl: 'https://firebase.google.com/pricing',
    description: 'Google\'s Backend-as-a-Service platform with hosting, database, auth, and more'
  };
  
  async initialize(): Promise<void> {
    console.log(`Initializing ${this.name} provider v${this.version}`);
  }
  
  meetsRequirements(requirements: Requirements): boolean {
    if (requirements.regions) {
      return true; // Global coverage
    }
    
    if (requirements.scalability === 'high') {
      return true; // Automatic scaling
    }
    
    if (requirements.features) {
      const availableFeatures = [
        'hosting',
        'nosql-database',
        'realtime-sync',
        'authentication',
        'storage',
        'serverless-functions',
        'analytics'
      ];
      
      return requirements.features.every(f => availableFeatures.includes(f));
    }
    
    return true;
  }
}

// Export default instance
export default new FirebaseProvider();