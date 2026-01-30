import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 配置
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // 代理 API 请求到后端
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
