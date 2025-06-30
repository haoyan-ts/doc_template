@echo off
echo 🚀 Setting up Document Generator Service...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✅ Node.js %NODE_VERSION% found
echo ✅ npm %NPM_VERSION% found

REM Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Check if Pandoc is installed
where pandoc >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Pandoc is not installed. You'll need it for document conversion.
    echo Install with: winget install pandoc
) else (
    echo ✅ Pandoc found
)

REM Check if WeasyPrint is installed
where weasyprint >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  WeasyPrint is not installed. You'll need it for PDF generation.
    echo Install with: pip install weasyprint
) else (
    echo ✅ WeasyPrint found
)

REM Build the project
echo 🔨 Building TypeScript...
npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo.
echo 🎉 Setup completed successfully!
echo.
echo 📋 Next steps:
echo   • Development: npm run dev
echo   • Production: npm start
echo   • Open browser: http://localhost:3000
echo.
echo 📚 For more information, see README_SERVICE.md
pause
