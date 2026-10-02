import { AppError } from './errors.js';

// C-18: 허용 목록(CORS_ORIGINS)에 있는 출처에만 CORS를 연다. 목록 밖이면 헤더를 붙이지 않는다
// refresh_token 쿠키가 오가야 해서 credentials를 허용하고, 그래서 *가 아니라 출처를 그대로 돌려준다
export function cors(allowedOrigins) {
  return (req, res, next) => {
    res.vary('Origin');
    const origin = req.get('origin');
    if (!origin || !allowedOrigins.includes(origin)) return next();

    res.set({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' });
    if (req.method !== 'OPTIONS') return next();
    // preflight
    res
      .set({
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '600',
      })
      .status(204)
      .end();
  };
}

// 쿠키로 인증하는 요청(Refresh·로그아웃)의 출처 확인. SameSite=None이면 다른 사이트의 폼·스크립트도
// 쿠키를 실어 보낼 수 있으므로, Origin이 같은 출처나 허용 목록이 아니면 403으로 막는다.
// Origin이 없는 요청(curl, 같은 출처의 일부 브라우저 요청)은 그대로 둔다
export function requireAllowedOrigin(allowedOrigins) {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (!origin || allowedOrigins.includes(origin) || isSameOrigin(origin, req)) return next();
    next(new AppError(403, 'FORBIDDEN', '허용하지 않은 출처입니다'));
  };
}

function isSameOrigin(origin, req) {
  try {
    return new URL(origin).host === req.get('host');
  } catch {
    return false;
  }
}
