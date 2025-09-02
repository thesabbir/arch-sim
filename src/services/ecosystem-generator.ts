import fs from 'fs/promises';
import path from 'path';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import { parseArgs } from 'util';
import { collectPricing } from './collect-pricing.js';

export class EcosystemGenerator {
  private ecosystem: any;

  constructor() {
    this.ecosystem = {
      platform_ecosystem: {
        version: '1.0.0',
        last_updated: new Date().toISOString().split('T')[0],
        languages: {
          backend: [],
          frontend: [],
        },
        frameworks: {},
        frontend_frameworks: {},
        hosting_platforms: {},
        databases: {},
        caching: {},
        cdn_services: [],
        monitoring: {},
        authentication: [],
        communication: {},
        storage: {},
        search: [],
        analytics: [],
      },
      performance_benchmarks: {
        languages: {},
        frameworks: {},
      },
      pricing: {
        hosting: {},
        databases: {},
      },
    };
  }

  private addLanguages(): void {
    console.log(chalk.blue('Adding programming languages...'));

    // Backend languages
    const backendLanguages = [
      {
        id: 'javascript',
        name: 'JavaScript',
        runtime: 'node.js',
        performance_tier: 'medium',
        memory_usage: 'medium',
      },
      {
        id: 'typescript',
        name: 'TypeScript',
        runtime: 'node.js',
        performance_tier: 'medium',
        memory_usage: 'medium',
      },
      {
        id: 'python',
        name: 'Python',
        runtime: 'python',
        performance_tier: 'medium',
        memory_usage: 'high',
      },
      {
        id: 'go',
        name: 'Go',
        runtime: 'go',
        performance_tier: 'high',
        memory_usage: 'low',
      },
      {
        id: 'rust',
        name: 'Rust',
        runtime: 'rust',
        performance_tier: 'very_high',
        memory_usage: 'very_low',
      },
      {
        id: 'java',
        name: 'Java',
        runtime: 'jvm',
        performance_tier: 'high',
        memory_usage: 'high',
      },
      {
        id: 'csharp',
        name: 'C#',
        runtime: 'dotnet',
        performance_tier: 'high',
        memory_usage: 'medium',
      },
      {
        id: 'php',
        name: 'PHP',
        runtime: 'php',
        performance_tier: 'medium',
        memory_usage: 'medium',
      },
      {
        id: 'ruby',
        name: 'Ruby',
        runtime: 'ruby',
        performance_tier: 'medium',
        memory_usage: 'medium',
      },
      {
        id: 'elixir',
        name: 'Elixir',
        runtime: 'beam',
        performance_tier: 'high',
        memory_usage: 'medium',
      },
    ];

    // Frontend languages
    const frontendLanguages = [
      { id: 'javascript', name: 'JavaScript', type: 'interpreted' },
      { id: 'typescript', name: 'TypeScript', type: 'compiled' },
      { id: 'dart', name: 'Dart', type: 'compiled' },
      { id: 'elm', name: 'Elm', type: 'compiled' },
    ];

    this.ecosystem.platform_ecosystem.languages.backend = backendLanguages;
    this.ecosystem.platform_ecosystem.languages.frontend = frontendLanguages;
  }

