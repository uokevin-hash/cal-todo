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
    // C-18: 쉼표로 구분한 허용 출처. 비우면 CORS 헤더 없음
    corsOrigins: (env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}

export const config = loadConfig();
