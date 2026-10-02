import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 프록시 없이 백엔드를 직접 부른다(배포와 같은 다른 출처 + CORS). 주소는 VITE_API_URL(.env.development, src/lib/client.ts)
export default defineConfig({
  plugins: [react()],
});
