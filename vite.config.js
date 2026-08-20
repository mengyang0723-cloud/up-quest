import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 桌面应用：base 用相对路径，打包后以 file:// 加载也能工作
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    target: 'chrome120',
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
});
