import type { PricingData, Override } from '../../providers/base/provider.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface Snapshot {
  provider: string;
  timestamp: string;
  data: PricingData;
  reason?: string;
}

export class DataStorage {
  private dataPath: string;
  
  constructor(basePath?: string) {
    this.dataPath = basePath || path.join(process.cwd(), 'data');
  }
  
  /**
   * Load provider pricing data
   */
  async loadProviderData(provider: string): Promise<PricingData> {
    const filePath = path.join(this.dataPath, 'providers', `${provider}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // Return default pricing data if file doesn't exist
      return {
        provider,
        lastUpdated: new Date().toISOString(),
        tiers: [],
        services: [],
        billingPeriod: 'monthly',
        currency: 'USD'
      };
    }
  }
  
  /**
   * Update provider pricing data
   */
  async updateProviderData(provider: string, data: PricingData): Promise<void> {
    const dir = path.join(this.dataPath, 'providers');
    const filePath = path.join(dir, `${provider}.json`);
    
    // Ensure directory exists
    await this.ensureDirectory(dir);
    
    // Write data
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }
  
  /**
   * Create a snapshot of current data
   */
  async createSnapshot(provider: string, data: PricingData, reason?: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path.join(this.dataPath, 'snapshots', provider);
    const filename = `${timestamp}.json`;
    const filePath = path.join(dir, filename);
    
    // Ensure directory exists
    await this.ensureDirectory(dir);
    
    // Create snapshot
    const snapshot: Snapshot = {
      provider,
      timestamp: new Date().toISOString(),
      data,
      reason
    };
    
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2));
  }
  
  /**
   * Get all snapshots for a provider
   */
  async getSnapshots(provider: string): Promise<Snapshot[]> {
    const dir = path.join(this.dataPath, 'snapshots', provider);
    const snapshots: Snapshot[] = [];
    
    try {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(dir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          snapshots.push(JSON.parse(content));
        }
      }
      
      // Sort by timestamp descending
      snapshots.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
    } catch (error) {
      // Directory might not exist
    }
    
    return snapshots;
  }
  
  /**
   * Load global overrides
   */
  async loadGlobalOverrides(): Promise<Override[]> {
    const filePath = path.join(this.dataPath, 'overrides', 'global.json');
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Load provider-specific overrides
   */
  async loadProviderOverrides(provider: string): Promise<Override[]> {
    const filePath = path.join(this.dataPath, 'overrides', `${provider}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Load local overrides
   */
  async loadLocalOverrides(provider: string): Promise<Override[]> {
    const filePath = path.join(this.dataPath, 'overrides', 'local', `${provider}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Save override
   */
  async saveOverride(
    type: 'global' | 'provider' | 'local',
    provider: string | null,
    override: Override
  ): Promise<void> {
    let dir: string;
    let filename: string;
    
    switch (type) {
      case 'global':
        dir = path.join(this.dataPath, 'overrides');
        filename = 'global.json';
        break;
      case 'provider':
        if (!provider) throw new Error('Provider name required');
        dir = path.join(this.dataPath, 'overrides');
        filename = `${provider}.json`;
        break;
      case 'local':
        if (!provider) throw new Error('Provider name required');
        dir = path.join(this.dataPath, 'overrides', 'local');
        filename = `${provider}.json`;
        break;
    }
    
    const filePath = path.join(dir, filename);
    await this.ensureDirectory(dir);
    
    // Load existing overrides
    let overrides: Override[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      overrides = JSON.parse(content);
    } catch (error) {
      // File doesn't exist yet
    }
    
    // Add or update override
    const index = overrides.findIndex(o => o.path === override.path);
    if (index >= 0) {
      overrides[index] = override;
    } else {
      overrides.push(override);
    }
    
    // Save
    await fs.writeFile(filePath, JSON.stringify(overrides, null, 2));
  }
  
  /**
   * Get cache data
   */
  async getCachedData(): Promise<Map<string, PricingData>> {
    const cacheFile = path.join(this.dataPath, 'cache', 'combined.json');
    const cache = new Map<string, PricingData>();
    
    try {
      const content = await fs.readFile(cacheFile, 'utf-8');
      const data = JSON.parse(content);
      
      for (const [provider, pricing] of Object.entries(data)) {
        cache.set(provider, pricing as PricingData);
      }
    } catch (error) {
      // Cache doesn't exist
    }
    
    return cache;
  }
  
  /**
   * Update cache
   */
  async updateCache(data: Map<string, PricingData>): Promise<void> {
    const dir = path.join(this.dataPath, 'cache');
    const filePath = path.join(dir, 'combined.json');
    
    await this.ensureDirectory(dir);
    
    const obj: Record<string, PricingData> = {};
    for (const [provider, pricing] of data) {
      obj[provider] = pricing;
    }
    
    await fs.writeFile(filePath, JSON.stringify(obj, null, 2));
  }
  
  /**
   * Clean old snapshots
   */
  async cleanSnapshots(provider: string, keepCount: number = 10): Promise<number> {
    const snapshots = await this.getSnapshots(provider);
    let deleted = 0;
    
    if (snapshots.length > keepCount) {
      const toDelete = snapshots.slice(keepCount);
      const dir = path.join(this.dataPath, 'snapshots', provider);
      
      for (const snapshot of toDelete) {
        const timestamp = snapshot.timestamp.replace(/[:.]/g, '-');
        const filePath = path.join(dir, `${timestamp}.json`);
        
        try {
          await fs.unlink(filePath);
          deleted++;
        } catch (error) {
          // File might already be deleted
        }
      }
    }
    
    return deleted;
  }
  
  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}