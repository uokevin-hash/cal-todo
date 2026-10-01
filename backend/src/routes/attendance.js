import express from 'express';
import { requireAuth } from '../middleware.js';
import * as attendanceService from '../services/attendance.js';
import * as validate from '../validate.js';

export const router = express.Router();

router.use(requireAuth);

// FR-14. 빈 문자열 필터는 보내지 않은 것으로 본다
router.get('/', async (req, res) => {
  const q = Object.fromEntries(Object.entries(req.query).filter(([, v]) => v !== ''));
  const filters = {
    from: validate.optional(validate.date, q.from, 'from'),
    to: validate.optional(validate.date, q.to, 'to'),
    group: validate.optional(String, q.group),
    name: validate.optional(String, q.name),
    status: validate.optional(validate.oneOf, q.status, ['AVAILABLE', 'FULL'], 'status'),
    capacity: validate.optional(validate.oneOf, q.capacity, ['2', '4'], 'capacity'),
  };
  res.json(await attendanceService.search(filters, req.member.role === 'ADMIN'));
});
