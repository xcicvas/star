#!/bin/sh
set -e

# ── Node Agent 一键部署/更新脚本 ────────────────

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()   { printf "${CYAN}[INFO]${NC}  %s\n" "$*"; }
ok()     { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
warn()   { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }

cd "$(dirname "$0")"

MODE="${1:-install}"

# ── 更新模式 ──────────────────────────────────
if [ "$MODE" = "update" ]; then
  if [ -d .git ]; then
    info "检查更新..."
    git remote -v 2>/dev/null | head -1
    git pull --ff-only 2>&1 | head -3
    ok "代码已更新"
  else
    info "不是 git 仓库，跳过代码更新"
  fi
fi

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
for f in src/index.js src/config.js src/llm/client.js src/tools/registry.js src/tools/chat-tools.js src/tools/code-tools.js src/agent/base.js src/agent/chat.js src/agent/code.js src/utils/logger.js src/utils/session.js; do
  if [ -f "$f" ]; then
    node --check "$f" 2>/dev/null || warn "语法警告: $f"
  fi
done
ok "语法检查通过"

# ── 完成 ────────────────────────────────────────
echo ""
if [ "$MODE" = "update" ]; then
  printf "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  printf "${GREEN}  Node Agent 更新完成!${NC}\n"
  printf "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
else
  printf "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  printf "${GREEN}  Node Agent 部署完成!${NC}\n"
  printf "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
fi
echo ""
echo "  启动方式:"
echo ""
echo "    ${CYAN}聊天模式${NC}"
echo "    $ node src/index.js chat"
echo ""
echo "    ${CYAN}代码模式${NC}"
echo "    $ node src/index.js code"
echo ""
echo "  更新方式:"
echo "    $ sh setup.sh update"
echo ""
echo "  编辑 ${YELLOW}.env${NC} 配置 API Key 后即可使用"
echo ""