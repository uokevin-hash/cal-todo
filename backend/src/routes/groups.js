import express from 'express';
import { requireAuth } from '../middleware.js';
import * as attendanceService from '../services/attendance.js';
import * as validate from '../validate.js';

export const router = express.Router();

router.use(requireAuth);

router.post('/:id/attendance', async (req, res) => {
  const groupId = validate.id(req.params.id);
  res.status(201).json(await attendanceService.attendGroup(req.member.id, groupId));
});

router.delete('/:id/attendance', async (req, res) => {
  await attendanceService.cancel(req.member.id, validate.id(req.params.id));
  res.status(204).end();
});
