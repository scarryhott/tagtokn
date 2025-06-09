#!/bin/bash

# Set the path to Node.js 20
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# Verify Node.js version
echo "Using Node.js version:"
node -v

# Install Firebase CLI if not already installed
if ! command -v firebase &> /dev/null; then
    echo "Installing Firebase CLI..."
    npm install -g firebase-tools@latest
fi

# Install functions dependencies
cd functions
npm install
cd ..

# Deploy Firebase functions
echo "Deploying Firebase functions..."
firebase deploy --only functions

echo "Deployment complete!"
