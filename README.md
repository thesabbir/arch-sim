# Architecture Simulator: Test Before You Build

**Ever wondered if your system design will actually work in production? Or how much it will cost?**

Architecture Simulator lets you test your cloud infrastructure designs on your laptop BEFORE spending time and money building them. Think of it as a "flight simulator" for cloud architectures.

## Why This Tool Exists

Building cloud systems is expensive and risky. You often don't know if your design will handle the load or stay within budget until it's too late. This tool solves that problem by simulating your architecture locally, showing you:

- 💰 **Exact monthly costs** across different cloud providers
- ⚡ **Performance metrics** (requests per second, latency)
- 🚨 **Bottlenecks** that will break under load
- 📊 **Scaling limits** before you hit them in production

```bash
# Example: Test if your API design can handle Black Friday traffic
$ arch-sim simulate api.yaml --load black-friday
✓ Handles 15,000 requests/second
✓ 45ms response time (95th percentile)
✓ Costs $223/month on AWS
⚠️ Warning: Database will bottleneck at 20,000 requests/second
```

## What Problems It Solves

1. **"Will this architecture handle our expected load?"**
   - Simulate different traffic patterns before deployment
2. **"How much will this cost us monthly?"**
   - Get accurate pricing across AWS, GCP, Azure, Vercel, etc.
3. **"Where will our system break first?"**
   - Find bottlenecks before users do
4. **"Should we use AWS or GCP or Vercel?"**
   - Compare providers side-by-side with real numbers

## Quick Start (5 minutes)

### 1. Install the tool

```bash
pnpm install -g architecture-simulator
# or with npm: npm install -g architecture-simulator
```

### 2. Create your first architecture file

```yaml
# my-api.yaml - Describe your system in simple YAML
name: my-startup-api
components:
  # Your API server
  - type: backend
    provider: aws # or 'vercel', 'gcp', 'azure', etc.
    service: fargate # managed containers
    specs:
      cpu: 512 # 0.5 vCPU
      memory: 1024 # 1GB RAM
      instances: 2 # run 2 copies for reliability

  # Your database
  - type: database
    provider: neon # or 'aws-rds', 'planetscale', 'supabase'
    tier: pro # pricing tier
    storage: 10 # GB
```

### 3. Test your architecture

```bash
arch-sim simulate my-api.yaml

# Output:
# ✅ System can handle 5,000 requests/second
# ✅ Average response time: 32ms
# ✅ Monthly cost: $89 on AWS
# ⚠️  Tip: Switch to Vercel for 40% cost savings at this scale
```

## Real-World Example: E-commerce Platform

Here's how a junior engineer might use this to design a simple online store:

```yaml
# ecommerce.yaml
name: online-store
traffic:
  daily_users: 10000
  peak_multiplier: 3 # 3x traffic during sales

components:
  # Web application
  - type: frontend
    provider: vercel
    framework: nextjs

  # API backend
  - type: backend
    provider: aws
    service: lambda # serverless functions
    runtime: nodejs
    memory: 512

  # Product database
  - type: database
    provider: aws
    service: dynamodb # NoSQL for product catalog
    capacity: on-demand

  # User sessions
  - type: cache
    provider: upstash
    service: redis
    requests: 100000 # monthly requests
```

```bash
# Test if this can handle a flash sale
$ arch-sim simulate ecommerce.yaml --scenario flash-sale

# See the monthly bill
$ arch-sim cost ecommerce.yaml

# Compare with other providers
$ arch-sim compare ecommerce.yaml --providers aws,gcp,vercel
```

## Common Use Cases

### 🔍 "Which cloud provider should we use?"

```bash
$ arch-sim compare api.yaml --providers aws,gcp,vercel

Provider  Monthly Cost  Response Time  Best For
--------  ------------  -------------  --------
AWS       $340          50ms          Full control, enterprise
GCP       $290          55ms          ML/AI workloads
Vercel    $199          35ms          Fast deployment, Next.js
```

### 📈 "Will our system scale?"

```bash
$ arch-sim test scale.yaml --users 1000,10000,100000

Users    Cost/Month  Status  Notes
------   ----------  ------  -----
1K       $89         ✅      Running smooth
10K      $780        ✅      Auto-scaling triggered
100K     $8,200      ❌      Database connections exhausted at 87K users
                             Fix: Add connection pooling or use PgBouncer
```

### 🔧 "Where are the performance bottlenecks?"

```bash
$ arch-sim analyze production.yaml

🔍 Analysis Results:
━━━━━━━━━━━━━━━━━━
Bottleneck Found: Redis cache adding 2ms overhead per request

Suggested Fix: Enable pipelining in Redis configuration
Expected Impact:
  - Reduce latency from 2ms to 0.3ms
  - Improve p95 response time by 35ms
  - No additional cost

Implementation:
  redis.pipeline()
    .get('key1')
    .get('key2')
    .exec()
```

## Writing Architecture Tests

Just like unit tests for code, you can write tests for your architecture:

