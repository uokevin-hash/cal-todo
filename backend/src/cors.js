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
