# Schyrim Configuration Guide

Configure AI providers, game settings, and more.

## Quick Setup

### Option 1: Environment Variables (Easiest)

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
# Edit .env with your favorite editor and add API keys
```

### Option 2: Interactive Configuration (Coming Soon)

```bash
npm run configure
```

This will guide you through setting up API keys with options to:
- Choose your preferred AI provider
- Test provider connectivity
- View available models
- Save configuration automatically

---

## Supported AI Providers

### 🔷 Anthropic (Claude)

**Why use it:** Best quality, recommended for game narration

```bash
# Get key from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-v7-xxxxxxxxxxxxxxxx

# Optional: Choose model (default: claude-3-5-haiku-20241022)
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

**Available Models:**
- `claude-3-5-sonnet-20241022` — Best quality, slower
- `claude-3-5-haiku-20241022` — Fast & cheap (recommended for games)
- `claude-3-opus-20250219` — Most capable

### 🌐 OpenRouter (Multi-Provider)

**Why use it:** Access to 100+ models from different providers

```bash
# Get key from: https://openrouter.ai/
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx

# Optional: Choose model (default: meta-llama/llama-3.1-8b-instruct:free)
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

**Popular Models:**
- `meta-llama/llama-3.1-8b-instruct:free` — Fast, free
- `mistral/mistral-7b` — Good balance
- `anthropic/claude-3-5-sonnet` — Claude via OpenRouter

### ⚡ Groq (Speed-Optimized)

**Why use it:** Fastest inference, cheapest

```bash
# Get key from: https://console.groq.com/
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx

# Optional: Choose model (default: llama-3.1-8b-instant)
GROQ_MODEL=llama-3.1-8b-instant
```

**Available Models:**
- `llama-3.1-8b-instant`
- `llama-3.1-70b-versatile`
- `mixtral-8x7b-32768`

### 🔵 OpenAI (ChatGPT)

**Why use it:** Reliable, well-known, good quality

```bash
# Get key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx

# Optional: Choose model (default: gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini
```

**Popular Models:**
- `gpt-4o` — Most capable
- `gpt-4o-mini` — Fast & cheap (recommended)
- `gpt-3.5-turbo` — Cheapest

### 🟩 Google Gemini

**Why use it:** Competitive quality, good for experimentation

```bash
# Get key from: https://ai.google.dev/
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxx

# Optional: Choose model (default: gemini-1.5-flash)
GEMINI_MODEL=gemini-1.5-flash
```

**Available Models:**
- `gemini-2.0-flash` — Latest, fastest
- `gemini-1.5-flash` — Recommended
- `gemini-1.5-pro` — Most capable

### 🟪 Together AI

**Why use it:** Good speed/quality ratio, fast inference

```bash
# Get key from: https://www.together.ai/
TOGETHER_API_KEY=xxxxxxxxxxxxxxxx

# Optional: Choose model
TOGETHER_MODEL=meta-llama/Llama-3-70b-chat-hf
```

### 📡 Local/Self-Hosted (Ollama)

**Why use it:** Completely offline, privacy-focused

```bash
# Start Ollama: ollama serve
# (runs on localhost:11434 by default)

OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama2
```

---

## Provider Priority

If you set multiple API keys, Schyrim uses this priority order:

```
1. ANTHROPIC_API_KEY (Claude) — best quality
2. OPENROUTER_API_KEY (flexible)
3. GROQ_API_KEY (fast)
4. OPENAI_API_KEY (ChatGPT)
5. GEMINI_API_KEY (Google)
6. TOGETHER_API_KEY
7. OLLAMA_ENDPOINT (local)
8. Mock provider (offline, no key needed)
```

**Example:** If you have both Anthropic and Groq keys set, Anthropic will be used. If Anthropic fails, Groq becomes the fallback.

---

## Configuration Scenarios

### 🎮 Best Quality (Recommended)

```bash
# Use Claude for best game narration
ANTHROPIC_API_KEY=sk-ant-v7-xxxxxxxxxxxxxxxx
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```

**Cost:** ~$0.15 per 2-hour session
**Quality:** ⭐⭐⭐⭐⭐

### 💰 Budget-Friendly

```bash
# Use fastest & cheapest provider
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
```

**Cost:** ~$0.08 per 2-hour session
**Speed:** ⭐⭐⭐⭐⭐

### 🔄 Maximum Flexibility

```bash
# Multiple providers as fallback chain
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
```

### 🏠 Completely Offline

```bash
# No API keys = game uses mock provider
# No configuration needed!
```

---

## Environment Variables Reference

| Variable | Type | Purpose | Default |
|----------|------|---------|---------|
| `ANTHROPIC_API_KEY` | string | Claude API key | (none) |
| `ANTHROPIC_MODEL` | string | Claude model to use | `claude-3-5-haiku-20241022` |
| `OPENROUTER_API_KEY` | string | OpenRouter API key | (none) |
| `OPENROUTER_MODEL` | string | OpenRouter model | `meta-llama/llama-3.1-8b-instruct:free` |
| `GROQ_API_KEY` | string | Groq API key | (none) |
| `GROQ_MODEL` | string | Groq model | `llama-3.1-8b-instant` |
| `OPENAI_API_KEY` | string | ChatGPT API key | (none) |
| `OPENAI_MODEL` | string | ChatGPT model | `gpt-4o-mini` |
| `GEMINI_API_KEY` | string | Gemini API key | (none) |
| `GEMINI_MODEL` | string | Gemini model | `gemini-1.5-flash` |
| `TOGETHER_API_KEY` | string | Together AI key | (none) |
| `TOGETHER_MODEL` | string | Together model | (none) |
| `OLLAMA_ENDPOINT` | string | Ollama server URL | (none) |
| `OLLAMA_MODEL` | string | Ollama model | (none) |

---

## Cost Comparison

**Per 2-hour gameplay session (~50 location descriptions, ~80 tokens each):**

| Provider | Cost | Speed | Quality |
|----------|------|-------|---------|
| **Claude Haiku** | $0.15 | Fast | Excellent |
| **Groq** | $0.08 | Very Fast | Good |
| **OpenAI (4o-mini)** | $0.12 | Fast | Excellent |
| **Gemini Flash** | $0.10 | Fast | Good |
| **OpenRouter Free** | $0 | Medium | Good |
| **Ollama** | $0 | Depends | Variable |
| **Mock** | $0 | Instant | Fixed |

---

## Troubleshooting

### "offline (set ANTHROPIC_API_KEY...)" on startup
- No API keys configured
- Game works fine with mock provider (offline mode)
- To enable AI: copy `.env.example` to `.env` and add API keys

### Provider not working
1. Check API key is correct
2. Verify key has active credits
3. Try a different provider
4. Check internet connection
5. Game falls back to next provider automatically

### Slow AI responses
- Use `claude-3-5-haiku` (fast)
- Use `Groq` (very fast)
- Check internet connection
- Each request has 6-second timeout

### Running out of credits
- Switch to cheaper provider (Groq, OpenAI 4o-mini)
- Use free tier (OpenRouter free models)
- Switch to offline mode (mock provider)

---

## Advanced: Custom Configuration File

**Planned for future:** Store configuration in `.schyrim/config.json` instead of just `.env`

```json
{
  "aiProvider": "anthropic",
  "providers": {
    "anthropic": {
      "apiKey": "sk-ant-v7-...",
      "model": "claude-3-5-haiku-20241022"
    },
    "openrouter": {
      "apiKey": "sk-or-v1-...",
      "model": "meta-llama/llama-3.1-8b"
    }
  },
  "gameSettings": {
    "difficulty": "normal",
    "aiNarrationEnabled": true
  }
}
```

---

## See Also

- [AI_PROVIDERS.md](./AI_PROVIDERS.md) — Detailed provider comparison
- [README.md](../README.md) — Project overview
- [.env.example](../.env.example) — Configuration template
