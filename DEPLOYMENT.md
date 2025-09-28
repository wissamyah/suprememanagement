# Deployment Guide

This project uses **automated deployment** via GitHub Actions to ensure reliable and efficient deployments.

## 🚀 Automated Deployment

### How it Works
- **Automatic**: Every push to the `main` branch triggers deployment
- **Quality Checks**: Code is linted and type-checked before deployment
- **Fast**: Uses modern GitHub Actions with caching for quick builds
- **Reliable**: No manual git subtree operations or complex scripts

### Deployment Triggers
1. **Push to main branch** - Automatically deploys
2. **Manual trigger** - Use GitHub's "Run workflow" button

## 📋 Deployment Process

### Automatic Deployment (Recommended)
```bash
# 1. Make your changes and commit
git add .
git commit -m "Your changes"

# 2. Push to main branch - deployment starts automatically!
git push origin main
```

### Manual Deployment
1. Go to your GitHub repository
2. Click on **Actions** tab
3. Select **Deploy to GitHub Pages** workflow
4. Click **Run workflow** button
5. Choose the `main` branch and click **Run workflow**

## ✅ Pre-Deployment Checks

The automated workflow performs these quality checks:
- **Linting**: Ensures code style consistency
- **Type Checking**: Validates TypeScript types
- **Build**: Compiles and bundles the application

If any check fails, deployment is stopped and you'll be notified.

## 🔍 Monitoring Deployments

### Check Deployment Status
- **GitHub Actions Tab**: View real-time deployment progress
- **Repository Badge**: Shows current deployment status
- **Commit Status**: Green checkmark indicates successful deployment

### Deployment URL
- **Production**: https://wissamyah.github.io/suprememanagement/
- **Status**: Updates automatically after successful deployment

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build locally (for testing)
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

## 🚨 Troubleshooting

### Common Issues

#### TypeScript Errors
```bash
# Check for type errors locally
npx tsc --noEmit
```

#### Linting Issues
```bash
# Fix most linting issues automatically
npm run lint -- --fix
```

#### Build Failures
```bash
# Test build locally
npm run build

# If successful locally, check GitHub Actions logs
```

### Emergency Manual Deployment
If automated deployment fails and you need to deploy immediately:
```bash
npm run deploy:manual
```
⚠️ **Warning**: Only use this as a last resort. The automated workflow is more reliable.

## 📝 Deployment History

All deployments are tracked in:
- **GitHub Actions**: Complete deployment logs
- **Git History**: Automatic deployment commits
- **GitHub Pages**: Deployment history in repository settings

## 🔧 Configuration

### Environment Variables
- `NODE_ENV=production` - Set automatically during build
- No additional environment variables required

### Workflow Configuration
The deployment workflow is configured in `.github/workflows/deploy.yml`

### Branch Protection
Consider enabling branch protection rules on `main` to:
- Require status checks to pass
- Prevent direct pushes (use pull requests)
- Require reviews before merging

## 📞 Support

For deployment issues:
1. Check GitHub Actions logs
2. Verify local build works: `npm run build`
3. Ensure all TypeScript and linting issues are resolved
4. Contact the development team if issues persist

---

**✨ Benefits of Automated Deployment:**
- ✅ No manual errors or forgotten steps
- ✅ Consistent deployment process
- ✅ Quality checks prevent broken deployments
- ✅ Fast, reliable, and efficient
- ✅ Full deployment history and rollback capability