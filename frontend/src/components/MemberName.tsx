import type { MemberRef } from '../types';

// R-9: 서버가 비관리자에게는 "탈퇴 회원"으로 가려 보낸다. 관리자에게 온 isDeleted에는 (탈퇴)를 붙인다
export function MemberName({ member }: { member: MemberRef }) {
  if (member.isDeleted) {
    return (
      <span>
        {member.name}
        <span className="muted">(탈퇴)</span>
      </span>
    );
  }
  return <span className={member.name === '탈퇴 회원' ? 'muted' : undefined}>{member.name}</span>;
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
