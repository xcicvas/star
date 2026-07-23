export class LLMClient {
  constructor(config) {
    this.config = config
  }

  async send(messages, options = {}) {
    const { tools } = options
    const info = this.config.getModelInfo()

    const body = {
      model: info.model,
      messages,
      max_tokens: info.maxTokens,
      stream: false,
    }

    if (tools && tools.length > 0) {
      body.tools = tools
    }

    const response = await fetch(`${info.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${info.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text().catch(() => '')
      throw new Error(`API ${response.status}: ${err.slice(0, 200)}`)
    }

    return await response.json()
  }

  async *sendStream(messages, options = {}) {
    const { tools } = options
    const info = this.config.getModelInfo()

    const body = {
      model: info.model,
      messages,
      max_tokens: info.maxTokens,
      stream: true,
    }

    if (tools && tools.length > 0) {
      body.tools = tools
    }

    const response = await fetch(`${info.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${info.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text().catch(() => '')
      throw new Error(`API ${response.status}: ${err.slice(0, 200)}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') return
        try {
          yield JSON.parse(data)
        } catch {
          // skip malformed JSON chunks
        }
      }
    }
  }
}