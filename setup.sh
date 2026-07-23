#!/bin/sh
set -e

# ── Node Agent 一键部署脚本 ──────────────────────

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()   { printf "${CYAN}[INFO]${NC}  %s\n" "$*"; }
ok()     { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
warn()   { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }

cd "$(dirname "$0")"

# 1. 检查 Node.js
info "检查 Node.js..."
if command -v node >/dev/null 2>&1; then
  node_ver=$(node -v 2>/dev/null)
  ok "Node.js $node_ver"
else
  echo "✗ 未找到 Node.js，请先安装:"
  echo "  Termux: pkg install nodejs"
  echo "  其他:   https://nodejs.org"
  exit 1
fi

# 2. 检查 npm
info "检查 npm..."
if command -v npm >/dev/null 2>&1; then
  npm_ver=$(npm -v 2>/dev/null)
  ok "npm v$npm_ver"
else
  echo "✗ 未找到 npm"
  exit 1
fi

# 3. 创建 .env（如果不存在）
if [ ! -f .env ]; then
  info "创建 .env 配置文件..."
  cat > .env << 'EOF'
LLM_BASE_URL=https://api.ibax.cn/v1
LLM_API_KEY=
LLM_MODEL=gpt-4o
LLM_MAX_TOKENS=4096
EOF
  ok ".env 已创建，请编辑 LLM_API_KEY"
else
  ok ".env 已存在，跳过"
fi

# 4. 安装依赖
info "安装 npm 依赖..."
npm install --silent 2>&1 | tail -1
ok "依赖安装完成"

# 5. 验证语法
info "验证代码语法..."
node --check src/index.js 2>/dev/null
ok "语法检查通过"

# ── 完成 ────────────────────────────────────────
echo ""
printf "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
printf "${GREEN}  Node Agent 部署完成!${NC}\n"
printf "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
echo ""
echo "  启动方式:"
echo ""
echo "    ${CYAN}聊天模式${NC}"
echo "    $ node src/index.js chat"
echo ""
echo "    ${CYAN}代码模式${NC}"
echo "    $ node src/index.js code"
echo ""
echo "    ${CYAN}运行时切换模型${NC}"
echo "    >>> /model deepseek-chat"
echo ""
echo "    ${CYAN}修改 API 地址${NC}"
echo "    >>> /api http://localhost:11434/v1"
echo ""
echo "  编辑 ${YELLOW}.env${NC} 配置 API Key 后即可使用"
echo ""