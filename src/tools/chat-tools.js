import { ToolRegistry } from './registry.js'

export function createChatTools() {
  const registry = new ToolRegistry()

  registry.register(
    'current_time',
    'Get the current date and time',
    {},
    async () => new Date().toLocaleString()
  )

  registry.register(
    'calculator',
    'Evaluate a mathematical expression safely',
    {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate',
      },
    },
    async ({ expression }) => {
      try {
        const sanitized = expression.replace(/[^0-9+\-*/.()% ]/g, '')
        const result = new Function(`return (${sanitized})`)()
        return String(result)
      } catch {
        return 'Error: invalid expression'
      }
    }
  )

  registry.register(
    'web_fetch',
    'Fetch and read content from a URL',
    {
      url: { type: 'string', description: 'The URL to fetch' },
    },
    async ({ url }) => {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Node-Agent/1.0' },
          signal: AbortSignal.timeout(10000),
        })
        const text = await res.text()
        const clean = text
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, '')
          .replace(/&[a-z]+;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        return clean.slice(0, 3000)
      } catch (e) {
        return `Error fetching URL: ${e.message}`
      }
    }
  )

  return registry
}