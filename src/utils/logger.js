import chalk from 'chalk'
import { format } from 'node:util'

function timestamp() {
  return chalk.dim(new Date().toLocaleTimeString())
}

function highlightCode(content) {
  // Simple syntax highlighting for inline code
  return content.replace(/`([^`]+)`/g, (_, code) => chalk.cyan(code))
}

function renderCodeBlock(content) {
  // Detect and render markdown code blocks with language label
  return content.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_, lang, code) => {
      const langTag = lang ? chalk.dim(` ${lang}`) : ''
      const line = chalk.dim('  │')
      const lines = code.trimEnd().split('\n')
      const body = lines.map((l) => `${line} ${l}`).join('\n')
      return `  ${chalk.dim('┌─[')}${langTag}${chalk.dim(']')}\n${body}\n  ${chalk.dim('└─────')}`
    }
  )
}

export const logger = {
  header(text) {
    console.log(chalk.cyan(`\n  ━━━ ${text} ━━━\n`))
  },

  user(content) {
    console.log(chalk.blue(`  You  ${timestamp()}`))
    console.log(`  ${highlightCode(content)}`)
  },

  agent(content, model) {
    const label = model || 'Agent'
    const rendered = renderCodeBlock(content)
    console.log(chalk.green(`  ${label}  ${timestamp()}`))
    // Split by lines and print each to handle code blocks properly
    for (const line of rendered.split('\n')) {
      console.log(line)
    }
  },

  streamStart(model) {
    const label = model || 'Agent'
    process.stdout.write(chalk.green(`  ${label}  ${timestamp()}  `))
  },

  streamToken(token) {
    process.stdout.write(token)
  },

  streamEnd() {
    process.stdout.write('\n')
  },

  system(msg) {
    console.log(chalk.dim(`  ${msg}`))
  },

  tool(name, args) {
    console.log(chalk.yellow(`  ⚡ ${name}(${JSON.stringify(args)})`))
  },

  toolResult(result) {
    const str = String(result).slice(0, 200)
    console.log(chalk.dim(`  → ${str}`))
  },

  error(msg) {
    console.error(chalk.red(`  ✗ ${msg}`))
  },

  prompt() {
    return chalk.magenta('  >>> ')
  },

  separator() {
    console.log(chalk.dim('  ' + '─'.repeat(40)))
  },

  modelSwitch(model) {
    console.log(chalk.yellow(`  >>> 切换到模型: ${model}`))
  },

  modeSwitch(mode) {
    console.log(chalk.yellow(`  >>> 切换到 ${mode} 模式`))
  },

  help() {
    console.log(`
  ${chalk.bold('可用命令:')}
    ${chalk.cyan('/chat')}        切换到聊天模式
    ${chalk.cyan('/code')}        切换到代码模式
    ${chalk.cyan('/model <name>')}  切换模型 (如: /model deepseek-chat)
    ${chalk.cyan('/model')}       查看当前模型
    ${chalk.cyan('/models')}      查看可用模型列表
    ${chalk.cyan('/api <url>')}   设置 API 地址
    ${chalk.cyan('/key <key>')}   设置 API Key
    ${chalk.cyan('/save <name>')}  保存当前会话
    ${chalk.cyan('/load <name>')}  加载历史会话
    ${chalk.cyan('/sessions')}    查看所有会话
    ${chalk.cyan('/clear')}       清空会话历史
    ${chalk.cyan('/help')}        显示帮助
    ${chalk.cyan('/exit')}        退出
    `)
  },
}