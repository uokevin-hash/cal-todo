import express from 'express';
import { requireAuth } from '../middleware.js';
import * as attendanceService from '../services/attendance.js';
import * as groupsService from '../services/groups.js';
import * as validate from '../validate.js';

// /api 바로 아래에 붙으므로 requireAuth는 경로마다 단다(없는 경로는 404로 남긴다)
export const router = express.Router();

router.get('/calendar', requireAuth, async (req, res) => {
  const month = validate.optional(validate.month, req.query.month);
  res.json(await groupsService.getCalendar(req.member.id, month));
});

router.get('/dates/:date/groups', requireAuth, async (req, res) => {
  const date = validate.date(req.params.date);
  res.json(await groupsService.getDateGroups(date, req.member));
});

router.post('/dates/:date/groups', requireAuth, async (req, res) => {
  const body = req.body ?? {};
  const group = await groupsService.createGroup(req.member.id, {
    date: validate.date(req.params.date),
    name: validate.name(body.name),
    capacity: validate.capacity(body.capacity),
    attend: validate.optional(validate.boolean, body.attend, 'attend') ?? true, // SCR-05 기본 선택
  });
  res.status(201).json(group);
});

router.post('/dates/:date/attendance', requireAuth, async (req, res) => {
  const date = validate.date(req.params.date);
  const capacity = validate.optional(validate.capacity, req.body?.capacity);
  res.status(201).json(await attendanceService.attendDefault(req.member.id, date, capacity));
});
