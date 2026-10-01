import express from 'express';
import { requireAuth } from '../middleware.js';
import * as membersService from '../services/members.js';
import * as validate from '../validate.js';
import { sendTokens } from './auth.js';

export const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  res.json(await membersService.getMe(req.member.id));
});

// 부분 갱신. role·isPermanent는 읽지 않는다(R-10, C-9)
router.patch('/', async (req, res) => {
  const body = req.body ?? {};
  const fields = {
    name: validate.optional(validate.name, body.name),
    email: validate.optional(validate.email, body.email),
    phone: validate.optional(validate.phone, body.phone),
    birthDate: validate.optional(validate.birthDate, body.birthDate),
  };
  const passwords = {
    currentPassword: typeof body.currentPassword === 'string' ? body.currentPassword : undefined,
    newPassword: validate.optional(validate.password, body.newPassword, 'newPassword'),
  };
  const { me, tokens } = await membersService.updateMe(req.member.id, fields, passwords);
  if (tokens) return sendTokens(res, tokens);
  res.json(me);
});
