import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 开发态：将 /api 代理到后端（FastAPI，演示态 :8000）。
// API 统一前缀为 /api/v1，proxy 保留完整路径转发。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // 不 rewrite：/api/v1/... 完整转发到后端根路径
      },
    },
  },
  preview: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    css: false,
  },
});
