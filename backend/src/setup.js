// 배포 단계(Vercel 빌드)에서 마이그레이션·영구 관리자 확인만 하고 끝낸다.
// 함수는 요청마다 새로 뜰 수 있어 server.js처럼 기동할 때마다 실행하지 않는다
try {
  const { config } = await import('./config.js');
  const { pool } = await import('./db.js');
  const { migrate } = await import('./migrate.js');
  const { ensurePermanentAdmin } = await import('./services/members.js');
  await migrate();
  await ensurePermanentAdmin(config);
  await pool.end();
  console.log('setup 완료: 마이그레이션·영구 관리자 확인');
} catch (err) {
  console.error(`setup 실패: ${err.message}`);
  process.exit(1);
}
