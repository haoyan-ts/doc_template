#!/bin/bash

# Document Generator Service Setup Script

echo "🚀 Setting up Document Generator Service..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js $(node --version) found"
echo "✅ npm $(npm --version) found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check if Pandoc is installed
if ! command -v pandoc &> /dev/null; then
    echo "⚠️  Pandoc is not installed. You'll need it for document conversion."
    echo "Install instructions:"
    echo "  macOS: brew install pandoc"
    echo "  Ubuntu/Debian: sudo apt-get install pandoc"
    echo "  Windows: winget install pandoc"
else
    echo "✅ Pandoc $(pandoc --version | head -n1) found"
fi

# Check if WeasyPrint is installed
if ! command -v weasyprint &> /dev/null; then
    echo "⚠️  WeasyPrint is not installed. You'll need it for PDF generation."
    echo "Install with: pip install weasyprint"
else
    echo "✅ WeasyPrint found"
fi

# Build the project
echo "🔨 Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "  • Development: npm run dev"
echo "  • Production: npm start"
echo "  • Open browser: http://localhost:3000"
echo ""
echo "📚 For more information, see README_SERVICE.md"
