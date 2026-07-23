import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const SESSION_DIR = join(homedir(), '.node-agent', 'sessions')

function ensureDir() {
  mkdirSync(SESSION_DIR, { recursive: true })
}

export function saveSession(name, data) {
  ensureDir()
  const path = join(SESSION_DIR, `${name}.json`)
  const session = {
    ...data,
    updatedAt: new Date().toISOString(),
  }
  writeFileSync(path, JSON.stringify(session, null, 2), 'utf-8')
  return name
}

export function loadSession(name) {
  const path = join(SESSION_DIR, `${name}.json`)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8'))
}

export function listSessions() {
  ensureDir()
  const files = readdirSync(SESSION_DIR).filter((f) => f.endsWith('.json'))
  return files
    .map((f) => {
      try {
        const data = JSON.parse(readFileSync(join(SESSION_DIR, f), 'utf-8'))
        return {
          name: f.replace('.json', ''),
          mode: data.mode || '?',
          model: data.model || '?',
          messageCount: data.messages ? data.messages.length : 0,
          updatedAt: data.updatedAt || 'unknown',
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export function deleteSession(name) {
  const path = join(SESSION_DIR, `${name}.json`)
  if (existsSync(path)) {
    unlinkSync(path)
    return true
  }
  return false
}

export function getSessionDir() {
  return SESSION_DIR
}