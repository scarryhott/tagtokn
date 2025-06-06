#!/bin/bash

# Use Node.js 20
export PATH="/Users/harryscott/.nvm/versions/node/v20.19.2/bin:$PATH"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the development server
echo "Starting the development server..."
npm start
