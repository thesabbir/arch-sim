import { Provider, Requirements } from '../providers/base/provider.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ProviderInfo {
  name: string;
  version: string;
  services: string[];
  metadata?: any;
}

export class ProviderRegistry {
  private providers: Map<string, Provider> = new Map();
  private initialized: boolean = false;
  
  constructor(private config?: RegistryConfig) {
    this.config = config || {
      autoload: true,
      directory: path.join(__dirname, '../providers/implementations')
    };
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (this.config?.autoload) {
      await this.autoloadProviders();
    }
    
    this.initialized = true;
  }
  
  register(provider: Provider): void {
    this.validateProvider(provider);
    this.providers.set(provider.name, provider);
    console.log(`✓ Registered provider: ${provider.name} v${provider.version}`);
  }
  
  unregister(name: string): boolean {
    const result = this.providers.delete(name);
    if (result) {
      console.log(`✓ Unregistered provider: ${name}`);
    }
    return result;
  }
  
  getProvider(name: string): Provider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found. Available providers: ${this.listProviderNames().join(', ')}`);
    }
    return provider;
  }
  
  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }
  
  listProviders(): ProviderInfo[] {
    return Array.from(this.providers.values()).map(p => ({
      name: p.name,
      version: p.version,
      services: Object.keys(p.services).filter(s => p.services[s as keyof typeof p.services]),
      metadata: p.metadata
    }));
  }
  
  listProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }
  
  getAllProviders(): Provider[] {
    return Array.from(this.providers.values());
  }
  
  findProvidersByService(service: string): Provider[] {
    return Array.from(this.providers.values()).filter(p => 
      p.services[service as keyof typeof p.services] !== undefined
    );
  }
  
  findProvidersByRequirements(requirements: Requirements): Provider[] {
    return Array.from(this.providers.values()).filter(p => {
      if (p.meetsRequirements) {
        return p.meetsRequirements(requirements);
      }
      return this.defaultRequirementsCheck(p, requirements);
    });
  }
  
  private validateProvider(provider: Provider): void {
    if (!provider.name) {
      throw new Error('Provider must have a name');
    }
    if (!provider.version) {
      throw new Error('Provider must have a version');
    }
    if (!provider.services) {
      throw new Error('Provider must have services');
    }
    if (!provider.dataLoader) {
      throw new Error('Provider must have a dataLoader');
    }
    if (!provider.priceCalculator) {
      throw new Error('Provider must have a priceCalculator');
    }
    if (!provider.metadata) {
      throw new Error('Provider must have metadata');
    }
    
    // Check for duplicate registration
    if (this.providers.has(provider.name)) {
      throw new Error(`Provider '${provider.name}' is already registered`);
    }
  }
  
  private defaultRequirementsCheck(provider: Provider, requirements: Requirements): boolean {
    // Basic requirements checking when provider doesn't implement custom logic
    if (requirements.regions && requirements.regions.length > 0) {
      const providerRegions = provider.metadata.regions || [];
      const hasRegion = requirements.regions.some(r => 
        providerRegions.includes(r) || providerRegions.includes('global')
      );
      if (!hasRegion) return false;
    }
    
    if (requirements.features && requirements.features.length > 0) {
      const providerFeatures = this.getProviderFeatures(provider);
      const hasAllFeatures = requirements.features.every(f => 
        providerFeatures.includes(f)
      );
      if (!hasAllFeatures) return false;
    }
    
    return true;
  }
  
  private getProviderFeatures(provider: Provider): string[] {
    const features: string[] = [];
    
    // Collect features from all services
    Object.values(provider.services).forEach(service => {
      if (service) {
        const capabilities = service.getCapabilities();
        if (capabilities.features) {
          features.push(...capabilities.features);
        }
      }
    });
    
    return [...new Set(features)]; // Remove duplicates
  }
  
  private async autoloadProviders(): Promise<void> {
    if (!this.config?.directory) return;
    
    try {
      const providerDirs = await fs.readdir(this.config.directory);
      
      for (const dir of providerDirs) {
        const providerPath = path.join(this.config.directory, dir);
        const stat = await fs.stat(providerPath);
        
        if (stat.isDirectory()) {
          await this.loadProvider(providerPath, dir);
        }
      }
    } catch (error) {
      console.warn(`Failed to autoload providers from ${this.config.directory}:`, error);
    }
  }
  
  private async loadProvider(providerPath: string, name: string): Promise<void> {
    try {
      const indexPath = path.join(providerPath, 'index.ts');
      const jsPath = path.join(providerPath, 'index.js');
      
      // Check if provider module exists
      const moduleExists = await this.fileExists(indexPath) || await this.fileExists(jsPath);
      if (!moduleExists) {
        console.warn(`No index file found for provider ${name}`);
        return;
      }
      
      // Dynamic import
      const module = await import(providerPath);
      
      if (module.default && this.isProvider(module.default)) {
        const provider = module.default;
        if (provider.initialize) {
          await provider.initialize();
        }
        this.register(provider);
      } else if (module.Provider && this.isProvider(module.Provider)) {
        const ProviderClass = module.Provider;
        const provider = new ProviderClass();
        if (provider.initialize) {
          await provider.initialize();
        }
        this.register(provider);
      }
    } catch (error) {
      console.warn(`Failed to load provider ${name}:`, error);
    }
  }
  
  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
  
  private isProvider(obj: any): obj is Provider {
    return obj && 
           typeof obj.name === 'string' &&
           typeof obj.version === 'string' &&
           obj.services &&
           obj.dataLoader &&
           obj.priceCalculator &&
           obj.metadata;
  }
  
  // Utility methods for provider management
  async reloadProvider(name: string): Promise<void> {
    if (this.providers.has(name)) {
      this.providers.delete(name);
    }
    
    if (this.config?.directory) {
      const providerPath = path.join(this.config.directory, name);
      await this.loadProvider(providerPath, name);
    }
  }
  
  getProviderCount(): number {
    return this.providers.size;
  }
  
  clear(): void {
    this.providers.clear();
    this.initialized = false;
  }
}

export interface RegistryConfig {
  autoload?: boolean;
  directory?: string;
  validateOnRegister?: boolean;
}

// Singleton instance for global access
let registryInstance: ProviderRegistry | null = null;

export function getRegistry(config?: RegistryConfig): ProviderRegistry {
  if (!registryInstance) {
    registryInstance = new ProviderRegistry(config);
  }
  return registryInstance;
}

export function resetRegistry(): void {
  if (registryInstance) {
    registryInstance.clear();
    registryInstance = null;
  }
}