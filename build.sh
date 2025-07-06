#!/bin/bash
set -e

echo "Starting build process..."
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Platform: $(uname -a)"

# Clean npm cache to avoid issues
npm cache clean --force

# Install dependencies with legacy peer deps and platform-specific handling
echo "Installing dependencies..."
npm install --legacy-peer-deps --no-audit --no-fund --verbose

# Verify the problematic module is installed
if [ ! -d "node_modules/@napi-rs/simple-git-linux-x64-gnu" ]; then
    echo "Installing missing platform-specific module..."
    npm install @napi-rs/simple-git-linux-x64-gnu@0.1.19 --legacy-peer-deps
fi

# Run the build
echo "Running build..."
npm run build

echo "Build completed successfully!"
