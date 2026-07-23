export class ToolRegistry {
  constructor() {
    this.tools = new Map()
  }

  register(name, description, parameters, fn) {
    this.tools.set(name, { name, description, parameters, fn })
  }

  getSchemas() {
    return Array.from(this.tools.values()).map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object',
          properties: t.parameters,
          required: Object.keys(t.parameters).filter((k) => !t.parameters[k].optional),
        },
      },
    }))
  }

  async execute(toolCall, preParsedArgs) {
    const tool = this.tools.get(toolCall.function.name)
    if (!tool) {
      throw new Error(`Unknown tool: ${toolCall.function.name}`)
    }
    // Use pre-parsed args if provided (from base.js error handling), else parse here
    const args = preParsedArgs !== undefined
      ? preParsedArgs
      : JSON.parse(toolCall.function.arguments)
    const result = await tool.fn(args)
    return {
      role: 'tool',
      tool_call_id: toolCall.id,
      content: typeof result === 'string' ? result : JSON.stringify(result),
    }
  }

  getNames() {
    return Array.from(this.tools.keys())
  }
}