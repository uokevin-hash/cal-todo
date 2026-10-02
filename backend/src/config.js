// 환경 변수 읽기·검증(C-1, C-2, C-3, NFR-9)
export function loadConfig(env = process.env) {
  const required = (key) => {
    if (!env[key]) throw new Error(`환경 변수 ${key}가 없습니다`);
    return env[key];
  };
  const secret = (key) => {
    const value = required(key);
    if (Buffer.byteLength(value) < 32) throw new Error(`${key}는 32바이트 이상이어야 합니다`);
    return value;
  };

  // 프론트·백엔드를 다른 사이트(도메인)로 나눠 배포하면 none이어야 Refresh 쿠키가 오간다
  const cookieSameSite = (env.COOKIE_SAME_SITE || 'strict').toLowerCase();
  if (!['strict', 'lax', 'none'].includes(cookieSameSite)) {
    throw new Error('COOKIE_SAME_SITE는 strict, lax, none 중 하나여야 합니다');
  }

  const accessSecret = secret('JWT_ACCESS_SECRET');
  const refreshSecret = secret('JWT_REFRESH_SECRET');
  if (accessSecret === refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET과 JWT_REFRESH_SECRET은 달라야 합니다');
  }

  return {
    databaseUrl: required('DATABASE_URL'),
    accessSecret,
    refreshSecret,
    adminEmail: env.ADMIN_EMAIL,
    adminPassword: env.ADMIN_PASSWORD,
    port: Number(env.PORT || 3000),
    production: env.NODE_ENV === 'production',
    accessTokenTtl: env.ACCESS_TOKEN_TTL || '15m',
    // 채팅 붙여넣기 이미지 최대 크기(바이트). 기본 2MB
    chatImageMaxBytes: Number(env.CHAT_IMAGE_MAX_BYTES || 2 * 1024 * 1024),
    // C-18: 쉼표로 구분한 허용 출처. 비우면 CORS 헤더 없음
    corsOrigins: (env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    cookieSameSite,
  };
}

export const config = loadConfig();
