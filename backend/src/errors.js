// 업무 거부는 AppError로 던지고, 마지막 오류 미들웨어가 C-8 형식으로 바꾼다(C-12)
export class AppError extends Error {
  constructor(status, code, message, field) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', '요청한 대상을 찾을 수 없습니다'));
}

// eslint-disable-next-line no-unused-vars -- Express는 인자 4개로 오류 미들웨어를 구분한다
export function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    err = new AppError(400, 'VALIDATION_ERROR', '요청 본문이 올바른 JSON이 아닙니다');
  }
  // 본문 크기 초과. 채팅 이미지면 field: image
  if (err.type === 'entity.too.large') {
    const field = req.is('image/*') ? 'image' : undefined;
    err = new AppError(400, 'VALIDATION_ERROR', '요청 본문이 너무 큽니다', field);
  }
  if (err instanceof AppError) {
    const error = { code: err.code, message: err.message };
    if (err.field) error.field = err.field;
    return res.status(err.status).json({ error });
  }
  // 500만 남긴다. 본문·헤더·쿠키는 찍지 않는다(C-13)
  console.error(req.method, req.originalUrl, err.stack);
  res.status(500).json({ error: { code: 'INTERNAL', message: '서버 오류가 발생했습니다' } });
}
