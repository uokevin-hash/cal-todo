import pg from 'pg';
import { config } from './config.js';

// DATE(OID 1082)는 "YYYY-MM-DD" 문자열 그대로 받는다. Date 객체로 바꾸면 시간대가 밀린다(C-11)
pg.types.setTypeParser(1082, (value) => value);

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 20,
});

// "오늘"은 이 조각으로만 계산한다(R-12, C-11)
export const TODAY_SQL = "(now() AT TIME ZONE 'Asia/Seoul')::date";

export async function withTx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ILIKE 부분 일치. 입력의 %·_는 글자 그대로 찾는다
export const likePattern = (value) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
