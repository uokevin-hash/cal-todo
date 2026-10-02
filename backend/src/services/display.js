export const DELETED_MEMBER_NAME = '탈퇴 회원';

// R-9, FR-15: 비관리자에게는 탈퇴 회원 실명을 가리고, 관리자에게는 실명 + isDeleted(C-10)
export function displayMember({ memberId, name, isDeleted }, isAdmin) {
  if (!isDeleted) return { memberId, name };
  return isAdmin ? { memberId, name, isDeleted: true } : { memberId, name: DELETED_MEMBER_NAME };
}
