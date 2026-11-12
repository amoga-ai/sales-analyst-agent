// lib/agents/models.ts: The model choices for the model menu, read from NEXT_PUBLIC_AI_MODELS in .env.local (comma-separated).
export const MODEL_OPTIONS = (process.env.NEXT_PUBLIC_AI_MODELS ?? "")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean)
  .map((m) => ({ value: m, label: m }));