import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

export interface Config {
  ai: {
    model: string;
    apiKey?: string;
    endpoint?: string;  // For Ollama or custom endpoints
  };
  storage: {
    dataPath: string;
    cacheTTL: number;
  };
  providers: string[];
}

export class ConfigLoader {
  private readonly configPaths = [
    path.join(os.homedir(), '.asconfig.yaml'),
    path.join(process.cwd(), 'asconfig.yaml')
  ];
  
  private config: Config | null = null;
  
  async loadConfig(): Promise<Config> {
    // Start with default config
    let config = this.getDefaultConfig();
    
    // Load and merge config files
    for (const configPath of this.configPaths) {
      if (await this.fileExists(configPath)) {
        try {
          const fileConfig = await this.loadYamlFile(configPath);
          config = { ...config, ...fileConfig };
          console.log(`✓ Loaded config from ${configPath}`);
        } catch (error) {
          console.warn(`Failed to load config from ${configPath}:`, error);
        }
      }
    }
    
    // Apply environment variable overrides
    config = this.applyEnvOverrides(config);
    
    this.config = config;
    return config;
  }
  
  getConfig(): Config {
    if (!this.config) {
      throw new Error('Config not loaded. Call loadConfig() first.');
    }
    return this.config;
  }
  
  private getDefaultConfig(): Config {
    return {
      ai: {
        model: 'gpt-3.5-turbo',
        apiKey: '',
        endpoint: undefined
      },
      storage: {
        dataPath: './data',
        cacheTTL: 3600
      },
      providers: ['vercel', 'netlify', 'aws', 'railway', 'render']
    };
  }
  
  private applyEnvOverrides(config: Config): Config {
    // Model override
    if (process.env.AI_MODEL) {
      config.ai.model = process.env.AI_MODEL;
    }
    
    // API key override based on model provider
    const model = config.ai.model.toLowerCase();
    
    if (model.includes('gpt') || model.includes('turbo')) {
      config.ai.apiKey = process.env.OPENAI_API_KEY || config.ai.apiKey;
    } else if (model.includes('claude')) {
      config.ai.apiKey = process.env.ANTHROPIC_API_KEY || config.ai.apiKey;
    } else if (model.includes('gemini')) {
      config.ai.apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || config.ai.apiKey;
    } else if (model.includes('mistral')) {
      config.ai.apiKey = process.env.MISTRAL_API_KEY || config.ai.apiKey;
    } else if (model.includes('llama') || model.includes('mixtral')) {
      // Ollama models
      config.ai.endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    }
    
    // Generic API key override
    if (process.env.AI_API_KEY) {
      config.ai.apiKey = process.env.AI_API_KEY;
    }
    
    // Storage path override
    if (process.env.DATA_PATH) {
      config.storage.dataPath = process.env.DATA_PATH;
    }
    
    return config;
  }
  
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  private async loadYamlFile(filePath: string): Promise<any> {
    const content = await fs.readFile(filePath, 'utf-8');
    return yaml.load(content);
  }
}

// Singleton instance
let configLoader: ConfigLoader | null = null;

export function getConfigLoader(): ConfigLoader {
  if (!configLoader) {
    configLoader = new ConfigLoader();
  }
  return configLoader;
}

export function resetConfigLoader(): void {
  configLoader = null;
}