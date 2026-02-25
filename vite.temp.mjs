import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
export default defineConfig({
  plugins:[react()],
  esbuild: false,
  optimizeDeps: { disabled: true },
  resolve:{ alias:{ '@': path.resolve(process.cwd(),'src') } }
})
