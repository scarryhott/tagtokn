import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App';

// Ensure the root element exists
const container = document.getElementById('root');

if (!container) {
  throw new Error("Failed to find the root element");
}

const root = createRoot(container);

// Wrap in StrictMode for additional checks in development
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
