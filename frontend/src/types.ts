// PRD 9장 핵심 응답 형식(L-14). 서버와 코드를 공유하지 않으므로 손으로 맞춘다

export type Role = 'MEMBER' | 'ADMIN';
export type GroupStatus = 'AVAILABLE' | 'FULL';

export type ApiErrorBody = { error: { code: string; message: string; field?: string } };

export type TokenResponse = { accessToken: string };

export type Me = {
  id: number;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  age: number;
  role: Role;
  isPermanent: boolean;
};

// 회원 표시 객체. 비관리자에게 탈퇴 회원은 name이 "탈퇴 회원", 관리자에게는 실명 + isDeleted
export type MemberRef = { memberId: number; name: string; isDeleted?: boolean };

export type Calendar = {
  month: string;
  days: {
    date: string;
    groupCount: number;
    groups: { id: number; name: string; count: number; mine: boolean }[];
    attending: boolean;
  }[];
};

export type DateGroup = {
  id: number;
  name: string;
  capacity: number;
  count: number;
  status: GroupStatus;
  createdBy: MemberRef;
  attendees: MemberRef[];
  mine: boolean;
};

export type AttendanceRow = {
  date: string;
  groupId: number;
  groupName: string;
  capacity: number;
  count: number;
  status: GroupStatus;
  attendees: MemberRef[];
};

export type AdminMember = Me & { isDeleted: boolean };

export type AdminGroup = {
  id: number;
  date: string;
  name: string;
  capacity: number;
  count: number;
  status: GroupStatus;
  createdBy: MemberRef;
};

export type ChatMessage = {
  id: number;
  body: string; // 이미지 메시지는 빈 문자열
  hasImage: boolean;
  createdAt: string;
  author: MemberRef;
};

export type ChatArchive = {
  id: number;
  groupId: number;
  date: string;
  name: string;
  deletedAt: string;
  messageCount: number;
};
