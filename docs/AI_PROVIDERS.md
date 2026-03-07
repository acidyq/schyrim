# AI Providers & Configuration

Schyrim supports multiple AI providers for generating location descriptions and scene narration. Each provider has different qualities, speeds, and pricing.

## Quick Start

1. **Copy the env template:**
   ```bash
   cp .env.example .env
   ```

2. **Choose a provider** (see below) and add your API key to `.env`

3. **Run the game:**
   ```bash
   npm run dev
   ```

The game will automatically detect your API keys and use the best available provider. **No API key? No problem!** — The game works perfectly offline with the mock provider.

---

## Provider Comparison

### 🔷 Anthropic (Claude) — **RECOMMENDED**

**Best for:** High-quality, natural narration. Best choice if you only want one provider.

- **Models:**
  - `claude-3-5-haiku-20241022` (default) — Fast, cheap, great for games
  - `claude-3-5-sonnet-20241022` — Higher quality, slower
- **Speed:** ~2-3 seconds per scene
- **Quality:** Excellent ⭐⭐⭐⭐⭐
- **Cost:** $0.80 per 1M input tokens, $4 per 1M output tokens (very affordable for games)
- **API Key:** Get from [console.anthropic.com](https://console.anthropic.com/)
- **Free Tier:** Limited credits available for testing

**Setup:**
```bash
# In .env:
ANTHROPIC_API_KEY=sk-ant-v7-xxxxxxxxxxxxxxxx
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```

**Why it's great for Schyrim:**
- Haiku is specifically designed for speed and cost
- Natural language quality is excellent
- Reasonable pricing (costs < $0.10 per gameplay hour)
- Easy to set up, reliable

---

### 🟦 OpenRouter — **Maximum Flexibility**

**Best for:** Trying many models. Supports Meta, Mistral, Llama, etc.

- **Models:** 100+ options
  - `meta-llama/llama-3.1-8b-instruct:free` (default)
  - `mistral/mistral-7b`
  - And many more
- **Speed:** Varies by model (~1-5 seconds)
- **Quality:** Good to excellent
- **Cost:** Varies by model ($0.50-2.00 per 1M tokens typically)
- **API Key:** Get from [openrouter.ai](https://openrouter.ai/)
- **Free Tier:** Free credits available

**Setup:**
```bash
# In .env:
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

**Why use it:**
- Huge variety of models to experiment with
- Free tier available
- Can use cheaper models for cost optimization
- Good for benchmarking different LLMs

---

### ⚡ Groq — **Fastest**

**Best for:** Speed-focused gameplay. Lowest latency.

- **Models:**
  - `llama-3.1-8b-instant` (default) — Very fast
  - Other Groq-optimized models
- **Speed:** ~0.5-1 second per scene (fastest)
- **Quality:** Good
- **Cost:** $0.05 per 1M input tokens, $0.08 per 1M output tokens (cheapest)
- **API Key:** Get from [console.groq.com](https://console.groq.com/)
- **Free Tier:** Yes, limited credits

**Setup:**
```bash
# In .env:
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
GROQ_MODEL=llama-3.1-8b-instant
```

**Why use it:**
- Extremely fast (< 1 second responses)
- Lowest cost
- Great for real-time responsiveness
- Good for metered/limited internet

---

### 📖 Mock Provider — **Offline**

**Best for:** Testing without internet. Learning the game.

- **Speed:** Instant
- **Quality:** Fixed templates (good for playtesting)
- **Cost:** Free
- **Setup:** No configuration needed

**How it works:**
- Curated atmospheric descriptions from templates
- Keyed by location type + time of day
- Deterministic (same location always has same description)
- Great for testing game logic without AI costs

**Example output:**
```
You stand in a bustling tavern. The smell of mead and roasted meat fills
the air. Patrons laugh and drink while a bard plays in the corner...
```

---

## Provider Priority

If you set multiple API keys, Schyrim uses this priority order:

1. **Anthropic** (ANTHROPIC_API_KEY)
2. **OpenRouter** (OPENROUTER_API_KEY)
3. **Groq** (GROQ_API_KEY)
4. **Mock** (always available)

This lets you have fallbacks. For example:
- Set Anthropic as primary (best quality)
- Set Groq as backup (if Anthropic quota exhausted)
- Game always works with mock if both fail

---

## Configuration Examples

### Option 1: Claude Only (Recommended)
```bash
ANTHROPIC_API_KEY=sk-ant-v7-...
OPENROUTER_API_KEY=
GROQ_API_KEY=
```
✅ Simplest, best quality, reasonable cost

### Option 2: Multiple Providers (Fallback Chain)
```bash
ANTHROPIC_API_KEY=sk-ant-v7-...
OPENROUTER_API_KEY=sk-or-v1-...
GROQ_API_KEY=gsk_...
```
✅ If one provider fails/quota, next takes over

### Option 3: Budget (Groq Only)
```bash
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=
GROQ_API_KEY=gsk_...
```
✅ Fastest, cheapest, still good quality

### Option 4: No API Key (Offline)
```bash
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=
GROQ_API_KEY=
```
✅ Game works perfectly offline with mock provider

---

## Model Selection

Each provider supports model overrides:

```bash
# Use a different Anthropic model
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Use a different OpenRouter model
OPENROUTER_MODEL=mistral/mistral-7b

# Use a different Groq model
GROQ_MODEL=llama-3.1-70b-versatile
```

Check provider docs for available models:
- [Anthropic Models](https://docs.anthropic.com/claude/reference/models-overview)
- [OpenRouter Models](https://openrouter.ai/models)
- [Groq Models](https://console.groq.com/docs/models)

---

## Cost Estimation

Typical gameplay session:

- **2 hours of play** ~= **50 location descriptions** (players move frequently)
- **Average description:** ~80 tokens

| Provider | Cost per Session | Monthly (10 hrs/week) |
|----------|------------------|-----------------------|
| **Anthropic Haiku** | ~$0.15 | ~$3 |
| **Groq** | ~$0.08 | ~$1.60 |
| **OpenRouter** (free) | $0 | $0 |
| **Mock (Offline)** | $0 | $0 |

All providers are **extremely affordable** — even heavy players spend < $5/month.

---

## Troubleshooting

### "offline (set ANTHROPIC_API_KEY...)" on startup
- No API keys are configured
- Check `.env` file exists and has valid keys
- Restart game after adding keys
- Game still works perfectly with mock provider!

### AI descriptions aren't appearing
- Check console for error messages
- Verify API key is correct (copy from provider dashboard)
- Ensure key has active credits/quota
- Try a different provider as fallback

### Slow AI responses
- Use `ANTHROPIC_MODEL=claude-3-5-haiku-20241022` (faster)
- Use `GROQ` instead (faster inference)
- Check your internet connection
- Time-limited to 6 seconds — if timeout, falls back to mock

### Running out of credits
- Switch to cheaper provider (Groq is cheapest)
- Use mock provider (free)
- Set up fallback chain (Anthropic → Groq → Mock)

---

## Advanced: Custom Endpoints

For Ollama or self-hosted LLMs:

```bash
# Not yet supported, but planned for future versions
# Would allow: CUSTOM_ENDPOINT=http://localhost:11434
```

---

## API Key Security

**Best practices:**
- Never commit `.env` file to git (it's in `.gitignore`)
- Don't share your API keys
- Rotate keys if exposed
- Use provider-specific API keys (don't reuse credentials)
- Monitor your API usage for unexpected charges

---

## See Also

- [README.md](../README.md) — General project overview
- [MODDING.md](./MODDING.md) — Creating mods (uses same content system)
- [docs/.env.example](../.env.example) — Configuration template

---

**Happy narrating!** 🎮✨
