import express from 'express';
import { fileURLToPath } from 'node:url';

// API 문서(Swagger UI). 패키지 없이 CDN의 swagger-ui-dist가 swagger.yaml을 읽는다(L-16 ④)
// 같은 출처라 [Try it out]의 refresh_token 쿠키도 그대로 오간다
export const router = express.Router();

const SPEC = fileURLToPath(new URL('../swagger.yaml', import.meta.url));
const CDN = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5';

const PAGE = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Badminatics API</title>
  <link rel="stylesheet" href="${CDN}/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${CDN}/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: '/api-docs/swagger.yaml', dom_id: '#swagger-ui', persistAuthorization: true });
  </script>
</body>
</html>`;

router.get('/', (req, res) => res.type('html').send(PAGE));
router.get('/swagger.yaml', (req, res) => res.sendFile(SPEC));
