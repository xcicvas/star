import { ToolRegistry } from './registry.js'
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
} from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { execSync } from 'node:child_process'

export function createCodeTools() {
  const registry = new ToolRegistry()

  registry.register(
    'read_file',
    'Read the contents of a file',
    {
      path: { type: 'string', description: 'Path to the file' },
    },
    async ({ path }) => {
      try {
        const fullPath = resolve(process.cwd(), path)
        if (!existsSync(fullPath)) return `Error: file not found: ${path}`
        const stat = statSync(fullPath)
        if (stat.size > 1024 * 1024) return `Error: file too large (${(stat.size / 1024 / 1024).toFixed(1)} MB)`
        return readFileSync(fullPath, 'utf-8')
      } catch (e) {
        return `Error reading file: ${e.message}`
      }
    }
  )

  registry.register(
    'write_file',
    'Write content to a file (creates directories if needed)',
    {
      path: { type: 'string', description: 'Path to the file' },
      content: { type: 'string', description: 'Content to write' },
    },
    async ({ path, content }) => {
      try {
        const fullPath = resolve(process.cwd(), path)
        mkdirSync(join(fullPath, '..'), { recursive: true })
        writeFileSync(fullPath, content, 'utf-8')
        return `File written: ${path}`
      } catch (e) {
        return `Error writing file: ${e.message}`
      }
    }
  )

  registry.register(
    'list_dir',
    'List files and directories in a path',
    {
      path: { type: 'string', description: 'Directory path', optional: true },
      depth: { type: 'number', description: 'Max depth', optional: true },
    },
    async ({ path = '.', depth = 1 } = {}) => {
      try {
        const fullPath = resolve(process.cwd(), path)
        if (!existsSync(fullPath)) return `Error: directory not found: ${path}`
        if (!statSync(fullPath).isDirectory()) return `Error: not a directory: ${path}`
        const result = scanDir(fullPath, 0, Math.min(depth, 3))
        return result.join('\n') || '(empty directory)'
      } catch (e) {
        return `Error listing directory: ${e.message}`
      }
    }
  )

  registry.register(
    'search_code',
    'Search for text in code files',
    {
      pattern: { type: 'string', description: 'Text to search for' },
      path: { type: 'string', description: 'Directory to search in', optional: true },
      maxResults: { type: 'number', description: 'Max results', optional: true },
    },
    async ({ pattern, path = '.', maxResults = 20 } = {}) => {
      try {
        const fullPath = resolve(process.cwd(), path)
        const results = []
        searchInDir(fullPath, pattern, results, maxResults, 0, 3)
        return results.length > 0 ? results.join('\n') : 'No matches found'
      } catch (e) {
        return `Error searching: ${e.message}`
      }
    }
  )

  registry.register(
    'run_command',
    'Execute a shell command and return its output',
    {
      command: { type: 'string', description: 'Command to execute' },
      cwd: { type: 'string', description: 'Working directory', optional: true },
    },
    async ({ command, cwd = '.' } = {}) => {
      try {
        const fullCwd = resolve(process.cwd(), cwd)
        const output = execSync(command, {
          cwd: fullCwd,
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
          timeout: 30000,
        })
        return output || '(no output)'
      } catch (e) {
        const stderr = e.stderr || ''
        const stdout = e.stdout || ''
        return `Exit code: ${e.status}\n${stdout}${stderr}`.slice(0, 5000)
      }
    }
  )

  return registry
}

function scanDir(dirPath, depth, maxDepth) {
  const result = []
  try {
    const entries = readdirSync(dirPath).sort()
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue
      const full = join(dirPath, entry)
      const rel = relative(process.cwd(), full)
      try {
        const s = statSync(full)
        if (s.isDirectory()) {
          result.push(`📁  ${rel}/`)
          if (depth < maxDepth) result.push(...scanDir(full, depth + 1, maxDepth))
        } else {
          result.push(`📄  ${rel}  (${s.size} B)`)
        }
      } catch {
        result.push(`  ${rel}`)
      }
    }
  } catch {}
  return result
}

function searchInDir(dirPath, pattern, results, maxResults, depth, maxDepth) {
  if (depth > maxDepth || results.length >= maxResults) return
  try {
    const entries = readdirSync(dirPath)
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue
      const full = join(dirPath, entry)
      try {
        const s = statSync(full)
        if (s.isDirectory()) {
          searchInDir(full, pattern, results, maxResults, depth + 1, maxDepth)
        } else if (s.isFile() && s.size < 1024 * 1024) {
          try {
            const content = readFileSync(full, 'utf-8')
            const lines = content.split('\n')
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(pattern)) {
                const rel = relative(process.cwd(), full)
                results.push(`${rel}:${i + 1}: ${lines[i].trim().slice(0, 100)}`)
                if (results.length >= maxResults) return
              }
            }
          } catch {}
        }
      } catch {}
    }
  } catch {}
}