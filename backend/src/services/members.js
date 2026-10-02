import bcrypt from 'bcrypt';
import { pool, withTx } from '../db.js';
import { AppError } from '../errors.js';
import * as attendances from '../repositories/attendances.js';
import * as members from '../repositories/members.js';
import * as refreshTokens from '../repositories/refreshTokens.js';
import * as validate from '../validate.js';
import { issueTokens } from './auth.js';

export const BCRYPT_COST = 10; // C-6

// 영구 관리자가 없으면 환경 변수로 만든다. 설정이 없으면 기동 실패(R-11, UC-10)
export async function ensurePermanentAdmin({ adminEmail, adminPassword }) {
  if (await members.hasPermanentAdmin()) return;
  if (!adminEmail || !adminPassword) {
    throw new Error('영구 관리자가 없습니다. ADMIN_EMAIL과 ADMIN_PASSWORD를 설정하세요(R-11)');
  }
  const email = validate.email(adminEmail);
  const passwordHash = await bcrypt.hash(validate.password(adminPassword), BCRYPT_COST);
  await members.insertPermanentAdmin({ email, passwordHash });
}

// 생년월일 미래 여부는 "오늘"이 필요해 route가 아니라 여기서 본다(C-9, C-11)
export async function assertBirthDateNotFuture(birthDate) {
  if (await members.isAfterToday(birthDate)) {
    throw new AppError(400, 'VALIDATION_ERROR', '올바른 날짜가 아닙니다', 'birthDate');
  }
}

const notFound = () => new AppError(404, 'NOT_FOUND', '요청한 대상을 찾을 수 없습니다');
const forbidden = () => new AppError(403, 'FORBIDDEN', '권한이 없습니다');
const permanentLocked = () =>
  new AppError(409, 'PERMANENT_ADMIN_LOCKED', '영구 관리자는 변경할 수 없습니다');

// R-9: 활성 회원 사이에서만 이메일 중복 불가(members_email_key)
const emailTakenOr = (err) =>
  err.code === '23505' && err.constraint === 'members_email_key'
    ? new AppError(409, 'EMAIL_TAKEN', '이미 사용 중인 이메일입니다', 'email')
    : err;

// 보낸 필드만 바꾼다. 생년월일 미래 여부는 트랜잭션 전에 본다
async function updateFields(client, id, fields) {
  await members.updateMember(client, id, fields).catch((err) => {
    throw emailTakenOr(err);
  });
}

// 6.1 흐름 8: password_changed_at 갱신 + 그 회원 Refresh 전부 폐기. 같은 트랜잭션에서(L-5)
async function replacePassword(client, id, newPassword) {
  await members.updatePassword(client, id, await bcrypt.hash(newPassword, BCRYPT_COST));
  await refreshTokens.revokeAllForMember(client, id, 'FORCED');
}

// UC-1. 역할은 기본값 MEMBER
export async function signup({ name, email, password, phone, birthDate }) {
  await assertBirthDateNotFuture(birthDate);
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await members.insertMember(pool, { name, email, passwordHash, phone, birthDate }).catch((err) => {
    throw emailTakenOr(err);
  });
}

export const getMe = (id) => members.findMe(pool, id);

// UC-3. role·isPermanent는 route가 읽지 않는다(R-10, C-9)
// 비밀번호를 바꾸면 다른 기기는 끊고 현재 세션에는 새 토큰을 준다(6.1 흐름 8)
export async function updateMe(id, fields, { currentPassword, newPassword }) {
  if (fields.birthDate) await assertBirthDateNotFuture(fields.birthDate);
  if (newPassword !== undefined) {
    if (currentPassword === undefined) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        '현재 비밀번호를 입력해 주세요',
        'currentPassword',
      );
    }
    if (!(await bcrypt.compare(currentPassword, await members.findPasswordHash(pool, id)))) {
      throw new AppError(
        400,
        'WRONG_PASSWORD',
        '현재 비밀번호가 올바르지 않습니다',
        'currentPassword',
      );
    }
  }
  return withTx(async (client) => {
    await updateFields(client, id, fields);
    if (newPassword === undefined) return { me: await members.findMe(client, id) };
    await replacePassword(client, id, newPassword);
    // 단순화: iat(앱 시각)와 password_changed_at(DB now())이 같은 시계라고 본다
    return { tokens: await issueTokens(client, id) };
  });
}

export const listMembers = (filters) => members.listForAdmin(pool, filters);

// UC-7, UC-8. 대상에 따른 규칙은 service가 본다(L-6)
export async function updateMemberByAdmin(actorId, targetId, fields, newPassword) {
  const target = await members.findAuthById(pool, targetId);
  if (!target) throw notFound();
  // 6.1 흐름 8: 관리자 본인 비밀번호는 PATCH /me에서만
  if (newPassword !== undefined && target.id === actorId) throw forbidden();
  if (target.isDeleted) throw new AppError(409, 'MEMBER_DELETED', '삭제된 회원입니다'); // FR-16
  // R-11: 영구 관리자의 이메일·비밀번호·역할 해제는 막는다
  const isLockedChange =
    fields.email !== undefined ||
    newPassword !== undefined ||
    (fields.role !== undefined && fields.role !== 'ADMIN');
  if (target.isPermanent && isLockedChange) throw permanentLocked();
  if (fields.birthDate) await assertBirthDateNotFuture(fields.birthDate);

  return withTx(async (client) => {
    await updateFields(client, targetId, fields); // R-10: 역할 변경은 토큰을 폐기하지 않는다
    if (newPassword !== undefined) await replacePassword(client, targetId, newPassword);
    return members.findAdminRow(client, targetId);
  });
}

// AD-7: 비활성화, 오늘 포함 이후 참석 삭제, Refresh 전부 폐기를 한 트랜잭션으로
export async function deleteMemberByAdmin(actorId, targetId) {
  const target = await members.findAuthById(pool, targetId);
  if (!target) throw notFound();
  if (target.id === actorId) throw forbidden(); // R-9: 자기 자신은 삭제 불가
  if (target.isPermanent) throw permanentLocked(); // R-11
  if (target.isDeleted) throw new AppError(409, 'MEMBER_DELETED', '이미 삭제된 회원입니다');

  await withTx(async (client) => {
    await members.markDeleted(client, targetId); // R-9
    await attendances.deleteFromToday(client, targetId); // R-9, R-12
    await refreshTokens.revokeAllForMember(client, targetId, 'FORCED'); // 6.1 흐름 8
  });
}
