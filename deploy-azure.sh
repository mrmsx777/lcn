#!/bin/bash
set -e

echo "🚀 Setting up Solana Sentinel on Azure VM..."

# 1. Update and install prerequisites
sudo apt-get update
sudo apt-get install -y curl build-essential git unzip

# 2. Install Node.js 20.x
if ! command -v node &> /dev/null
then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 3. Install PNPM
if ! command -v pnpm &> /dev/null
then
    echo "📦 Installing PNPM..."
    sudo npm install -g pnpm
fi

# 4. Install PM2 (Process Manager to keep bot alive)
if ! command -v pm2 &> /dev/null
then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# 5. Install Dependencies
echo "📦 Installing project dependencies..."
pnpm install

# 6. Start the bot!
echo "🔥 Starting Engine and Web Dashboard via PM2..."
pm2 start "pnpm run dev" --name "solana-sentinel"

pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME || true

echo "============================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "============================================="
echo "The engine and dashboard are now running in the background 24/7."
echo ""
echo "👉 You can access your dashboard at: http://<YOUR_AZURE_VM_PUBLIC_IP>:3000"
echo ""
echo "To view live logs from the bot, run:"
echo "pm2 logs solana-sentinel"
echo "============================================="
