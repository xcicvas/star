import { LLMClient } from '../llm/client.js'
import { logger } from '../utils/logger.js'

export class BaseAgent {
  constructor(name, systemPrompt, toolRegistry, config) {
    this.name = name
    this.systemPrompt = systemPrompt
    this.toolRegistry = toolRegistry
    this.messages = []
    this.config = config
    this.llm = new LLMClient(config)
    this.mode = name.toLowerCase()
  }

  async run(userInput) {
    this.messages.push({ role: 'user', content: userInput })

    const result = await this._loop()

    this.messages.push({ role: 'assistant', content: result })
    return result
  }

  async _loop() {
    let iterations = 0
    const maxIterations = 15

    while (iterations < maxIterations) {
      iterations++

      const messages = [{ role: 'system', content: this.systemPrompt }, ...this.messages]
      const tools = this.toolRegistry.getSchemas()

      const { content, toolCalls } = await this._streamResponse(messages, tools)

      if (toolCalls.length > 0) {
        this.messages.push({
          role: 'assistant',
          content: content || null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        })

        for (const tc of toolCalls) {
          let args
          try {
            args = JSON.parse(tc.function.arguments)
          } catch {
            args = { raw: tc.function.arguments }
          }
          logger.tool(tc.function.name, args)

          try {
            const result = await this.toolRegistry.execute(
              { id: tc.id, function: { name: tc.function.name, arguments: tc.function.arguments } },
              args,
            )
            this.messages.push(result)
            logger.toolResult(result.content)
          } catch (e) {
            const errMsg = `Error: ${e.message}`
            this.messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: errMsg,
            })
            logger.error(errMsg)
          }
        }
      } else {
        return content
      }
    }

    return 'Agent reached maximum iterations.'
  }

  async _streamResponse(messages, tools) {
    const stream = this.llm.sendStream(messages, {
      tools: tools.length > 0 ? tools : undefined,
    })

    let content = ''
    const toolCalls = []
    let started = false

    try {
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta
        if (!delta) continue

        if (delta.content) {
          if (!started) {
            logger.streamStart()
            started = true
          }
          content += delta.content
          logger.streamToken(delta.content)
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index
            if (!toolCalls[idx]) {
              toolCalls[idx] = {
                id: tc.id || '',
                function: { name: '', arguments: '' },
              }
            }
            if (tc.id) toolCalls[idx].id = tc.id
            if (tc.function?.name) toolCalls[idx].function.name += tc.function.name
            if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments
          }
        }
      }
    } catch (e) {
      if (started) logger.streamEnd()
      throw e
    }

    if (started) logger.streamEnd()
    return { content, toolCalls: toolCalls.filter(Boolean) }
  }

  getState() {
    return {
      mode: this.mode,
      model: this.config.model,
      messages: this.messages,
    }
  }

  restoreState(state) {
    if (state.messages) this.messages = state.messages
    if (state.model) this.config.setModel(state.model)
  }

  clearHistory() {
    this.messages = []
  }
}