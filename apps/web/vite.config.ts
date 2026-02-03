import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'src'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: path.resolve(__dirname, 'src/pages/home/index.html'),
        about: path.resolve(__dirname, 'src/pages/about/index.html'),
        trabalhos: path.resolve(__dirname, 'src/pages/trabalhos/index.html')
      }
    }
  },
  server: {
    port: 5173
  }
});