  private addFrameworks(): void {
    console.log(chalk.blue('Adding backend frameworks...'));

    this.ecosystem.platform_ecosystem.frameworks = {
      nodejs: [
        {
          id: 'express',
          name: 'Express.js',
          language: 'javascript',
          performance_tier: 'medium',
          complexity: 'low',
          learning_curve: 'easy',
        },
        {
          id: 'fastify',
          name: 'Fastify',
          language: 'javascript',
          performance_tier: 'high',
          complexity: 'low',
          learning_curve: 'easy',
        },
        {
          id: 'nestjs',
          name: 'NestJS',
          language: 'typescript',
          performance_tier: 'medium',
          complexity: 'high',
          learning_curve: 'steep',
        },
        {
          id: 'koa',
          name: 'Koa.js',
          language: 'javascript',
          performance_tier: 'medium',
          complexity: 'medium',
          learning_curve: 'medium',
        },
        {
          id: 'hapi',
          name: 'Hapi.js',
          language: 'javascript',
          performance_tier: 'medium',
          complexity: 'high',
          learning_curve: 'medium',
        },
        {
          id: 'adonis',
          name: 'AdonisJS',
          language: 'javascript',
          performance_tier: 'medium',
          complexity: 'high',
          learning_curve: 'medium',
        },
      ],
      python: [
        {
          id: 'fastapi',
          name: 'FastAPI',
          language: 'python',
          performance_tier: 'high',
          complexity: 'medium',
          learning_curve: 'easy',
        },
        {
          id: 'django',
          name: 'Django',
          language: 'python',
          performance_tier: 'medium',
          complexity: 'high',
          learning_curve: 'medium',
        },
        {
          id: 'flask',
          name: 'Flask',
          language: 'python',
          performance_tier: 'medium',
          complexity: 'low',
          learning_curve: 'easy',
        },
        {
          id: 'starlette',
          name: 'Starlette',
          language: 'python',
          performance_tier: 'high',
          complexity: 'low',
          learning_curve: 'medium',
        },
      ],
      go: [
        {
          id: 'gin',
          name: 'Gin',
          language: 'go',
          performance_tier: 'very_high',
          complexity: 'low',
          learning_curve: 'easy',
        },
        {
          id: 'echo',
          name: 'Echo',
          language: 'go',
          performance_tier: 'very_high',
          complexity: 'low',
          learning_curve: 'easy',
        },
        {
          id: 'fiber',
          name: 'Fiber',
          language: 'go',
          performance_tier: 'very_high',
          complexity: 'low',
          learning_curve: 'easy',
        },
      ],
      rust: [
        {
          id: 'axum',
          name: 'Axum',
          language: 'rust',
          performance_tier: 'very_high',
          complexity: 'medium',
          learning_curve: 'steep',
        },
        {
          id: 'actix_web',
          name: 'Actix Web',
          language: 'rust',
          performance_tier: 'very_high',
          complexity: 'medium',
          learning_curve: 'steep',
        },
      ],
    };
  }

  private addFrontendFrameworks(): void {
    console.log(chalk.blue('Adding frontend frameworks...'));

    this.ecosystem.platform_ecosystem.frontend_frameworks = {
      react: [
        {
          id: 'react',
          name: 'React',
          type: 'library',
          performance_tier: 'high',
          bundle_size: 'medium',
          learning_curve: 'medium',
        },
        {
          id: 'nextjs',
          name: 'Next.js',
          type: 'framework',
          performance_tier: 'high',
          bundle_size: 'medium',
          learning_curve: 'medium',
          features: ['ssr', 'ssg', 'api_routes'],
        },
        {
          id: 'gatsby',
          name: 'Gatsby',
          type: 'ssg',
          performance_tier: 'very_high',
          bundle_size: 'medium',
          learning_curve: 'medium',
        },
      ],
      vue: [
        {
          id: 'vue',
          name: 'Vue.js',
          type: 'framework',
          performance_tier: 'high',
          bundle_size: 'small',
          learning_curve: 'easy',
        },
        {
          id: 'nuxtjs',
          name: 'Nuxt.js',
          type: 'framework',
          performance_tier: 'high',
          bundle_size: 'medium',
          learning_curve: 'medium',
          features: ['ssr', 'ssg', 'spa'],
        },
      ],
      other: [
        {
          id: 'svelte',
          name: 'Svelte',
          type: 'compiler',
          performance_tier: 'very_high',
          bundle_size: 'very_small',
          learning_curve: 'easy',
        },
        {
          id: 'sveltekit',
          name: 'SvelteKit',
          type: 'framework',
          performance_tier: 'very_high',
          bundle_size: 'small',
          learning_curve: 'easy',
        },
        {
          id: 'angular',
          name: 'Angular',
          type: 'framework',
          performance_tier: 'high',
          bundle_size: 'large',
          learning_curve: 'steep',
        },
      ],
    };
  }

