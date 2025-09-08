@echo off
REM Build and Deploy Script for GitHub Pages (Windows)
REM This ensures dist folder is properly deployed every time

echo Starting deployment process...

REM Step 1: Build the application
echo Building application...
call npm run build

REM Step 2: Force add dist folder (bypassing .gitignore)
echo Adding dist folder...
git add -f dist/

REM Step 3: Commit the build
echo Committing build...
git commit -m "Build for deployment"
if errorlevel 1 echo No changes to commit

REM Step 4: Push to main branch
echo Pushing to main branch...
git push origin main

REM Step 5: Deploy to GitHub Pages
echo Deploying to GitHub Pages...
git subtree push --prefix=dist origin gh-pages

echo.
echo Deployment complete!
echo Your app is live at: https://wissamyah.github.io/suprememanagement/