// 기동 순서: config 검증 → 마이그레이션 → 영구 관리자 확인 → listen
// config는 import 시점에 검증되므로, 실패 메시지를 한 줄로 찍으려고 동적 import를 쓴다
async function start() {
  const { config } = await import('./config.js');
  const { migrate } = await import('./migrate.js');
  const { ensurePermanentAdmin } = await import('./services/members.js');
  const { app } = await import('./app.js');

  await migrate();
  await ensurePermanentAdmin(config);
  app.listen(config.port, () => console.log(`cal-todo backend: http://localhost:${config.port}`));
}

start().catch((err) => {
  console.error(`기동 실패: ${err.message}`);
  process.exit(1);
});
