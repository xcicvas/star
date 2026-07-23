import { BaseAgent } from './base.js'
import { createChatTools } from '../tools/chat-tools.js'

const CHAT_SYSTEM_PROMPT = `You are a helpful AI assistant. You can:
- Answer questions and have natural conversations
- Fetch and summarize information from the web
- Perform calculations
- Provide analysis, explanations, and creative content

Use the tools available when they can help answer the user's questions.
Be concise but thorough. Use markdown formatting when appropriate.`

export class ChatAgent extends BaseAgent {
  constructor(config) {
    super('Chat', CHAT_SYSTEM_PROMPT, createChatTools(), config)
  }
}