#!/bin/bash
set -e

echo "Starting build process..."

# Install dependencies with legacy peer deps
npm install --legacy-peer-deps --no-audit --no-fund

# Run the build
npm run build

echo "Build completed successfully!"
