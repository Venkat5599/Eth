#!/usr/bin/env bash
# Cobra — real backend deploy for an Ubuntu/Debian VPS.
# Installs the toolchain, deploys the Stylus contract to Arbitrum Sepolia (real tx),
# and runs the agent as a public systemd service wired to DeepSeek + the live chain.
#
# Run on the VPS as root:
#   export PRIVATE_KEY=0x...          # funded Arbitrum Sepolia deployer (see faucet note)
#   export LLM_API_KEY=sk-...         # DeepSeek / OpenCode key (real LLM)
#   curl -fsSL https://raw.githubusercontent.com/Venkat5599/Eth/main/scripts/deploy-vps.sh | bash
# or: git clone ... && cd Eth && PRIVATE_KEY=.. LLM_API_KEY=.. bash scripts/deploy-vps.sh
set -euo pipefail

REPO="https://github.com/Venkat5599/Eth.git"
APP_DIR="/opt/cobra"
RPC="${ARB_SEPOLIA_RPC:-https://sepolia-rollup.arbitrum.io/rpc}"
: "${PRIVATE_KEY:?set PRIVATE_KEY (funded Arbitrum Sepolia deployer key)}"
: "${LLM_API_KEY:?set LLM_API_KEY (DeepSeek / OpenCode key)}"

echo "==> system deps"
apt-get update -y
apt-get install -y build-essential git curl pkg-config libssl-dev ufw unzip

echo "==> rust + wasm target + cargo-stylus"
if ! command -v cargo >/dev/null; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi
source "$HOME/.cargo/env"
rustup target add wasm32-unknown-unknown
command -v cargo-stylus >/dev/null || cargo install cargo-stylus --locked

echo "==> bun"
command -v bun >/dev/null || { curl -fsSL https://bun.sh/install | bash; export PATH="$HOME/.bun/bin:$PATH"; }
export PATH="$HOME/.bun/bin:$PATH"

echo "==> clone / update repo"
if [ -d "$APP_DIR/.git" ]; then git -C "$APP_DIR" pull --ff-only; else git clone "$REPO" "$APP_DIR"; fi

echo "==> deploy Stylus contract to Arbitrum Sepolia"
cd "$APP_DIR/contracts"
cargo stylus check --endpoint "$RPC" || true
DEPLOY_OUT=$(cargo stylus deploy --endpoint "$RPC" --private-key "$PRIVATE_KEY" --no-verify 2>&1 | tee /dev/stderr)
COBRA_ADDR=$(echo "$DEPLOY_OUT" | grep -oiE '0x[0-9a-f]{40}' | tail -1)
echo "==> deployed Cobra at: ${COBRA_ADDR:-DEPLOY_FAILED}"

echo "==> agent env"
cat > "$APP_DIR/agent/.env" <<EOF
ARB_SEPOLIA_RPC=$RPC
PRIVATE_KEY=$PRIVATE_KEY
COBRA_CONTRACT=$COBRA_ADDR
LLM_API_KEY=$LLM_API_KEY
LLM_BASE_URL=${LLM_BASE_URL:-https://api.deepseek.com/v1}
LLM_MODEL=${LLM_MODEL:-deepseek-chat}
AGENT_POLL_SECONDS=20
EOF

echo "==> agent deps + seed"
cd "$APP_DIR/agent"
bun install
bun run src/seed.ts

echo "==> systemd service (public on :8787)"
BUN_BIN="$(command -v bun)"
cat > /etc/systemd/system/cobra-agent.service <<EOF
[Unit]
Description=Cobra autonomous collections agent
After=network.target

[Service]
WorkingDirectory=$APP_DIR/agent
EnvironmentFile=$APP_DIR/agent/.env
ExecStart=$BUN_BIN run src/index.ts
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now cobra-agent
ufw allow 8787/tcp || true

IP=$(curl -fsSL ifconfig.me || echo "YOUR_VPS_IP")
echo ""
echo "================ COBRA BACKEND LIVE ================"
echo " Contract : ${COBRA_ADDR:-?}  (sepolia.arbiscan.io/address/${COBRA_ADDR:-})"
echo " Agent    : http://$IP:8787   (systemctl status cobra-agent)"
echo ""
echo " Final step — point the Vercel app at this agent:"
echo "   vercel env add NEXT_PUBLIC_AGENT_URL production   # value: http://$IP:8787"
echo "   vercel --prod   # redeploy"
echo "==================================================="
