# Architecture Simulator - Comprehensive Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation & Setup](#installation--setup)
4. [CLI Reference](#cli-reference)
5. [Configuration Guide](#configuration-guide)
6. [API Reference](#api-reference)
7. [Testing Framework](#testing-framework)
8. [Performance Metrics](#performance-metrics)
9. [Cost Calculation](#cost-calculation)
10. [Ecosystem Data](#ecosystem-data)
11. [Development Guide](#development-guide)
12. [Troubleshooting](#troubleshooting)

## Overview

Architecture Simulator is an advanced web architecture modeling and simulation tool designed to help engineers make informed decisions about infrastructure choices through cost analysis, performance validation, and architectural recommendations.

### Key Features

- **Multi-Cloud Support**: AWS, GCP, Azure, and modern PaaS providers
- **Real-time Cost Analysis**: Accurate pricing calculations with optimization suggestions
- **Performance Simulation**: Validate architecture against performance requirements
- **Comprehensive Testing**: Built-in test framework for architecture validation
- **Unified CLI**: Single command interface for all operations

### Use Cases

- Infrastructure planning and budgeting
- Performance capacity planning
- Cost optimization analysis
- Architecture validation and testing
- Multi-region deployment planning

## Architecture

### Component Diagram

```
┌─────────────┐
│   CLI       │
└──────┬──────┘
       │
┌──────▼──────┐
│  Commands   │
└──────┬──────┘
       │
┌──────▼──────┐     ┌──────────────┐
│    Core     │◄────┤   Services   │
└──────┬──────┘     └──────────────┘
       │
┌──────▼──────┐
│     Lib     │
└─────────────┘
```

## Installation & Setup

### Prerequisites

- Node.js >= 20.0.0
- pnpm package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd architecture-simulator

# Install dependencies
pnpm install

# Generate ecosystem data
pnpm generate

# Verify installation
pnpm start --help
```

### Global Installation

🚧 **Work in Progress** - Will be published soon!

For now, use the local development setup above.

## CLI Reference

### Main Command

```bash
arch-sim [command] [options]
```

### Commands

#### `simulate` (alias: `sim`)

Run a complete architecture simulation.

```bash
arch-sim simulate <config.yaml> [options]

Options:
  -e, --ecosystem <path>   Path to ecosystem data (default: data/ecosystem.yaml)
  -v, --verbose           Verbose output
  -j, --json              Output as JSON
  --no-cost               Skip cost analysis
  --no-performance        Skip performance analysis

Examples:
  arch-sim simulate architecture.yaml
  arch-sim sim architecture.yaml -v
  arch-sim simulate architecture.yaml --json > results.json
```

#### `validate` (alias: `val`)

Validate architecture configuration.

```bash
arch-sim validate <config.yaml> [options]

Options:
  -e, --ecosystem <path>   Path to ecosystem data
  -s, --strict            Enable strict validation
  -j, --json              Output as JSON

Examples:
  arch-sim validate architecture.yaml
  arch-sim val architecture.yaml --strict
```

#### `cost`

Analyze architecture costs.

```bash
arch-sim cost <config.yaml> [options]

Options:
  -e, --ecosystem <path>   Path to ecosystem data
  -b, --breakdown         Show detailed cost breakdown
  -o, --optimize          Show optimization suggestions
  -j, --json              Output as JSON
  --currency <code>       Display currency (USD, EUR, GBP)

Examples:
  arch-sim cost architecture.yaml --breakdown
  arch-sim cost architecture.yaml --optimize
```

#### `test`

Run architecture tests.

```bash
arch-sim test [pattern] [options]

Options:
  -e, --ecosystem <path>   Path to ecosystem data
  -v, --verbose           Verbose output
  -j, --json              Output as JSON
  -w, --watch             Watch mode
  --fail-fast             Stop on first failure
  --timeout <ms>          Test timeout (default: 30000)

Examples:
  arch-sim test
  arch-sim test "test/*.yaml" -v
  arch-sim test --watch
```

#### `generate` (alias: `gen`)

Generate ecosystem data or example architectures.

```bash
# Generate ecosystem data
arch-sim generate ecosystem [options]

Options:
  -o, --output <path>     Output file path
  -f, --format <format>   Output format (yaml|json)
  --update                Update existing file

# Generate example architecture
arch-sim generate example <type> [options]

Types:
  basic          Basic web application
  microservices  Microservices architecture
  serverless     Serverless architecture
  enterprise     Enterprise architecture

Options:
  -o, --output <path>     Output file path
  -n, --name <name>       Architecture name

Examples:
  arch-sim generate ecosystem -o data/ecosystem.yaml
  arch-sim generate example microservices -n "My API"
```

## Configuration Guide

### Architecture Configuration (YAML)

```yaml
architecture:
  # Basic Information
  name: 'Service Name'
  description: 'Service description'

  # Application Stack
  application:
    language: 'typescript' # javascript, typescript, python, go, rust, java, etc.
    runtime: 'node.js' # node.js, python, go, jvm, etc.
    framework: 'fastify' # express, fastify, django, gin, etc.
    version: '4.x'

  # Frontend (optional)
  frontend:
    framework: 'nextjs' # react, vue, angular, svelte, etc.
    version: '14.x'
    build_tool: 'vite' # webpack, vite, rollup, etc.

  # Database Configuration
  databases:
    primary:
      type: 'postgresql' # postgresql, mysql, mongodb, etc.
      provider: 'neon' # neon, planetscale, supabase, etc.
      plan: 'pro' # free, starter, pro, enterprise
      size: 'medium' # small, medium, large
      features: # Provider-specific features
        - 'branching'
        - 'auto_scaling'

    cache: # Optional cache layer
      type: 'redis'
      provider: 'upstash_redis'
      plan: 'pay_as_you_go'

  # Hosting Configuration
  hosting:
    backend:
      provider: 'render' # vercel, netlify, render, railway, flyio, etc.
      service_type: 'web_service' # serverless, container, static_site, etc.
      instance_type: 'standard' # free, starter, standard, pro
      region: 'us-east' # Deployment region
      auto_scaling: true

    frontend: # Optional separate frontend hosting
      provider: 'vercel'
      service_type: 'static_site'
      framework_preset: 'nextjs'

  # External Services
  services:
    authentication:
      provider: 'clerk' # clerk, auth0, firebase, etc.
      plan: 'pro'
      features:
        - 'social_logins'
        - 'user_management'

    monitoring:
      error_tracking:
        provider: 'sentry'
        plan: 'developer'
      uptime:
        provider: 'uptimerobot'
        plan: 'pro'

    cdn:
      provider: 'cloudflare'
      plan: 'pro'
      features:
        - 'ddos_protection'
        - 'waf'

    email:
      provider: 'resend'
      plan: 'pro'

    storage:
      provider: 'cloudflare_r2'
      plan: 'usage_based'

  # Load Profile
  load_profile:
    concurrent_users: 1000 # Expected concurrent users
    requests_per_second: 500 # Expected RPS
    peak_multiplier: 3 # Peak load multiplier
    data_size: '10gb' # Total data size
    read_write_ratio: '80:20' # Read:Write ratio
    geographic_distribution: # User distribution
      - region: 'us-east'
        percentage: 60
      - region: 'eu-west'
        percentage: 30
      - region: 'asia-pacific'
        percentage: 10

  # Performance Targets
  performance_targets:
    response_time_p95: 200 # 95th percentile response time (ms)
    uptime_sla: 99.9 # Uptime percentage
    throughput_rps: 1000 # Required throughput

  # Budget Constraints
  budget:
    monthly_limit: 500 # Monthly budget in USD
    currency: 'usd'
    alerts_at: 80 # Alert at percentage
    optimization_priority: 'cost' # cost, performance, or balanced

  # Development & Operations
  development:
    team_size: 3
    deployment_frequency: 'daily'
    monitoring_level: 'detailed'
    compliance_requirements: []
```

### Test Configuration

```yaml
# Test metadata
test:
  name: 'Test Name'
  description: 'Test description'
  category: 'performance' # performance, cost, validation

# Architecture configuration (same as above)
architecture:
  # ... architecture config ...

# Test expectations
expectations:
  validation:
    should_be_valid: true
    max_issues: 0
    max_warnings: 2

  performance:
    min_rps: 1000
    max_response_time: 200
    should_meet_targets: true

  cost:
    max_monthly_cost: 500
    should_be_within_budget: true
    max_budget_usage: 80

  recommendations:
    max_critical: 0
    max_high: 2
    should_include_types:
      - 'performance'
      - 'cost'
```

## API Reference

### Core Classes

#### `ArchitectureSimulator`

Main simulation engine.

```javascript
import { ArchitectureSimulator } from './src/core/simulator.js';

const simulator = new ArchitectureSimulator();

// Load ecosystem data
await simulator.loadEcosystem('data/ecosystem.yaml');

// Load architecture configuration
const architecture = await simulator.loadArchitecture('architecture.yaml');

// Validate architecture
const validation = simulator.validateArchitecture(architecture);

// Run simulation
const results = await simulator.simulate('architecture.yaml', {
  ecosystemPath: 'data/ecosystem.yaml',
  verbose: true,
});

// Format results
const formatted = simulator.formatResults(results);
```

#### `CostEngine`

Cost calculation engine.

```javascript
import { CostEngine } from './src/core/cost-engine.js';

const costEngine = new CostEngine();

// Load pricing data
await costEngine.loadPricing('data/ecosystem.yaml');

// Calculate costs
const costResult = costEngine.calculateTotalCost(architecture);

// Generate optimizations
const optimizations = costEngine.generateCostOptimizations(architecture, costResult);
```

#### `TestRunner`

Test execution service.

```javascript
import { TestRunner } from './src/services/test-runner.js';

const runner = new TestRunner({
  failFast: false,
  timeout: 30000,
});

// Run tests
await runner.runTests('test/*.yaml', {
  ecosystem: 'data/ecosystem.yaml',
  verbose: true,
});

// Access results
console.log(runner.stats);
console.log(runner.results);
```

## Testing Framework

### Writing Tests

1. **Create test file** in `test/` directory with `.test.yaml` extension
2. **Define architecture** configuration
3. **Set expectations** for validation, performance, and cost
4. **Run tests** using CLI or API

### Test Assertions

#### Validation Assertions

- `should_be_valid`: Architecture should pass validation
- `max_issues`: Maximum validation issues allowed
- `max_warnings`: Maximum warnings allowed

#### Performance Assertions

- `min_rps`: Minimum requests per second
- `max_response_time`: Maximum response time (ms)
- `should_meet_targets`: Should meet performance targets

#### Cost Assertions

- `max_monthly_cost`: Maximum monthly cost
- `should_be_within_budget`: Should be within budget
- `max_budget_usage`: Maximum budget usage percentage

### Running Tests

```bash
# Run all tests
arch-sim test

# Run specific test
arch-sim test test/my-architecture.test.yaml

# Run with pattern
arch-sim test "test/*.test.yaml"

# Verbose output
arch-sim test -v

# Watch mode
arch-sim test -w
```

## Performance Metrics

### Calculated Metrics

1. **Estimated RPS**: Maximum requests per second the architecture can handle
2. **Response Time**: Estimated 95th percentile response time
3. **Memory Usage**: Estimated memory consumption
4. **Cold Start Time**: Time to initialize (serverless)
5. **Network Latency**: Geographic distribution impact

### Performance Factors

- **Language Performance**: Base performance by language
- **Framework Overhead**: Framework-specific overhead
- **Load Degradation**: Performance impact under load
- **Database Latency**: Database query latency
- **Cache Effectiveness**: Cache hit ratio impact
- **Geographic Distribution**: Multi-region latency

### Bottleneck Analysis

The simulator identifies:

- Performance bottlenecks
- Resource constraints
- Scaling limitations
- Optimization opportunities

## Cost Calculation

### Cost Components

1. **Hosting Costs**
   - Base instance costs
   - Bandwidth overages
   - Function invocations
   - Build minutes

2. **Database Costs**
   - Storage costs
   - Compute hours
   - Data transfer
   - Backup storage

3. **Cache Costs**
   - Memory usage
   - Request costs
   - Data persistence

4. **Service Costs**
   - Authentication (MAU-based)
   - Monitoring (event-based)
   - CDN (bandwidth-based)
   - Email (message-based)

### Cost Optimization

The simulator provides:

- Cost breakdown by service
- Optimization suggestions
- Potential savings estimates
- Alternative provider recommendations

## Ecosystem Data

### Structure

```yaml
platform_ecosystem:
  version: '1.0.0'
  languages:
    backend: [...]
    frontend: [...]
  frameworks:
    nodejs: [...]
    python: [...]
    go: [...]
  hosting_platforms:
    developer_first: [...]
    big_cloud_dx: [...]
  databases:
    sql: [...]
    nosql: [...]
  caching:
    redis: [...]

pricing:
  hosting: { ... }
  databases: { ... }
  caching: { ... }

performance_benchmarks:
  languages: { ... }
  frameworks: { ... }
```

### Updating Ecosystem

```bash
# Regenerate ecosystem data
arch-sim generate ecosystem -o data/ecosystem.yaml

# Update existing ecosystem
arch-sim generate ecosystem --update
```

### Adding Custom Providers

Edit `src/services/ecosystem-generator.js` to add new providers:

```javascript
// Add to appropriate section
this.ecosystem.platform_ecosystem.hosting_platforms.custom = [
  {
    id: 'custom_provider',
    name: 'Custom Provider',
    type: 'paas',
    supported_languages: ['javascript', 'python'],
    pricing_model: 'usage_based',
    free_tier: true,
  },
];
```

## Development Guide

For development setup, contribution guidelines, and how to add new features, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Troubleshooting

### Common Issues

#### 1. Module Not Found

```
Error: Cannot find module
```

**Solution**: Run `pnpm install` to install dependencies

#### 2. Invalid Configuration

```
Configuration has issues
```

**Solution**: Validate configuration with `arch-sim validate`

#### 3. Pricing Data Missing

```
Pricing data not available for provider
```

**Solution**: Regenerate ecosystem data with `pnpm generate`

#### 4. Test Failures

```
Test failed: Expected X, got Y
```

**Solution**: Review test expectations and architecture configuration

### Debug Mode

Enable verbose output for debugging:

```bash
# Verbose simulation
arch-sim simulate architecture.yaml -v

# Verbose testing
arch-sim test -v

# JSON output for analysis
arch-sim simulate architecture.yaml --json
```

### Performance Issues

1. **Slow Simulation**
   - Check file sizes
   - Reduce test complexity
   - Use specific test patterns

2. **Memory Issues**
   - Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`
   - Reduce concurrent operations

### Getting Help

For development help and contribution questions, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Appendix

### Supported Providers

#### Languages

- JavaScript, TypeScript, Python, Go, Rust, Java, C#, PHP, Ruby, Elixir

#### Frameworks

- **Node.js**: Express, Fastify, NestJS, Koa, Hapi, Adonis
- **Python**: FastAPI, Django, Flask, Starlette
- **Go**: Gin, Echo, Fiber
- **Rust**: Axum, Actix Web

#### Hosting Platforms

- Vercel, Netlify, Render, Railway, Fly.io
- AWS App Runner, Firebase

#### Databases

- **SQL**: Neon, PlanetScale, Supabase
- **NoSQL**: MongoDB Atlas, Fauna

#### Cache Providers

- Upstash Redis, Redis Cloud

#### Services

- **Auth**: Clerk, Auth0
- **Monitoring**: Sentry, Rollbar, UptimeRobot
- **CDN**: Cloudflare, Fastly
- **Email**: Resend, SendGrid
- **Storage**: Cloudflare R2, AWS S3

### Version History

- **v2.0.0**: Unified CLI, improved architecture
- **v1.0.0**: Initial release

### License

MIT License - See LICENSE file for details

### Contact

For issues and questions:

- GitHub Issues: [repository-url]/issues
- Documentation: This file
- Examples: `test/` directory

---

_Last Updated: September 2024_
