#!/bin/bash

# Script to clone this Next.js starter kit, set it up, and run it
# Usage: ./setup-project.sh [project-name] [git-repo-url]

set -e  # Exit on any error

# Default values
PROJECT_NAME=${1:-"my-nextjs-project"}
REPO_URL=${2:-"https://github.com/your-username/nextjs-starter-kit.git"}

echo "🚀 Setting up Next.js project: $PROJECT_NAME"
echo "📦 Repository: $REPO_URL"

# Step 1: Clone the repository
echo "📥 Cloning repository..."
git clone "$REPO_URL" "$PROJECT_NAME"

# Step 2: Navigate into the project directory
cd "$PROJECT_NAME"

# Step 3: Remove remote origin
echo "🔗 Removing remote origin..."
git remote remove origin || echo "⚠️  No remote origin found to remove"

# Step 4: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 5: Display setup completion message
echo "✅ Setup complete!"
echo ""
echo "🎉 Your project is ready!"
echo "📁 Project location: $(pwd)"
echo ""
echo "To start the development server:"
echo "  cd $PROJECT_NAME"
echo "  npm run dev"
echo ""
echo "Or run the development server now? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "🚀 Starting development server..."
    npm run dev
fi
