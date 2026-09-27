#!/usr/bin/env bash
# ==============================================================================
# scripts/deploy-piston-vps.sh
#
# Automated setup for a self-hosted Piston code-execution server on a fresh VPS.
#
# What it does:
#   1. Installs Docker if not already present
#   2. Pulls and runs the Piston container (privileged mode)
#   3. Installs the language runtimes Collixy needs
#   4. Configures a basic firewall (UFW)
#
# Usage:
#   # On the VPS (as root or with sudo):
#   bash deploy-piston-vps.sh
#
#   # Dry run — prints what it would do without executing:
#   DRY_RUN=1 bash deploy-piston-vps.sh
#
# Prerequisites:
#   - Ubuntu 22.04+ or Debian 12+ (other distros will need package manager tweaks)
#   - Root / sudo access
#   - At least 2 GB RAM, 20 GB disk
#
# After running this script, set the PISTON_URL environment variable in your
# Render backend dashboard to:
#   PISTON_URL=http://<your-vps-public-ip>:2000
# ==============================================================================

set -euo pipefail

PISTON_PORT="${PISTON_PORT:-2000}"
CONTAINER_NAME="collixy-piston"
VOLUME_NAME="piston_packages"

# Languages to install (must match frontend/src/utils/constants.js)
LANGUAGES=(
  "node"         # provides: javascript
  "typescript"
  "python"
  "java"
  "mono"         # provides: csharp
  "php"
  "gcc"          # provides: c, c++
  "ruby"
  "go"
  "rust"
  "swift"
  "kotlin"
  "dart"
)

log() { echo -e "\033[1;32m[✓]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }
err()  { echo -e "\033[1;31m[✗]\033[0m $*" >&2; }

run() {
  if [ "${DRY_RUN:-0}" = "1" ]; then
    echo "  [DRY RUN] $*"
  else
    "$@"
  fi
}

# ── 1. Docker ─────────────────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  log "Docker already installed: $(docker --version)"
else
  log "Installing Docker..."
  run apt-get update -qq
  run apt-get install -y -qq ca-certificates curl gnupg lsb-release
  run install -m 0755 -d /etc/apt/keyrings
  run curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  run chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    run tee /etc/apt/sources.list.d/docker.list > /dev/null
  run apt-get update -qq
  run apt-get install -y -qq docker-ce docker-ce-cli containerd.io
  run systemctl enable --now docker
  log "Docker installed: $(docker --version)"
fi

# ── 2. Pull & run Piston ──────────────────────────────────────────────────────
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  warn "Container '${CONTAINER_NAME}' already exists — restarting it"
  run docker start "${CONTAINER_NAME}" 2>/dev/null || true
else
  log "Starting Piston container..."
  run docker run -d \
    --name "${CONTAINER_NAME}" \
    --privileged \
    --restart unless-stopped \
    -p "${PISTON_PORT}:2000" \
    -v "${VOLUME_NAME}:/piston/packages" \
    --tmpfs /tmp:exec \
    ghcr.io/engineer-man/piston
fi

# Wait for Piston to be ready
log "Waiting for Piston to start..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${PISTON_PORT}/api/v2/runtimes" >/dev/null 2>&1; then
    log "Piston is up!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    err "Piston did not start within 30 seconds. Check: docker logs ${CONTAINER_NAME}"
    exit 1
  fi
  sleep 1
done

# ── 3. Install language runtimes ──────────────────────────────────────────────
log "Installing language runtimes (this may take a while)..."

for lang in "${LANGUAGES[@]}"; do
  # Get latest version
  version=$(curl -sf "http://localhost:${PISTON_PORT}/api/v2/packages" | \
    python3 -c "
import sys, json
pkgs = json.load(sys.stdin)
for p in pkgs:
    if p['language'].lower() == '${lang}'.lower() and p.get('installed'):
        print('INSTALLED')
        sys.exit(0)
versions = [p['language_version'] for p in pkgs if p['language'].lower() == '${lang}'.lower()]
versions.sort(reverse=True)
print(versions[0] if versions else '')
" 2>/dev/null || echo "")

  if [ "$version" = "INSTALLED" ]; then
    log "  ${lang} — already installed, skipping"
    continue
  fi

  if [ -z "$version" ]; then
    warn "  ${lang} — no package found in Piston catalog, skipping"
    continue
  fi

  log "  Installing ${lang}@${version}..."
  run curl -sf -X POST "http://localhost:${PISTON_PORT}/api/v2/packages" \
    -H "Content-Type: application/json" \
    -d "{\"language\": \"${lang}\", \"version\": \"${version}\"}" \
    -o /dev/null --max-time 600 \
    && log "  ✓ ${lang}@${version} installed" \
    || warn "  ✗ Failed to install ${lang}@${version}"
done

# ── 4. Firewall ───────────────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
  log "Configuring firewall..."
  run ufw allow 22/tcp    # SSH
  run ufw allow "${PISTON_PORT}/tcp"  # Piston
  run ufw --force enable 2>/dev/null || true
  log "Firewall configured: SSH (22) + Piston (${PISTON_PORT})"
else
  warn "UFW not found — make sure port ${PISTON_PORT} is open in your cloud provider's firewall/security group"
fi

# ── 5. Summary ────────────────────────────────────────────────────────────────
PUBLIC_IP=$(curl -sf https://ifconfig.me || echo "<your-vps-ip>")

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  ✅  Piston is running at: http://${PUBLIC_IP}:${PISTON_PORT}"
echo ""
echo "  Next steps:"
echo "  1. Test it:  curl http://${PUBLIC_IP}:${PISTON_PORT}/api/v2/runtimes"
echo ""
echo "  2. Set this in your Render backend's Environment Variables:"
echo "     PISTON_URL = http://${PUBLIC_IP}:${PISTON_PORT}"
echo ""
echo "  3. Redeploy the backend on Render."
echo ""
echo "  4. Verify:  curl https://<your-render-backend>.onrender.com/api/execute/health"
echo "══════════════════════════════════════════════════════════════"
