import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ApiError } from './lib/client';
import { errorMessage } from './lib/errors';
import { useStore } from './store';
import './styles.css';

// frontend/CLAUDE.md: 오류는 개발 환경에서만 콘솔에 남긴다. 화면 문구는 각 화면이 보인다
function logError(error: unknown) {
  if (import.meta.env.DEV) console.error(error);
}

// 4xx는 다시 보내도 결과가 같으므로 자동 재시도하지 않는다
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
  queryCache: new QueryCache({
    onError: (error) => {
      logError(error);
      // S-10: 역할이 내려간 뒤 관리자 화면 조회는 거부를 토스트로 알린다
      if (error instanceof ApiError && error.status === 403) {
        useStore.getState().showToast(errorMessage(error));
      }
    },
  }),
  mutationCache: new MutationCache({ onError: logError }),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
