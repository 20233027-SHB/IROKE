import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // API 키는 서버에만 있다. 프론트는 /api 프록시로만 호출한다.
    proxy: { '/api': 'http://localhost:8787' },
  },
});
