import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const rawValue = trimmed.slice(eqIdx + 1)
    // Strip inline comments only if value is not quoted
    const unquoted = rawValue.replace(/^["']|["']$/g, '').trim()
    if (!process.env[key]) {
      process.env[key] = unquoted
    }
  }
}

// Helper: model name -> env var prefix, e.g. "deepseek-chat" -> "LLM_DEEPSEEK_CHAT"
function modelEnvPrefix(model) {
  return 'LLM_' + model.replace(/-/g, '_').toUpperCase()
}

// Default presets — each can be overridden by env vars:
//   LLM_<NAME>_BASE_URL  overrides the baseURL
//   LLM_<NAME>_API_KEY   overrides the apiKey
// e.g. LLM_DEEPSEEK_CHAT_BASE_URL=http://localhost:11434/v1
//      LLM_GPT4O_API_KEY=sk-custom-key
const PRESET_DEFAULTS = {
  'gpt-4o':         { baseURL: 'https://api.openai.com/v1',          apiKeyEnv: 'OPENAI_API_KEY' },
  'gpt-4o-mini':    { baseURL: 'https://api.openai.com/v1',          apiKeyEnv: 'OPENAI_API_KEY' },
  'deepseek-chat':  { baseURL: 'https://api.deepseek.com/v1',        apiKeyEnv: 'DEEPSEEK_API_KEY' },
  'deepseek-reasoner': { baseURL: 'https://api.deepseek.com/v1',     apiKeyEnv: 'DEEPSEEK_API_KEY' },
  'qwen-turbo':     { baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKeyEnv: 'QWEN_API_KEY' },
  'qwen-plus':      { baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKeyEnv: 'QWEN_API_KEY' },
}

// Resolve preset with env overrides
function resolvePreset(modelName) {
  const def = PRESET_DEFAULTS[modelName]
  if (!def) return null
  const prefix = modelEnvPrefix(modelName)
  return {
    baseURL: process.env[`${prefix}_BASE_URL`] || def.baseURL,
    apiKey: process.env[`${prefix}_API_KEY`] || process.env[def.apiKeyEnv] || '',
  }
}

export const MODEL_PRESETS = PRESET_DEFAULTS

// Pure function: resolve model info without mutating any state
export function resolveModelInfo(modelName) {
  const resolved = resolvePreset(modelName)
  if (resolved) {
    return { model: modelName, ...resolved }
  }
  return null
}

export class Config {
  constructor() {
    this.model = process.env.LLM_MODEL || 'gpt-4o'
    this.baseURL = process.env.LLM_BASE_URL || 'https://api.ibax.cn/v1'
    this.apiKey = process.env.LLM_API_KEY || ''
    this.maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '4096', 10)
  }

  setModel(modelName) {
    const resolved = resolvePreset(modelName)
    if (resolved) {
      this.model = modelName
      this.baseURL = resolved.baseURL
      this.apiKey = resolved.apiKey
    } else {
      // Unknown model: keep current baseURL & key, just change name
      this.model = modelName
    }
  }

  setBaseURL(url) {
    this.baseURL = url.replace(/\/+$/, '') // strip trailing slash
  }

  setApiKey(key) {
    this.apiKey = key
  }

  getModelInfo() {
    return {
      model: this.model,
      baseURL: this.baseURL,
      apiKey: this.apiKey,
      maxTokens: this.maxTokens,
    }
  }
}