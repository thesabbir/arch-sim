# Contributing to Architecture Simulator

We love contributions from developers of all skill levels! Whether you're fixing a bug, adding a feature, or improving documentation, your contribution makes Architecture Simulator better for everyone.

## Quick Start

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

## Development Setup

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

### Development Commands

```bash
# Run in development
pnpm start

# Run tests
pnpm test

# Run simulator
pnpm simulate

# Generate ecosystem data
pnpm generate

# Lint code (if available)
pnpm lint

# Format code (if available)
pnpm format
```

## Project Structure

```
architecture-simulator/
├── src/
│   ├── cli/                 # Command-line interface
│   │   ├── index.js         # Main CLI entry point
│   │   └── commands/        # CLI command implementations
│   │       ├── simulate.js  # Simulation command
│   │       ├── validate.js  # Validation command
│   │       ├── cost.js      # Cost analysis command
│   │       ├── test.js      # Test runner command
│   │       └── generate.js  # Generator command
│   ├── core/                # Core business logic
│   │   ├── simulator.js     # Main simulation engine
│   │   └── cost-engine.js   # Cost calculation engine
│   ├── services/            # Service modules
│   │   ├── test-runner.js   # Test execution service
│   │   ├── ecosystem-generator.js # Ecosystem data generator
│   │   └── collect-pricing.js     # Pricing data collector
│   └── lib/                 # Shared utilities
│       ├── defaults.js      # Default configurations
│       ├── validators.js    # Architecture validators
│       └── latency-calculator.js # Network latency calculations
├── data/                     # Data files
│   └── ecosystem.yaml        # Platform ecosystem data
├── test/                     # Test configurations
│   └── *.test.yaml          # Architecture test files
└── package.json             # Project configuration
```

## Code Conventions

### Code Style

1. **Language Standards**
   - ES6+ JavaScript
   - Async/await for asynchronous code
   - Modular architecture
   - Clear separation of concerns

2. **File Naming**
   - Kebab-case for files: `cost-engine.js`
   - PascalCase for classes: `ArchitectureSimulator`
   - camelCase for functions: `calculateTotalCost`

3. **Testing**
   - Test files in `test/` directory
   - Use `.test.yaml` extension
   - Clear test names and descriptions

## Adding New Features

### New Command

1. Create command file in `src/cli/commands/`
2. Export command function
3. Register in `src/cli/index.js`

Example:
```javascript
// src/cli/commands/my-command.js
export async function myCommand(args, options) {
  // Implementation
}

// src/cli/index.js
import { myCommand } from './commands/my-command.js';
// Register command
```

### New Provider

1. Add to ecosystem generator in `src/services/ecosystem-generator.js`
2. Add pricing information
3. Add performance benchmarks

Example:
```javascript
// Add to appropriate section in ecosystem generator
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

### New Validation

1. Add to `src/lib/validators.js`
2. Include in validation checks
3. Add test cases

## Testing

### Writing Tests

1. **Create test file** in `test/` directory with `.test.yaml` extension
2. **Define architecture** configuration
3. **Set expectations** for validation, performance, and cost
4. **Run tests** using CLI or API

### Test Structure

```yaml
# Test metadata
test:
  name: 'Test Name'
  description: 'Test description'
  category: 'performance' # performance, cost, validation

# Architecture configuration
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

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test
arch-sim test test/my-architecture.test.yaml

# Run with pattern
arch-sim test "test/*.test.yaml"

# Verbose output
arch-sim test -v

# Watch mode
arch-sim test -w
```

## Ecosystem Data

### Updating Ecosystem

```bash
# Regenerate ecosystem data
pnpm generate

# Update existing ecosystem
arch-sim generate ecosystem --update
```

### Adding Custom Providers

Edit `src/services/ecosystem-generator.js` to add new providers. Follow the existing patterns and ensure you include:

- Provider metadata (name, type, features)
- Pricing information
- Performance benchmarks
- Supported languages/frameworks

## Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch from `main`
3. **Make** your changes following the code conventions
4. **Add tests** for new functionality
5. **Run tests** to ensure everything passes
6. **Update documentation** if needed
7. **Commit** with clear, descriptive messages
8. **Push** to your fork
9. **Submit** a pull request

### Pull Request Guidelines

- **Clear title** describing the change
- **Detailed description** explaining what and why
- **Link issues** if applicable
- **Test coverage** for new features
- **Documentation updates** for user-facing changes

## Reporting Issues

When reporting bugs or requesting features, please include:

1. **Clear description** of the issue or feature
2. **Steps to reproduce** (for bugs)
3. **Expected behavior** vs actual behavior
4. **Configuration files** (if applicable)
5. **Error messages** and stack traces
6. **Environment details** (OS, Node.js version, etc.)

## Development Tips

### Debugging

Enable verbose output for debugging:

```bash
# Verbose simulation
arch-sim simulate architecture.yaml -v

# Verbose testing
arch-sim test -v

# JSON output for analysis
arch-sim simulate architecture.yaml --json
```

### Performance

1. **Slow Simulation**
   - Check file sizes
   - Reduce test complexity
   - Use specific test patterns

2. **Memory Issues**
   - Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`
   - Reduce concurrent operations

## Getting Help

1. Check existing documentation
2. Review example configurations in `test/`
3. Run commands with `--help` flag
4. Search GitHub issues
5. Ask questions in discussions

## Code of Conduct

Please be respectful and inclusive in all interactions. We want Architecture Simulator to be a welcoming community for developers of all backgrounds and skill levels.

## License

By contributing to Architecture Simulator, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Architecture Simulator! 🚀