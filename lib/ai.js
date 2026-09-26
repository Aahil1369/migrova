// Single source of truth for the Groq model. Groq retires models without
// warning in-app (llama-3.3-70b-versatile went away in 2026) — when that
// happens, swap the id here. Check live ids: GET https://api.groq.com/openai/v1/models
export const GROQ_MODEL = 'openai/gpt-oss-120b';

// gpt-oss is a reasoning model: its reasoning tokens count against max_tokens.
// 'low' keeps the output budget for the JSON answer and keeps latency ~1-3s.
export const GROQ_OPTIONS = { model: GROQ_MODEL, reasoning_effort: 'low' };
