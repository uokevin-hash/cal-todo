import { useT } from '../lib/i18n';
import type { MemberRef } from '../types';

// 서버가 비관리자에게 가려 보내는 이름(services/display.js DELETED_MEMBER_NAME)
const DELETED_MEMBER_NAME = '탈퇴 회원';

// R-9: 비관리자에게는 서버가 "탈퇴 회원"으로 가려 보내고, 화면은 그 자리를 화면 언어로 바꾼다
// 관리자에게 온 isDeleted에는 (탈퇴)를 붙인다
export function MemberName({ member }: { member: MemberRef }) {
  const t = useT();
  if (member.isDeleted) {
    return (
      <span>
        {member.name}
        <span className="muted">{t('deletedSuffix')}</span>
      </span>
    );
  }
  if (member.name === DELETED_MEMBER_NAME) {
    return <span className="muted">{t('deletedMember')}</span>;
  }
  return <span>{member.name}</span>;
}

export function MemberNames({ members }: { members: MemberRef[] }) {
  return (
    <>
      {members.map((member, i) => (
        <span key={member.memberId}>
          {i > 0 && ', '}
          <MemberName member={member} />
        </span>
      ))}
    </>
  );
}
