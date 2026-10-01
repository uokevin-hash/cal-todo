import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// C-18: 개발은 같은 출처로 쓰도록 /api를 백엔드로 넘긴다
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
