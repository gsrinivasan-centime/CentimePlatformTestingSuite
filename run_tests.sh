#!/bin/bash

# Centime Test Management System - Test Runner Script
# This script helps you quickly run the test suite

set -e  # Exit on error

echo "=================================================="
echo "Centime Test Management System - Test Runner"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -d "test_suite" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Navigate to test_suite
cd test_suite

# Check if virtual environment exists
if [ ! -d "test_venv" ]; then
    echo "📦 Creating test virtual environment..."
    python3 -m venv test_venv
    echo "✓ Test virtual environment created"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source test_venv/bin/activate

# Check if requirements are installed
if [ ! -f "test_venv/.requirements_installed" ]; then
    echo "📥 Installing test dependencies..."
    pip install -r requirements.txt -q
    touch test_venv/.requirements_installed
    echo "✓ Test dependencies installed"
else
    echo "✓ Test dependencies already installed"
fi

# Create reports directory
mkdir -p reports/screenshots

echo ""
echo "=================================================="
echo "🧪 Test Suite Options"
echo "=================================================="
echo ""
echo "1. Run all tests"
echo "2. Run UI tests only"
echo "3. Run API tests only"
echo "4. Run specific test file"
echo "5. Run with HTML report"
echo ""
read -p "Select option (1-5): " option

case $option in
    1)
        echo ""
        echo "Running all tests..."
        pytest -v --tb=short
        ;;
    2)
        echo ""
        echo "Running UI tests only..."
        pytest -v -m ui --tb=short
        ;;
    3)
        echo ""
        echo "Running API tests only..."
        pytest -v -m api --tb=short
        ;;
    4)
        echo ""
        echo "Available test files:"
        echo "  1. ui_tests/test_login_ui.py"
        echo "  2. api_tests/test_account_payable_api.py"
        read -p "Enter file path: " filepath
        pytest -v "$filepath" --tb=short
        ;;
    5)
        echo ""
        echo "Running all tests with HTML report..."
        pytest -v --html=reports/report.html --self-contained-html --tb=short
        echo ""
        echo "✓ HTML report generated at: test_suite/reports/report.html"
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "=================================================="
echo "✅ Test execution completed"
echo "=================================================="