  private addHostingPlatforms(): void {
    console.log(chalk.blue('Adding hosting platforms...'));

    this.ecosystem.platform_ecosystem.hosting_platforms = {
      developer_first: [
        {
          id: 'vercel',
          name: 'Vercel',
          type: 'paas',
          supported_languages: ['javascript', 'typescript', 'python', 'go'],
          specialties: ['nextjs', 'static_sites', 'serverless'],
          pricing_model: 'usage_based',
          free_tier: true,
          performance_tier: 'high',
          global_cdn: true,
          auto_scaling: true,
        },
        {
          id: 'netlify',
          name: 'Netlify',
          type: 'paas',
          supported_languages: ['javascript', 'typescript', 'go'],
          specialties: ['jamstack', 'static_sites', 'serverless'],
          pricing_model: 'usage_based',
          free_tier: true,
          performance_tier: 'high',
          global_cdn: true,
          auto_scaling: true,
        },
        {
          id: 'render',
          name: 'Render',
          type: 'paas',
          supported_languages: ['javascript', 'python', 'go', 'rust', 'ruby', 'php'],
          specialties: ['full_stack', 'databases', 'static_sites'],
          pricing_model: 'instance_based',
          free_tier: true,
          performance_tier: 'medium',
          auto_scaling: true,
        },
        {
          id: 'railway',
          name: 'Railway',
          type: 'paas',
          supported_languages: ['javascript', 'python', 'go', 'rust', 'java', 'php'],
          specialties: ['git_based', 'databases', 'full_stack'],
          pricing_model: 'usage_based',
          free_tier: true,
          performance_tier: 'medium',
          auto_scaling: true,
        },
        {
          id: 'flyio',
          name: 'Fly.io',
          type: 'paas',
          supported_languages: ['javascript', 'python', 'go', 'rust', 'elixir', 'ruby'],
          specialties: ['edge_deployment', 'global_distribution'],
          pricing_model: 'usage_based',
          free_tier: true,
          performance_tier: 'high',
          global_deployment: true,
          auto_scaling: true,
        },
      ],
      big_cloud_dx: [
        {
          id: 'aws_app_runner',
          name: 'AWS App Runner',
          type: 'paas',
          supported_languages: ['javascript', 'python', 'go', 'java', 'ruby'],
          specialties: ['containers', 'auto_scaling'],
          pricing_model: 'usage_based',
          free_tier: false,
          performance_tier: 'high',
          auto_scaling: true,
        },
        {
          id: 'firebase',
          name: 'Firebase',
          type: 'baas',
          supported_languages: ['javascript', 'typescript', 'dart'],
          specialties: ['real_time', 'auth', 'database'],
          pricing_model: 'usage_based',
          free_tier: true,
          performance_tier: 'high',
          auto_scaling: true,
        },
      ],
    };
  }

  private addDatabases(): void {
    console.log(chalk.blue('Adding database services...'));

    this.ecosystem.platform_ecosystem.databases = {
      sql: [
        {
          id: 'neon',
          name: 'Neon',
          type: 'postgresql',
          pricing_model: 'usage_based',
          features: ['serverless', 'branching', 'auto_scaling'],
          free_tier: true,
          performance_tier: 'high',
          global_availability: true,
        },
        {
          id: 'planetscale',
          name: 'PlanetScale',
          type: 'mysql',
          pricing_model: 'usage_based',
          features: ['serverless', 'branching', 'schema_changes'],
          free_tier: true,
          performance_tier: 'high',
          global_availability: true,
        },
        {
          id: 'supabase',
          name: 'Supabase',
          type: 'postgresql',
          pricing_model: 'usage_based',
          features: ['real_time', 'auth', 'storage', 'edge_functions'],
          free_tier: true,
          performance_tier: 'high',
          additional_services: ['auth', 'storage', 'functions'],
        },
      ],
      nosql: [
        {
          id: 'mongodb_atlas',
          name: 'MongoDB Atlas',
          type: 'document',
          pricing_model: 'instance_based',
          features: ['managed', 'global_clusters', 'search'],
          free_tier: true,
          performance_tier: 'high',
          global_availability: true,
        },
        {
          id: 'fauna',
          name: 'Fauna',
          type: 'document',
          pricing_model: 'usage_based',
          features: ['serverless', 'acid_transactions', 'global'],
          free_tier: true,
          performance_tier: 'high',
          global_availability: true,
        },
      ],
    };
  }

  private addCaching(): void {
    console.log(chalk.blue('Adding caching services...'));

    this.ecosystem.platform_ecosystem.caching = {
      redis: [
        {
          id: 'upstash_redis',
          name: 'Upstash Redis',
          type: 'redis',
          pricing_model: 'per_request',
          features: ['serverless', 'global_replication', 'rest_api'],
          free_tier: true,
          performance_tier: 'high',
          global_availability: true,
        },
        {
          id: 'redis_cloud',
          name: 'Redis Cloud',
          type: 'redis',
          pricing_model: 'instance_based',
          features: ['managed', 'modules', 'clustering'],
          free_tier: true,
          performance_tier: 'very_high',
          global_availability: true,
        },
      ],
    };
  }

