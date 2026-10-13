import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 4193: next free port after lz-camera-sync (4192). strictPort so a second
// instance fails loudly instead of drifting to a port nothing waits on.
export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins: [react()],
  server: { port: 4193, strictPort: true },
  build: { outDir: '../../dist/renderer', emptyOutDir: true },
})
