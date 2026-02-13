import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'fs';

// Plugin to copy manifest and icons after build
const copyExtensionFiles = () => ({
  name: 'copy-extension-files',
  closeBundle() {
    // Ensure dist directory exists
    if (!existsSync('dist')) {
      mkdirSync('dist', { recursive: true });
    }

    // Copy manifest.json
    copyFileSync('manifest.json', 'dist/manifest.json');

    // Copy icons folder
    if (existsSync('icons')) {
      cpSync('icons', 'dist/icons', { recursive: true });
    }

    console.log('✓ Copied manifest.json and icons to dist/');
  },
});

export default defineConfig({
  plugins: [react(), copyExtensionFiles()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        options: resolve(__dirname, 'options.html'),
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'src/background/index.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        inlineDynamicImports: false,
        manualChunks: undefined,
      },
      external: [],
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
});
