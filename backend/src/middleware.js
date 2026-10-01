import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { AppError } from './errors.js';
import * as members from './repositories/members.js';
import { isIssuedBeforePasswordChange, verifyToken } from './services/auth.js';

const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', '로그인이 필요합니다');

// R-1: 회원만. 매 요청 회원 행을 다시 읽어 탈퇴·역할·비밀번호 변경을 바로 반영한다(6.1 흐름 2, C-7)
export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthenticated();

  let payload;
  try {
    payload = verifyToken(token, 'access');
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', '토큰이 만료되었습니다'); // 6.1 흐름 3
    }
    throw unauthenticated();
  }

  const member = await members.findAuthById(pool, payload.sub);
  if (!member || member.isDeleted || isIssuedBeforePasswordChange(payload, member)) {
    throw unauthenticated();
  }
  req.member = { id: member.id, role: member.role };
  next();
}

// R-8: 관리자만. requireAuth 뒤에 둔다
export function requireAdmin(req, res, next) {
  if (req.member.role !== 'ADMIN') throw new AppError(403, 'FORBIDDEN', '권한이 없습니다');
  next();
}
