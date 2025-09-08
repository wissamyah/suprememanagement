#!/bin/bash

# Build and Deploy Script for GitHub Pages
# This ensures dist folder is properly deployed every time

echo "🚀 Starting deployment process..."

# Step 1: Build the application
echo "📦 Building application..."
npm run build

# Step 2: Force add dist folder (bypassing .gitignore)
echo "📁 Adding dist folder..."
git add -f dist/

# Step 3: Commit the build
echo "💾 Committing build..."
git commit -m "Build for deployment" || echo "No changes to commit"

# Step 4: Push to main branch
echo "⬆️ Pushing to main branch..."
git push origin main

# Step 5: Deploy to GitHub Pages
echo "🌐 Deploying to GitHub Pages..."
git subtree push --prefix=dist origin gh-pages

echo "✅ Deployment complete!"
echo "🔗 Your app is live at: https://wissamyah.github.io/suprememanagement/"