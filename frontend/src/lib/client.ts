import { useStore } from '../store';
import type { ApiErrorBody, TokenResponse } from '../types';

// L-11: 인증을 아는 곳은 이 파일 하나다

export class ApiError extends Error {
  status: number;
  code: string;
  field?: string;

  constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.field = body.field;
  }
}

async function readError(res: Response): Promise<ApiErrorBody['error']> {
  try {
    return ((await res.json()) as ApiErrorBody).error;
  } catch {
    return { code: 'INTERNAL', message: res.statusText };
  }
}

async function refreshOnce(): Promise<string | null> {
  // 6.1 흐름 5: REFRESH_RACE면 다른 탭이 받은 새 쿠키로 한 번만 더 시도한다
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    if (res.ok) {
      const { accessToken } = (await res.json()) as TokenResponse;
      useStore.getState().setAccessToken(accessToken);
      return accessToken;
    }
    if ((await readError(res)).code !== 'REFRESH_RACE') break;
  }
  return null;
}

let refreshing: Promise<string | null> | null = null;

// 6.1 흐름 3: 동시에 여러 요청이 만료되어도 재발급은 하나만(single-flight)
export function refresh(): Promise<string | null> {
  refreshing ??= refreshOnce().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

// D-4 UNAUTHENTICATED: 스토어를 비우면 로그인 가드가 SCR-01로 보낸다
function forceLogout() {
  useStore.getState().clearAuth(true);
}

// body는 JSON으로, file은 바이트 그대로(Content-Type은 파일 형식) 보낸다
type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; file?: Blob };

function send(path: string, { method = 'GET', body, file }: Options, token: string | null) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (file) headers['Content-Type'] = file.type;
  else if (body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(`/api${path}`, {
    method,
    headers,
    body: file ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
}

async function request(path: string, options: Options): Promise<Response> {
  let res = await send(path, options, useStore.getState().accessToken);

  // /auth/* 자체의 실패에는 재발급·강제 로그아웃을 하지 않는다(L-11)
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const { code } = await readError(res.clone());
    const token = code === 'TOKEN_EXPIRED' ? await refresh() : null;
    if (token) res = await send(path, options, token);
    if (res.status === 401) forceLogout();
  }

  if (!res.ok) throw new ApiError(res.status, await readError(res));
  return res;
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const text = await (await request(path, options)).text(); // 201·204는 본문이 없을 수 있다
  return (text ? JSON.parse(text) : undefined) as T;
}

// 이미지처럼 JSON이 아닌 응답. <img src>는 Bearer 헤더를 못 붙이므로 받아서 Blob으로 넘긴다
export async function apiBlob(path: string): Promise<Blob> {
  return (await request(path, {})).blob();
}
