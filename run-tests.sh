#!/bin/bash
# Test runner script for data ownership contradiction detection
# Usage: ./run-tests.sh

echo "=========================================="
echo "Running Data Ownership Detection Tests"
echo "=========================================="
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed or not in PATH"
    echo "Please install Node.js and npm to run tests"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if vitest is installed
if ! npm list vitest &> /dev/null; then
    echo "📦 Installing test dependencies..."
    npm install -D vitest @vitest/ui
fi

echo "🧪 Running automated tests..."
echo ""

# Run tests
npm run test:run

echo ""
echo "=========================================="
echo "Test run complete!"
echo ""
echo "Next steps:"
echo "1. Review test results above"
echo "2. Run 'npm run dev' for browser testing"
echo "3. Use BROWSER-TEST-CHECKLIST.md for manual UI testing"
echo "=========================================="
