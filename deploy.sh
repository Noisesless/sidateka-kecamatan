#!/usr/bin/env bash
# Deploy script untuk CloudPanel (user rapidnet-banjarmangu, tanpa sudo)
# Usage: bash deploy.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "==> [1/6] Install dependencies (termasuk devDependencies untuk build)"
npm ci

echo "==> [2/6] Siapkan .env jika belum ada"
if [ ! -f .env ]; then
  cp .env.production.example .env
  SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  if grep -q "^SESSION_SECRET=" .env; then
    sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$SECRET|" .env
  else
    echo "SESSION_SECRET=$SECRET" >> .env
  fi
  echo "   .env dibuat dengan SESSION_SECRET baru."
else
  echo "   .env sudah ada, dilewati."
fi

mkdir -p data

echo "==> [3/6] Build production"
npm run build

echo "==> [4/6] Hapus devDependencies (ringankan node_modules di runtime)"
npm prune --omit=dev

echo "==> [5/6] Install PM2 secara lokal (jika belum ada)"
if [ ! -x "$HOME/.npm-global/bin/pm2" ] && [ ! -x "$HOME/node_modules/.bin/pm2" ]; then
  mkdir -p "$HOME/.npm-global"
  npm install -g --prefix="$HOME/.npm-global" pm2
  echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> "$HOME/.bashrc"
fi
PM2_BIN="$HOME/.npm-global/bin/pm2"
[ -x "$PM2_BIN" ] || PM2_BIN="$HOME/node_modules/.bin/pm2"

echo "==> [6/6] Start/Restart dengan PM2"
if "$PM2_BIN" list | grep -q "sidateka"; then
  "$PM2_BIN" restart sidateka
elif "$PM2_BIN" list | grep -q "portal-kecamatan"; then
  "$PM2_BIN" restart portal-kecamatan
else
  cd "$APP_DIR"
  PORT="${PORT:-3010}" "$PM2_BIN" start npm --name sidateka -- start -- -p "${PORT:-3010}"
fi
"$PM2_BIN" save || true

echo ""
echo "==> Selesai."
echo "   Status: $PM2_BIN status"
echo "   Log   : $PM2_BIN logs sidateka --lines 50"
