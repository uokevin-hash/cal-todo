import express from 'express';
import { requireAdmin, requireAuth } from '../middleware.js';
import * as attendanceService from '../services/attendance.js';
import * as groupsService from '../services/groups.js';
import * as membersService from '../services/members.js';
import * as validate from '../validate.js';

// R-8: 관리자만(L-6)
export const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/members', async (req, res) => {
  res.json(
    await membersService.listMembers({
      includeDeleted: req.query.includeDeleted === 'true', // FR-16
      q: req.query.q ? String(req.query.q) : null, // FR-19
    }),
  );
});

router.patch('/members/:id', async (req, res) => {
  const id = validate.id(req.params.id);
  const body = req.body ?? {};
  const fields = {
    name: validate.optional(validate.name, body.name),
    email: validate.optional(validate.email, body.email),
    phone: validate.optional(validate.phone, body.phone),
    birthDate: validate.optional(validate.birthDate, body.birthDate),
    role: validate.optional(validate.oneOf, body.role, ['MEMBER', 'ADMIN'], 'role'), // R-10
  };
  // R-8: 관리자는 현재 비밀번호 없이 새 비밀번호를 지정한다
  const newPassword = validate.optional(validate.password, body.newPassword, 'newPassword');
  res.json(await membersService.updateMemberByAdmin(req.member.id, id, fields, newPassword));
});

router.delete('/members/:id', async (req, res) => {
  await membersService.deleteMemberByAdmin(req.member.id, validate.id(req.params.id));
  res.status(204).end();
});

router.get('/groups', async (req, res) => {
  const from = validate.optional(validate.date, req.query.from || undefined, 'from');
  const to = validate.optional(validate.date, req.query.to || undefined, 'to');
  res.json(await groupsService.listGroupsForAdmin({ from, to }));
});

router.patch('/groups/:id', async (req, res) => {
  const id = validate.id(req.params.id);
  const body = req.body ?? {};
  res.json(
    await groupsService.updateGroup(id, {
      name: validate.optional(validate.name, body.name),
      capacity: validate.optional(validate.capacity, body.capacity),
    }),
  );
});

router.delete('/groups/:id/attendance/:memberId', async (req, res) => {
  const groupId = validate.id(req.params.id);
  await attendanceService.removeAttendee(groupId, validate.id(req.params.memberId));
  res.status(204).end();
});

router.delete('/groups/:id', async (req, res) => {
  await groupsService.deleteGroup(validate.id(req.params.id));
  res.status(204).end();
});
