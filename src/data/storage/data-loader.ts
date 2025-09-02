import * as fs from 'fs/promises';
import * as path from 'path';
import { PricingData, Override } from '../../providers/base/provider.interface';

export interface DataLoaderConfig {
  basePath?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  overridePriority?: string[];
}

export class DataLoader {
  private basePath: string;
  private cache: Map<string, CachedData> = new Map();
  private config: DataLoaderConfig;
  
  constructor(config?: DataLoaderConfig) {
    this.config = config || {};
    this.basePath = config?.basePath || path.join(process.cwd(), 'data');
  }
  
  async loadProviderData(provider: string): Promise<PricingData> {
    const cacheKey = `provider:${provider}`;
    
    // Check cache first
    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < (this.config.cacheTTL || 3600) * 1000) {
        return cached.data as PricingData;
      }
    }
    
    // Load base pricing
    const base = await this.loadBaseData(provider);
    
    // Load and apply overrides in order
    const global = await this.loadGlobalOverrides();
    const providerOverrides = await this.loadProviderOverrides(provider);
    const local = await this.loadLocalOverrides(provider);
    
    // Merge with priority: local > provider > global > base
    const merged = this.mergeData(base, global, providerOverrides, local);
    
    // Update cache
    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, {
        data: merged,
        timestamp: Date.now()
      });
    }
    
    return merged;
  }
  
  async loadBaseData(provider: string): Promise<PricingData> {
    const filePath = path.join(this.basePath, 'providers', `${provider}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // Try to load from default data
      const defaultPath = path.join(this.basePath, 'defaults', `${provider}.json`);
      try {
        const content = await fs.readFile(defaultPath, 'utf-8');
        return JSON.parse(content);
      } catch {
        throw new Error(`No pricing data found for provider: ${provider}`);
      }
    }
  }
  
  async loadGlobalOverrides(): Promise<Override[]> {
    const filePath = path.join(this.basePath, 'overrides', 'global.json');
    return this.loadOverrideFile(filePath);
  }
  
  async loadProviderOverrides(provider: string): Promise<Override[]> {
    const filePath = path.join(this.basePath, 'overrides', `${provider}.json`);
    return this.loadOverrideFile(filePath);
  }
  
  async loadLocalOverrides(provider: string): Promise<Override[]> {
    const overrides: Override[] = [];
    
    // Load from local directory
    const localPath = path.join(this.basePath, 'overrides', 'local', `${provider}.json`);
    const localOverrides = await this.loadOverrideFile(localPath);
    overrides.push(...localOverrides);
    
    // Load from user-specific overrides
    const userPath = path.join(this.basePath, 'overrides', 'local', 'user.json');
    const userOverrides = await this.loadOverrideFile(userPath);
    overrides.push(...userOverrides);
    
    return overrides;
  }
  
  private async loadOverrideFile(filePath: string): Promise<Override[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      return data.overrides || [];
    } catch {
      return [];
    }
  }
  
  private mergeData(base: PricingData, ...overrideSets: Override[][]): PricingData {
    let result = JSON.parse(JSON.stringify(base)); // Deep clone
    
    // Apply each set of overrides
    for (const overrides of overrideSets) {
      for (const override of overrides) {
        result = this.applyOverride(result, override);
      }
    }
    
    return result;
  }
  
  private applyOverride(data: PricingData, override: Override): PricingData {
    const paths = override.path.split('.');
    let current: any = data;
    
    // Navigate to the parent of the target
    for (let i = 0; i < paths.length - 1; i++) {
      const path = paths[i];
      if (!path) continue;
      
      // Handle array indices
      if (path.includes('[')) {
        const parts = path.split('[');
        const prop = parts[0];
        const indexStr = parts[1];
        if (!prop || !indexStr) continue;
        const index = parseInt(indexStr.replace(']', ''));
        
        if (!current[prop]) {
          current[prop] = [];
        }
        if (!current[prop][index]) {
          current[prop][index] = {};
        }
        current = current[prop][index];
      } else {
        if (!current[path]) {
          current[path] = {};
        }
        current = current[path];
      }
    }
    
    // Apply the override
    const lastPath = paths[paths.length - 1];
    if (lastPath && lastPath.includes('[')) {
      const parts = lastPath.split('[');
      const prop = parts[0];
      const indexStr = parts[1];
      if (prop && indexStr) {
        const index = parseInt(indexStr.replace(']', ''));
        if (!current[prop]) {
          current[prop] = [];
        }
        current[prop][index] = override.value;
      }
    } else if (lastPath) {
      current[lastPath] = override.value;
    }
    
    return data;
  }
  
  // Save methods for updating data
  async saveProviderData(provider: string, data: PricingData): Promise<void> {
    const filePath = path.join(this.basePath, 'providers', `${provider}.json`);
    await this.ensureDirectory(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    
    // Clear cache for this provider
    this.cache.delete(`provider:${provider}`);
  }
  
  async saveOverride(override: Override, scope: 'global' | 'provider' | 'local', provider?: string): Promise<void> {
    let filePath: string;
    
    switch (scope) {
      case 'global':
        filePath = path.join(this.basePath, 'overrides', 'global.json');
        break;
      case 'provider':
        if (!provider) throw new Error('Provider name required for provider-scoped override');
        filePath = path.join(this.basePath, 'overrides', `${provider}.json`);
        break;
      case 'local':
        if (!provider) throw new Error('Provider name required for local override');
        filePath = path.join(this.basePath, 'overrides', 'local', `${provider}.json`);
        break;
      default:
        throw new Error(`Invalid scope: ${scope}`);
    }
    
    await this.ensureDirectory(path.dirname(filePath));
    
    // Load existing overrides
    let overrides: Override[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      overrides = data.overrides || [];
    } catch {
      // File doesn't exist yet
    }
    
    // Add or update override
    const existingIndex = overrides.findIndex(o => o.path === override.path);
    if (existingIndex >= 0) {
      overrides[existingIndex] = override;
    } else {
      overrides.push(override);
    }
    
    // Save back
    await fs.writeFile(filePath, JSON.stringify({ overrides }, null, 2));
    
    // Clear cache
    if (provider) {
      this.cache.delete(`provider:${provider}`);
    } else {
      this.cache.clear(); // Clear all cache for global overrides
    }
  }
  
  async removeOverride(overridePath: string, scope: 'global' | 'provider' | 'local', provider?: string): Promise<boolean> {
    let filePath: string;
    
    switch (scope) {
      case 'global':
        filePath = path.join(this.basePath, 'overrides', 'global.json');
        break;
      case 'provider':
        if (!provider) throw new Error('Provider name required for provider-scoped override');
        filePath = path.join(this.basePath, 'overrides', `${provider}.json`);
        break;
      case 'local':
        if (!provider) throw new Error('Provider name required for local override');
        filePath = path.join(this.basePath, 'overrides', 'local', `${provider}.json`);
        break;
      default:
        throw new Error(`Invalid scope: ${scope}`);
    }
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      const overrides = data.overrides || [];
      
      const newOverrides = overrides.filter((o: Override) => o.path !== overridePath);
      
      if (newOverrides.length === overrides.length) {
        return false; // Nothing was removed
      }
      
      await fs.writeFile(filePath, JSON.stringify({ overrides: newOverrides }, null, 2));
      
      // Clear cache
      if (provider) {
        this.cache.delete(`provider:${provider}`);
      } else {
        this.cache.clear();
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  async listOverrides(scope?: 'global' | 'provider' | 'local', provider?: string): Promise<Override[]> {
    const overrides: Override[] = [];
    
    if (!scope || scope === 'global') {
      overrides.push(...await this.loadGlobalOverrides());
    }
    
    if (provider && (!scope || scope === 'provider')) {
      overrides.push(...await this.loadProviderOverrides(provider));
    }
    
    if (provider && (!scope || scope === 'local')) {
      overrides.push(...await this.loadLocalOverrides(provider));
    }
    
    return overrides;
  }
  
  // Snapshot management
  async createSnapshot(provider: string, data: PricingData): Promise<string> {
    const datePart = new Date().toISOString().split('T')[0];
    if (!datePart) throw new Error('Invalid date');
    const snapshotDir = path.join(this.basePath, 'snapshots', datePart);
    const filePath = path.join(snapshotDir, `${provider}.json`);
    
    await this.ensureDirectory(snapshotDir);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    
    return filePath;
  }
  
  async loadSnapshot(provider: string, date: string): Promise<PricingData | null> {
    const filePath = path.join(this.basePath, 'snapshots', date, `${provider}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  
  async getDataAge(provider: string): Promise<number> {
    const filePath = path.join(this.basePath, 'providers', `${provider}.json`);
    
    try {
      const stats = await fs.stat(filePath);
      return Date.now() - stats.mtime.getTime();
    } catch {
      return Infinity;
    }
  }
  
  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // Directory already exists
    }
  }
  
  clearCache(): void {
    this.cache.clear();
  }
  
  getCacheSize(): number {
    return this.cache.size;
  }
}

interface CachedData {
  data: any;
  timestamp: number;
}

// Singleton instance
let dataLoaderInstance: DataLoader | null = null;

export function getDataLoader(config?: DataLoaderConfig): DataLoader {
  if (!dataLoaderInstance) {
    dataLoaderInstance = new DataLoader(config);
  }
  return dataLoaderInstance;
}

export function resetDataLoader(): void {
  if (dataLoaderInstance) {
    dataLoaderInstance.clearCache();
    dataLoaderInstance = null;
  }
}