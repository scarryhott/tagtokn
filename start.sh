#!/usr/bin/env bash

# Use system Node.js (requires Node 18+)
# Remove hard-coded path so the script works on any machine

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the development server using the dev script
echo "Starting the development server..."
npm run dev
