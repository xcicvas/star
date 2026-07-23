#!/usr/bin/env node

import { createInterface } from 'node:readline'
import { loadEnv, Config, MODEL_PRESETS, resolveModelInfo } from './config.js'
import { logger } from './utils/logger.js'
import { saveSession, loadSession, listSessions, deleteSession } from './utils/session.js'
import { ChatAgent } from './agent/chat.js'
import { CodeAgent } from './agent/code.js'

loadEnv()

const config = new Config()
let currentMode = process.argv[2] || 'chat'
let agent = currentMode === 'code' ? new CodeAgent(config) : new ChatAgent(config)
let currentSessionName = null
let sessionDirty = false

function switchMode(mode) {
  currentMode = mode
  agent = mode === 'code' ? new CodeAgent(config) : new ChatAgent(config)
  currentSessionName = null
  sessionDirty = false
  logger.modeSwitch(mode === 'code' ? '代码' : '聊天')
  printHeader()
}

function printHeader() {
  const modeLabel = currentMode === 'code' ? 'Code' : 'Chat'
  logger.header(`Node Agent · ${modeLabel} · ${config.model}`)
}

function autoSave() {
  if (!sessionDirty && !currentSessionName) return
  const name = currentSessionName || `session-${Date.now()}`
  saveSession(name, {
    mode: currentMode,
    model: config.model,
    messages: agent.messages,
  })
  currentSessionName = name
  sessionDirty = false
}

printHeader()

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '',
})

const lineQueue = []
let pendingResolve = null

rl.on('line', (line) => {
  if (pendingResolve) {
    const resolve = pendingResolve
    pendingResolve = null
    resolve(line)
  } else {
    lineQueue.push(line)
  }
})

function ask() {
  process.stdout.write(logger.prompt())
  if (lineQueue.length > 0) {
    return Promise.resolve(lineQueue.shift())
  }
  return new Promise((resolve) => {
    pendingResolve = resolve
  })
}

async function handleCommand(input) {
  const trimmed = input.trim()

  if (trimmed === '/exit') {
    autoSave()
    logger.system('Bye!')
    rl.close()
    process.exit(0)
  }

  if (trimmed === '/chat') {
    // Auto-save current session before switching
    if (sessionDirty) autoSave()
    switchMode('chat')
    return true
  }

  if (trimmed === '/code') {
    if (sessionDirty) autoSave()
    switchMode('code')
    return true
  }

  if (trimmed === '/model') {
    const info = config.getModelInfo()
    logger.system(`Model: ${info.model}`)
    logger.system(`API:   ${info.baseURL}`)
    logger.system(`Key:   ${info.apiKey ? info.apiKey.slice(0, 8) + '...' : '(not set)'}`)
    return true
  }

  if (trimmed.startsWith('/model ')) {
    const model = trimmed.slice(7).trim()
    if (model) {
      config.setModel(model)
      logger.modelSwitch(model)
    }
    return true
  }

  if (trimmed === '/models') {
    logger.system('Available model presets:')
    for (const [name] of Object.entries(MODEL_PRESETS)) {
      const info = resolveModelInfo(name)
      if (!info) continue
      const keyMark = info.apiKey ? '✓' : '✗'
      logger.system(`  ${name}  ${info.baseURL}  [${keyMark}]`)
    }
    logger.system('')
    logger.system('Any model name works — unknown names keep current baseURL & key.')
    logger.system('Use /api <url> and /key <key> to change current connection.')
    return true
  }

  if (trimmed.startsWith('/api ')) {
    const url = trimmed.slice(5).trim()
    if (url) {
      config.setBaseURL(url)
      logger.system(`API URL set to: ${config.baseURL}`)
    }
    return true
  }

  if (trimmed.startsWith('/key ')) {
    const key = trimmed.slice(5).trim()
    if (key) {
      config.setApiKey(key)
      logger.system(`API Key set (${key.slice(0, 8)}...)`)
    }
    return true
  }

  // ── Session commands ──

  if (trimmed === '/sessions') {
    const sessions = listSessions()
    if (sessions.length === 0) {
      logger.system('No saved sessions.')
    } else {
      logger.system(`Saved sessions (${sessions.length}):`)
      for (const s of sessions) {
        const date = new Date(s.updatedAt).toLocaleString()
        logger.system(`  ${s.name}  [${s.mode}]  ${s.model}  ${s.messageCount} msgs  ${date}`)
      }
    }
    return true
  }

  if (trimmed.startsWith('/save ')) {
    const name = trimmed.slice(6).trim()
    if (!name) {
      logger.system('Usage: /save <session-name>')
      return true
    }
    saveSession(name, {
      mode: currentMode,
      model: config.model,
      messages: agent.messages,
    })
    currentSessionName = name
    sessionDirty = false
    logger.system(`Session saved: ${name}`)
    return true
  }

  if (trimmed.startsWith('/load ')) {
    const name = trimmed.slice(6).trim()
    if (!name) {
      logger.system('Usage: /load <session-name>')
      return true
    }
    const data = loadSession(name)
    if (!data) {
      logger.system(`Session not found: ${name}`)
      return true
    }
    // Switch mode if needed
    if (data.mode && data.mode !== currentMode) {
      switchMode(data.mode)
    }
    agent.restoreState(data)
    currentSessionName = name
    sessionDirty = false
    logger.system(`Session loaded: ${name} (${data.messages?.length || 0} messages)`)
    return true
  }

  if (trimmed.startsWith('/delete ')) {
    const name = trimmed.slice(8).trim()
    if (!name) {
      logger.system('Usage: /delete <session-name>')
      return true
    }
    if (deleteSession(name)) {
      if (currentSessionName === name) {
        currentSessionName = null
      }
      logger.system(`Session deleted: ${name}`)
    } else {
      logger.system(`Session not found: ${name}`)
    }
    return true
  }

  if (trimmed === '/clear') {
    agent.clearHistory()
    sessionDirty = false
    printHeader()
    logger.system('History cleared')
    return true
  }

  if (trimmed === '/help') {
    logger.help()
    return true
  }

  return false
}

async function main() {
  while (true) {
    const input = await ask()
    if (!input.trim()) continue

    if (input.trim().startsWith('/')) {
      await handleCommand(input.trim())
      continue
    }

    try {
      sessionDirty = true
      await agent.run(input.trim())
      logger.separator()
      autoSave()
    } catch (e) {
      logger.error(`${e.message}`)
      if (e.message.includes('API') || e.message.includes('fetch')) {
        logger.system('Tip: Check your API key and base URL with /model')
      }
    }
  }
}

main().catch((e) => {
  logger.error(`Fatal: ${e.message}`)
  process.exit(1)
})