  private addMonitoring(): void {
    console.log(chalk.blue('Adding monitoring services...'));

    this.ecosystem.platform_ecosystem.monitoring = {
      error_tracking: [
        {
          id: 'sentry',
          name: 'Sentry',
          type: 'error_tracking',
          features: ['performance_monitoring', 'release_tracking', 'alerts'],
          pricing_model: 'event_based',
          free_tier: true,
          supported_languages: ['javascript', 'python', 'go', 'java', 'rust', 'php'],
        },
        {
          id: 'rollbar',
          name: 'Rollbar',
          type: 'error_tracking',
          features: ['real_time_errors', 'deploy_tracking', 'rql'],
          pricing_model: 'event_based',
          free_tier: true,
          supported_languages: ['javascript', 'python', 'go', 'java', 'ruby', 'php'],
        },
      ],
      uptime: [
        {
          id: 'uptimerobot',
          name: 'UptimeRobot',
          type: 'uptime_monitoring',
          features: ['website_monitoring', 'keyword_monitoring', 'status_pages'],
          pricing_model: 'tiered',
          free_tier: true,
          check_locations: '10+',
        },
      ],
    };
  }

  private addAuthentication(): void {
    console.log(chalk.blue('Adding authentication services...'));

    this.ecosystem.platform_ecosystem.authentication = [
      {
        id: 'clerk',
        name: 'Clerk',
        type: 'auth_platform',
        features: ['user_management', 'social_logins', 'webhooks'],
        pricing_model: 'mau_based',
        free_tier: true,
        supported_frameworks: ['react', 'nextjs', 'vue', 'svelte'],
      },
      {
        id: 'auth0',
        name: 'Auth0',
        type: 'identity_platform',
        features: ['sso', 'mfa', 'user_management', 'rules'],
        pricing_model: 'mau_based',
        free_tier: true,
        enterprise_features: true,
      },
    ];
  }

  async addPricing() {
    try {
      console.log(chalk.blue('Adding pricing information...'));
      const pricing = await collectPricing();
      this.ecosystem.pricing = pricing;
      console.log(chalk.green('✓ Added pricing information'));
    } catch (error) {
      console.log(chalk.red(`Error adding pricing information: ${(error as Error).message}`));
      this.ecosystem.pricing = {};
    }
  }

  private addPerformanceBenchmarks(): void {
    console.log(chalk.blue('Adding performance benchmarks...'));

    this.ecosystem.performance_benchmarks = {
      languages: {
        javascript: {
          requests_per_second: 15000,
          memory_usage_mb: 50,
          cold_start_ms: 100,
        },
        typescript: {
          requests_per_second: 15000,
          memory_usage_mb: 50,
          cold_start_ms: 100,
        },
        python: {
          requests_per_second: 8000,
          memory_usage_mb: 80,
          cold_start_ms: 200,
        },
        go: {
          requests_per_second: 45000,
          memory_usage_mb: 25,
          cold_start_ms: 50,
        },
        rust: {
          requests_per_second: 55000,
          memory_usage_mb: 20,
          cold_start_ms: 30,
        },
      },
      frameworks: {
        fastify: { requests_per_second: 18000, overhead_factor: 1.2 },
        express: { requests_per_second: 12000, overhead_factor: 1.8 },
        fastapi: { requests_per_second: 12000, overhead_factor: 1.5 },
        gin: { requests_per_second: 50000, overhead_factor: 1.1 },
      },
    };
  }

  async generateEcosystemFile(filename: string): Promise<void> {
    console.log(chalk.bold.blue('🚀 Generating Platform Ecosystem File\n'));

    // Add all components
    this.addLanguages();
    this.addFrameworks();
    this.addFrontendFrameworks();
    this.addHostingPlatforms();
    this.addDatabases();
    this.addCaching();
    this.addMonitoring();
    this.addAuthentication();
    this.addPerformanceBenchmarks();
    await this.addPricing();

    // Generate YAML
    const yamlContent = yaml.dump(this.ecosystem, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });

