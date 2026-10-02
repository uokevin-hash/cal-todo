/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 백엔드 API 주소(경로 포함, 끝에 / 없이). 없으면 같은 출처의 /api
  readonly VITE_API_URL?: string;
}
