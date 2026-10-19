import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/test20/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
}))