    // Add header comment
    const header = `# Generated Platform Ecosystem for Architecture Simulator
# Generated on: ${new Date().toISOString()}
# 
# This file contains all supported platforms, services, languages, and frameworks
# for the architecture simulator tool.
#

`;

    const finalContent = header + yamlContent;

    // Ensure directory exists
    const dir = path.dirname(filename);
    await fs.mkdir(dir, { recursive: true });

    // Write to file
    await fs.writeFile(filename, finalContent, 'utf8');

    console.log(chalk.green(`✓ Generated ecosystem file: ${filename}`));

    // Print statistics
    this.printStatistics();
  }

  printStatistics() {
    console.log(chalk.cyan('\n📊 Ecosystem Statistics:'));

    const stats = {
      'Backend Languages': this.ecosystem.platform_ecosystem.languages.backend.length,
      'Frontend Languages': this.ecosystem.platform_ecosystem.languages.frontend.length,
      'Backend Frameworks': Object.values(this.ecosystem.platform_ecosystem.frameworks).flat()
        .length,
      'Frontend Frameworks': Object.values(
        this.ecosystem.platform_ecosystem.frontend_frameworks
      ).flat().length,
      'Hosting Platforms': Object.values(this.ecosystem.platform_ecosystem.hosting_platforms).flat()
        .length,
      'Database Services': Object.values(this.ecosystem.platform_ecosystem.databases).flat().length,
      'Caching Services': Object.values(this.ecosystem.platform_ecosystem.caching).flat().length,
      'Monitoring Services': Object.values(this.ecosystem.platform_ecosystem.monitoring).flat()
        .length,
      'Auth Services': this.ecosystem.platform_ecosystem.authentication.length,
    };

    Object.entries(stats).forEach(([category, count]) => {
      console.log(`  ${category}: ${chalk.white(count)}`);
    });

    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
    console.log(`\n${chalk.bold(`Total Services: ${chalk.green(total)}`)}`);
  }

  // Method to add custom platforms interactively
  async addCustomPlatform(type: string, platformData: any) {
    switch (type) {
      case 'hosting':
        if (!this.ecosystem.platform_ecosystem.hosting_platforms.custom) {
          this.ecosystem.platform_ecosystem.hosting_platforms.custom = [];
        }
        this.ecosystem.platform_ecosystem.hosting_platforms.custom.push(platformData);
        break;
      case 'database':
        if (!this.ecosystem.platform_ecosystem.databases.custom) {
          this.ecosystem.platform_ecosystem.databases.custom = [];
        }
        this.ecosystem.platform_ecosystem.databases.custom.push(platformData);
        break;
      // Add more cases as needed
    }
    console.log(chalk.green(`✓ Added custom ${type}: ${platformData.name}`));
  }

  async generate(_options: any = {}): Promise<any> {
    // Add all components
    this.addLanguages();
    this.addFrameworks();
    this.addFrontendFrameworks();
    this.addHostingPlatforms();
    this.addDatabases();
    this.addCaching();
    this.addMonitoring();
    this.addAuthentication();
    await this.addPricing();
    this.addPerformanceBenchmarks();

    return this.ecosystem;
  }

  async generateExample(type: string, options: any = {}): Promise<any> {
    const examples = {
      basic: {
        architecture: {
          name: options.name || 'Basic Web Application',
          application: {
            language: 'javascript',
            runtime: 'node.js',
            framework: 'express',
          },
          databases: {
            primary: {
              type: 'postgresql',
              provider: 'supabase',
              plan: 'free',
            },
          },
          hosting: {
            backend: {
              provider: 'vercel',
              service_type: 'serverless',
              instance_type: 'free',
            },
          },
          load_profile: {
            concurrent_users: 100,
            requests_per_second: 10,
            data_size: '1gb',
            read_write_ratio: '80:20',
          },
          performance_targets: {
            response_time_p95: 200,
            throughput_rps: 50,
            uptime_sla: 99.9,
          },
          budget: {
            monthly_limit: 100,
            currency: 'usd',
            alerts_at: 80,
          },
        },
      },
      microservices: {
        architecture: {
          name: options.name || 'Microservices Architecture',
          application: {
            language: 'go',
            runtime: 'go',
            framework: 'gin',
          },
          databases: {
            primary: {
              type: 'postgresql',
              provider: 'neon',
              plan: 'pro',
            },
            cache: {
              type: 'redis',
              provider: 'upstash_redis',
              plan: 'pay_as_you_go',
            },
          },
          hosting: {
            backend: {
              provider: 'flyio',
              service_type: 'container',
              instance_type: 'launch',
            },
          },
          load_profile: {
            concurrent_users: 5000,
            requests_per_second: 500,
            data_size: '50gb',
            read_write_ratio: '70:30',
            peak_multiplier: 3,
          },
          performance_targets: {
            response_time_p95: 100,
            throughput_rps: 1000,
            uptime_sla: 99.99,
          },
          budget: {
            monthly_limit: 500,
            currency: 'usd',
            alerts_at: 80,
          },
        },
      },
      serverless: {
        architecture: {
          name: options.name || 'Serverless Architecture',
          application: {
            language: 'typescript',
            runtime: 'node.js',
            framework: 'fastify',
          },
          databases: {
            primary: {
              type: 'document',
              provider: 'fauna',
              plan: 'individual',
            },
          },
          hosting: {
            backend: {
              provider: 'vercel',
              service_type: 'serverless',
              instance_type: 'pro',
            },
          },
          load_profile: {
            concurrent_users: 10000,
            requests_per_second: 1000,
            data_size: '100gb',
            read_write_ratio: '90:10',
          },
          performance_targets: {
            response_time_p95: 150,
            throughput_rps: 2000,
            uptime_sla: 99.95,
          },
          budget: {
            monthly_limit: 1000,
            currency: 'usd',
            alerts_at: 75,
          },
        },
      },
      enterprise: {
        architecture: {
          name: options.name || 'Enterprise Architecture',
          application: {
            language: 'java',
            runtime: 'jvm',
            framework: 'spring',
          },
          databases: {
            primary: {
              type: 'postgresql',
              provider: 'planetscale',
              plan: 'scaler',
            },
            cache: {
              type: 'redis',
              provider: 'redis_cloud',
              plan: 'fixed_15',
            },
          },
          hosting: {
            backend: {
              provider: 'render',
              service_type: 'web_service',
              instance_type: 'standard',
            },
          },
          load_profile: {
            concurrent_users: 20000,
            requests_per_second: 2000,
            data_size: '500gb',
            read_write_ratio: '60:40',
            peak_multiplier: 5,
          },
          performance_targets: {
            response_time_p95: 200,
            throughput_rps: 5000,
            uptime_sla: 99.99,
          },
          budget: {
            monthly_limit: 2000,
            currency: 'usd',
            alerts_at: 70,
            optimization_priority: 'performance',
          },
        },
      },
    };

    return (examples as any)[type] || examples.basic;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new EcosystemGenerator();

  try {
    // Parse command line arguments
    const { values, positionals } = parseArgs({
      args: process.argv.slice(2),
      options: {
        output: {
          type: 'string',
          short: 'o',
        },
        help: {
          type: 'boolean',
          short: 'h',
        },
      },
      allowPositionals: true,
    });

    // Show help if requested
    if (values.help) {
      console.log(chalk.cyan('Usage: generate-ecosystem [options] [output-file]'));
      console.log(chalk.cyan('\nOptions:'));
      console.log(chalk.cyan('  -o, --output <file>   Output file path (YAML format)'));
      console.log(chalk.cyan('  -h, --help            Show help'));
      console.log(chalk.cyan('\nExamples:'));
      console.log(chalk.cyan('  generate-ecosystem ecosystem.yaml'));
      console.log(chalk.cyan('  generate-ecosystem -o /path/to/output.yaml'));
      process.exit(0);
    }

    // Determine output file path
    let outputFile = values.output || positionals[0];

    if (!outputFile) {
      console.error(chalk.red('Error: Output file path is required'));
      console.log(chalk.yellow('Use -h or --help for usage information'));
      process.exit(1);
    }

    // Resolve to absolute path
    outputFile = path.resolve(outputFile);

    await generator.generateEcosystemFile(outputFile);

    console.log(chalk.green('\n🎉 Ecosystem generation completed successfully!'));
    console.log(chalk.blue(`📁 Output saved to: ${outputFile}`));
  } catch (error) {
    console.error(chalk.red('Fatal error:'), (error as Error).message);
    process.exit(1);
  }
}
