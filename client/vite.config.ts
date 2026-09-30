import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发时把 /socket.io 代理到服务器（3000），实现前后端同源联调。
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
  build: { outDir: 'dist' },
});
