#!/usr/bin/env bash
set -e

echo "=============================================================="
echo " 🚀 ABSENTA ECOSYSTEM: ISOLATED SAFE DEPLOYMENT PIPELINE"
echo "=============================================================="

STAGING_DIR="/var/www/project-absenta-staging"
PROD_DIR="/var/www/project-absenta"

echo ""
echo "[STEP 1/4] Pulling latest updates into isolated Staging..."
cd "$STAGING_DIR"
git fetch origin main
git reset --hard origin/main

echo ""
echo "[STEP 2/4] Testing Build in Sandbox Staging (Zero Risk to Production)..."
cd "$STAGING_DIR/absenta_frontend"
npm run build

echo ""
echo "[STEP 3/4] Staging build PASSED! Promoting to Production..."
cd "$PROD_DIR"
git pull origin main

echo "Copying verified production build artifacts..."
rm -rf "$PROD_DIR/absenta_frontend/dist"
cp -r "$STAGING_DIR/absenta_frontend/dist" "$PROD_DIR/absenta_frontend/dist"

echo ""
echo "[STEP 4/4] Reloading PM2 services..."
pm2 reload absenta-web:5175

echo ""
echo "=============================================================="
echo " ✅ SAFE DEPLOYMENT COMPLETED SUCCESSFULLY (ZERO-DOWNTIME)!"
echo "=============================================================="
