import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';
import tailwindcssNesting from 'tailwindcss/nesting';
import autoprefixer from 'autoprefixer';

// Base URL for production builds (empty for relative paths)
const base = process.env.NODE_ENV === 'production' ? '/' : '/';

// Fix for Emotion.js with React 18
const reactPlugin = react({
  jsxRuntime: 'automatic',
  jsxImportSource: '@emotion/react',
  babel: {
    plugins: [
      '@emotion/babel-plugin',
      // Fix for useInsertionEffect
      ['@babel/plugin-transform-react-jsx', { runtime: 'automatic', importSource: '@emotion/react' }],
    ],
  },
  // Exclude node_modules from Emotion processing
  exclude: /node_modules\/.*\/node_modules\/@emotion\/react/,
});

export default defineConfig({
  base,
  plugins: [
    // Use the custom React plugin with Emotion.js support
    reactPlugin,
    // Temporarily disabled ESLint plugin
    // eslint({
    //   cache: true,
    //   include: ['src/**/*.{js,jsx,ts,tsx}'],
    //   exclude: ['node_modules', 'dist', '**/node_modules/**'],
    // }),
  ],
  // Ensure .jsx files are properly handled
  esbuild: {
    jsx: 'automatic',
    include: /.*\.jsx?$/,
    exclude: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Ensure consistent module resolution
      'react/jsx-runtime.js': 'react/jsx-runtime',
      'react/jsx-dev-runtime.js': 'react/jsx-dev-runtime',
    },
    extensions: ['.mjs', '.js', '.jsx', '.json', '.css', '.scss'],
  },
  server: {
    port: 3000,
    open: true,
    cors: true,
    host: true,
    strictPort: true,
    // Configure proper MIME types
    mimeTypes: {
      'application/javascript': ['js', 'jsx', 'mjs', 'cjs'],
      'text/jsx': ['jsx'],
      'text/javascript': ['js', 'jsx', 'mjs', 'cjs'],
    },
    // Enable HMR
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      overlay: false,
    },
    // Configure headers for proper MIME types
    headers: {
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Type': 'application/javascript',
    },
    // Fix for JSX MIME type issues
    fs: {
      strict: true,
    },
    // Ensure proper MIME type for JSX files
    proxy: {
      '^/assets/.*\.jsx$': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/\.jsx$/, '.js'),
      },
    },
  },
  optimizeDeps: {
    // Ensure proper dependency optimization
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      '@emotion/react',
      '@emotion/styled',
      '@headlessui/react',
      '@heroicons/react',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'lucide-react',
    ],
    // Force dependency pre-bundling
    force: true,
    esbuildOptions: {
      // Enable modern JavaScript features
      target: 'es2020',
      // Enable top-level await
      supported: { 'top-level-await': true },
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
  preview: {
    port: 3001,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'esnext',
    sourcemap: true,
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
    // Disable inline assets to prevent MIME type issues
    assetsInlineLimit: 0,
    // CommonJS options
    commonjsOptions: {
      transformMixedEsModules: true,
      esbuild: {
        // Ensure JSX is properly handled in dependencies
        jsx: 'automatic',
        jsxImportSource: '@emotion/react',
      },
    },
    // Rollup configuration
    rollupOptions: {
      output: {
        // Ensure proper file extensions
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Manual chunks for better code splitting
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('@emotion')) {
              return 'vendor-emotion';
            }
            if (id.includes('@headlessui') || id.includes('@heroicons') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            return 'vendor';
          }
        },
      },
    },
    // Terser configuration
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
      mangle: {
        properties: {
          // Ensure Emotion.js class names are not mangled
          regex: /^_[^_]/,
        },
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
        postcssImport(),
        tailwindcssNesting(),
        tailwindcss(),
        autoprefixer(),
      ],
    },
  },

});
