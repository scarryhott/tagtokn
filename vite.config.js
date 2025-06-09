import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';
import tailwindcssNesting from 'tailwindcss/nesting';
import autoprefixer from 'autoprefixer';

// Base URL for production builds (empty for relative paths)
const base = process.env.NODE_ENV === 'production' ? '/' : '/';

// Configure React with Emotion
const reactPlugin = react({
  // Force JSX runtime to automatic
  jsxRuntime: 'automatic',
  jsxImportSource: '@emotion/react',
  // Ensure JSX is properly transformed in all files
  include: ['**/*.jsx', '**/*.js', '**/*.ts', '**/*.tsx'],
  babel: {
    plugins: ['@emotion/babel-plugin']
  }
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
    // Enable HMR
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      overlay: false,
    },
    // Configure basic headers
    headers: {
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      // Ensure JSX files are served with the correct MIME type
      'Content-Type': 'application/javascript',
    },
    // File system options
    fs: {
      strict: true,
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
    // Ensure proper JSX handling
    esbuild: {
      include: /.*\.(jsx?|js?)$/,
      exclude: [],
      jsx: 'automatic',
      jsxImportSource: '@emotion/react',
      // Ensure all JSX is transformed
      jsxFactory: 'jsx',
      jsxFragment: 'Fragment',
      // Enable JSX in .js files
      loader: {
        '.js': 'jsx',
        '.jsx': 'jsx'
      },
    },
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