```yaml
# test/black-friday.test.yaml
name: Black Friday Load Test
architecture: ../architecture.yaml

scenarios:
  - name: Normal traffic
    users: 5000
    duration: 1h

  - name: Black Friday spike
    users: 50000
    duration: 4h

expectations:
  cost:
    max_monthly: 500 # Stay under $500/month
  performance:
    min_rps: 10000 # Handle at least 10K requests/second
    p95_latency: 100 # 95% of requests under 100ms
  reliability:
    availability: 99.9 # Three 9s uptime

alerts:
  - if: database.connections > 80%
    message: 'Database connection pool nearly exhausted'
  - if: cost.monthly > 400
    message: 'Approaching budget limit'
```

Run your architecture tests:

```bash
$ pnpm test

Running architecture tests...
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ black-friday.test.yaml (5 assertions)
  ✅ Monthly cost $447 < $500
  ✅ Handles 12,000 RPS > 10,000 minimum
  ✅ P95 latency 89ms < 100ms target
  ✅ Availability 99.92% > 99.9% requirement
  ⚠️  Warning: Database connections at 78% during peak

✅ All tests passed!
```

## Supported Platforms & Services

<details>
<summary>📦 <b>Compute Services</b> (click to expand)</summary>

- **AWS**: EC2, Lambda, Fargate, ECS, App Runner
- **Google Cloud**: Compute Engine, Cloud Run, Cloud Functions
- **Azure**: Virtual Machines, Container Instances, Functions
- **Modern Platforms**: Vercel, Netlify, Render, Railway, Fly.io, Heroku

</details>

<details>
<summary>🗄️ <b>Databases</b> (click to expand)</summary>

- **Traditional**: PostgreSQL, MySQL, MongoDB, Redis
- **Cloud Native**: DynamoDB, Firestore, CosmosDB
- **Modern Platforms**: Neon, PlanetScale, Supabase, Fauna, Upstash
- **Data Warehouses**: Snowflake, BigQuery, Redshift

</details>

<details>
<summary>🚀 <b>Languages & Runtimes</b> (click to expand)</summary>

- Node.js, Python, Go, Rust, Java, C#, Ruby, PHP, Elixir
- Includes framework-specific optimizations (Next.js, Django, Rails, etc.)

</details>

## CLI Commands Reference

| Command    | What it does                       | Example                                            |
| ---------- | ---------------------------------- | -------------------------------------------------- |
| `simulate` | Test your architecture under load  | `arch-sim simulate api.yaml`                       |
| `cost`     | Calculate monthly cloud bills      | `arch-sim cost api.yaml --detailed`                |
| `validate` | Check if design meets requirements | `arch-sim validate api.yaml`                       |
| `compare`  | Compare providers side-by-side     | `arch-sim compare api.yaml --providers aws,vercel` |
| `test`     | Run architecture test suites       | `arch-sim test ./test/*.yaml`                      |
| `generate` | Create sample architectures        | `arch-sim generate --type microservices`           |

📚 **Full documentation**: [DOCUMENTATION.md](DOCUMENTATION.md)

## How It Works (Simple Explanation)

Think of it like a weather forecast, but for your cloud architecture:

1. **You describe your system** in a simple YAML file (like a recipe)
2. **The tool knows real cloud prices** from AWS, GCP, Azure, etc.
3. **It simulates user traffic** like a video game simulates physics
4. **Math models predict behavior** using the same formulas Netflix and Google use
5. **You get a report** showing costs, performance, and problems

The tool uses:

- Real pricing data from cloud provider APIs (updated daily)
- Performance benchmarks from actual production systems
- Queueing theory (math that predicts wait times and bottlenecks)
- Monte Carlo simulations (running thousands of "what if" scenarios)

## Common Questions from Junior Engineers

**Q: Do I need to know cloud architecture to use this?**
A: No! Start with the examples and modify them. The tool will guide you.

**Q: How accurate are the cost predictions?**
A: Within 5-10% of actual bills based on our testing with real production systems.

**Q: Can I use this for my personal projects?**
A: Yes! It's especially useful for avoiding surprise cloud bills on side projects.

**Q: What if my stack isn't supported?**
A: Open an issue! We add new services based on user requests.

## Getting Help

- 📖 **Beginner Tutorial**: Run `arch-sim tutorial` for an interactive guide
- 💬 **Discord Community**: [Join our Discord](https://discord.gg/archsim) for help
- 🐛 **Found a bug?**: [Open an issue](https://github.com/your-org/architecture-simulator/issues)
- 📧 **Email**: support@archsim.dev

## Contributing

We love contributions from developers of all skill levels!

```bash
# Get started with development
git clone https://github.com/your-org/architecture-simulator
cd architecture-simulator
pnpm install        # Install dependencies
pnpm test          # Run tests
pnpm simulate      # Test the simulator

# Make your changes, then:
pnpm test          # Make sure tests pass
git commit         # Commit your changes
git push           # Push to your fork
# Open a Pull Request!
```

Check [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT - Use it for anything, even commercial projects!
