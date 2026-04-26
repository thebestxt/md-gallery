import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  root: 'frontend', // 开发服务器会从这里启动
  envDir: '../',
  resolve: {
    alias: {
      // 这样 @ 符号就代表 frontend 目录
      '@': path.resolve(__dirname, './frontend'),
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  }
});