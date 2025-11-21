#!/bin/bash
# Script to install pre-commit hooks

set -e

echo "Installing pre-commit hooks..."

# Check if pre-commit is installed
if ! command -v pre-commit &> /dev/null; then
    echo "pre-commit is not installed. Installing..."
    pip install pre-commit
fi

# Install the hooks
pre-commit install

echo "Pre-commit hooks installed successfully!"
echo ""
echo "Hooks will run automatically on git commit."
echo "To run manually: pre-commit run --all-files"

