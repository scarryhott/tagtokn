import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from 'tailwindcss';
import tailwindcssNesting from 'tailwindcss/nesting';
import autoprefixer from 'autoprefixer';

// Base URL for production builds
const base = '/';

export default defineConfig({
  base,
  plugins: [
    react({
      // Enable Fast Refresh
      jsxRuntime: 'automatic',
    }),
  ],
  resolve: {
    alias: {
      // Add path aliases here if needed
      '@': path.resolve(__dirname, './src'),
      // Ensure proper resolution of React and other dependencies
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@headlessui/react',
      '@heroicons/react',
      'lucide-react',
      'firebase',
      'firebase/auth',
      'firebase/firestore',
      'react-error-boundary',
      'react-helmet-async',
    ],
    // Force Vite to pre-bundle these dependencies
    force: true,
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Create a vendor chunk for node_modules
          if (id.includes('node_modules')) {
            // Group React and related packages
            if (
              id.includes('react') ||
              id.includes('scheduler') ||
              id.includes('react-dom') ||
              id.includes('react-router')
            ) {
              return 'vendor-react';
            }
            // Group Firebase packages
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            // Group UI libraries
            if (id.includes('@headlessui') || id.includes('@heroicons') || id.includes('lucide')) {
              return 'vendor-ui';
            }
            // Group utility libraries
            return 'vendor-other';
          }
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    terserOptions: {
      format: {
        comments: false,
      },
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCaseOnly',
    },
    postcss: {
      plugins: [
        tailwindcssNesting,
        tailwindcss,
        autoprefixer,
      ],
    },
  },
});
