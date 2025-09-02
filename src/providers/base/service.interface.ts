import type { 
  BaseService, 
  HostingService, 
  DatabaseService, 
  CacheService, 
  CDNService, 
  AuthService, 
  MonitoringService,
  FunctionsService,
  StorageService,
  ServiceCapabilities,
  Usage,
  Cost,
  ValidationResult
} from './provider.interface';

// Re-export service interfaces for easier imports
export type {
  BaseService,
  HostingService,
  DatabaseService,
  CacheService,
  CDNService,
  AuthService,
  MonitoringService,
  FunctionsService,
  StorageService
};

// Abstract base service implementation
export abstract class AbstractService implements BaseService {
  protected name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  getName(): string {
    return this.name;
  }
  
  abstract getCapabilities(): ServiceCapabilities;
  abstract calculateCost(usage: Usage): Cost;
  abstract validateConfiguration(config: any): ValidationResult;
}