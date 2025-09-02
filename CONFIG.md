# Configuration Guide

## Quick Start

Architecture Simulator v2.0 works with minimal configuration. For AI-powered recommendations:

1. Copy the example configuration (optional):
```bash
cp asconfig.example.yaml asconfig.yaml
```

2. Add your AI model and API key:
```yaml
ai:
  model: gpt-3.5-turbo  # Choose your model
  apiKey: 'your-api-key' # Add your key (or use env var)
```

That's it! The simulator also works without AI for rule-based recommendations.

## Configuration File

The entire configuration is just 3 sections:

```yaml
# AI Settings (required)
ai:
  model: gpt-3.5-turbo  # AI model name
  apiKey: ''            # API key (or use env var)

# Storage Settings
storage:
  dataPath: ./data      # Where to store data
  cacheTTL: 3600        # Cache duration in seconds

# Providers to Analyze
providers:
  - vercel
  - netlify
  - aws
  - railway
  - render
```

## Supported AI Models

The system automatically detects the provider from the model name:

### OpenAI
- `gpt-4` - Most capable
- `gpt-4-turbo-preview` - Fast and powerful
- `gpt-3.5-turbo` - Cost-effective

### Anthropic Claude
- `claude-3-opus` - Most capable
- `claude-3-sonnet` - Balanced
- `claude-3-haiku` - Fast and cheap

### Google Gemini
- `gemini-pro` - General purpose
- `gemini-pro-vision` - Multimodal

### Mistral
- `mistral-medium` - Best performance
- `mistral-small` - Balanced
- `mistral-tiny` - Fast

### Local Models (via Ollama)
- `mixtral` - High quality
- `llama2` - Open source
- `mistral` - Efficient

## Environment Variables

Use environment variables instead of putting keys in config:

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."

# Google
export GOOGLE_GENERATIVE_AI_API_KEY="..."

# Mistral
export MISTRAL_API_KEY="..."

# Override model
export AI_MODEL="gpt-4"

# Generic API key (works with any provider)
export AI_API_KEY="..."
```

## Examples

### Minimal Config
```yaml
ai:
  model: gpt-3.5-turbo
  # API key from OPENAI_API_KEY env var
```

### Using Claude
```yaml
ai:
  model: claude-3-opus
  apiKey: sk-ant-...
```

### Using Local Ollama
```yaml
ai:
  model: mixtral
  # No API key needed
```

### Custom Providers List
```yaml
ai:
  model: gpt-4

providers:
  - vercel
  - cloudflare
  - supabase
  - planetscale
```

## How It Works

1. **AI-Only Recommendations**: All recommendations come from AI - no fallback rules
2. **Automatic Provider Detection**: Model name determines which SDK to use
3. **Smart Defaults**: Sensible defaults for temperature, tokens, etc.
4. **Simple Interface**: One unified API for all AI operations

## Features

The AI system provides:
- **Architecture recommendations** based on requirements
- **Cost estimation** for different configurations  
- **Provider comparisons** with pros/cons
- **Optimization suggestions** to reduce costs
- **Pricing data extraction** from provider pages

## Security

- Never commit `asconfig.yaml` (it's git-ignored)
- Use environment variables for API keys
- Rotate keys regularly
- Monitor API usage

## Troubleshooting

### AI not working?

1. Check API key is set:
```bash
echo $OPENAI_API_KEY
```

2. Verify model name is correct

3. For Ollama, ensure it's running:
```bash
ollama serve
ollama list
```

### Wrong provider detected?

Model name patterns:
- `gpt*` → OpenAI
- `claude*` → Anthropic
- `gemini*` → Google
- `mistral*` → Mistral
- `llama*`, `mixtral` → Ollama

### Rate limits?

The system handles rate limits automatically with retries and backoff.