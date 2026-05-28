#!/bin/bash

# Quick setup script - clones, installs, removes origin, and starts dev server
# Usage: ./quick-setup.sh [project-name] [git-repo-url]

set -e

PROJECT_NAME=${1:-"my-nextjs-project"}
REPO_URL=${2:-"git@github-other:abhi-bhat-lyzr/nextjs-starter-kit.git"}

echo "🚀 Quick setup for: $PROJECT_NAME"

# Clone and setup
git clone "$REPO_URL" "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Remove remote origin
git remote remove origin 2>/dev/null || echo "No remote origin to remove"

# Install and run
npm install
echo "✅ Setup complete! Starting development server..."
npm run dev
