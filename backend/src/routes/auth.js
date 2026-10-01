import express from 'express';
import { config } from '../config.js';
import * as auth from '../services/auth.js';
import * as membersService from '../services/members.js';
import * as validate from '../validate.js';

export const router = express.Router();

const COOKIE = 'refresh_token';
// C-7: 쿠키는 /api/auth에만 전송
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: config.production,
  path: '/api/auth',
};

// 로그인·재발급·비밀번호 변경(PATCH /me)이 같이 쓴다
export function sendTokens(res, { accessToken, refreshToken }) {
  res.cookie(COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: 14 * 24 * 60 * 60 * 1000,
  });
  res.json({ accessToken });
}

router.post('/signup', async (req, res) => {
  const body = req.body ?? {};
  await membersService.signup({
    name: validate.name(body.name),
    email: validate.email(body.email),
    password: validate.password(body.password),
    phone: validate.phone(body.phone),
    birthDate: validate.birthDate(body.birthDate),
  });
  res.status(201).end();
});

router.post('/login', async (req, res) => {
  const body = req.body ?? {};
  const tokens = await auth.login({
    email: validate.email(body.email),
    password: validate.password(body.password),
  });
  sendTokens(res, tokens);
});

router.post('/refresh', async (req, res) => {
  sendTokens(res, await auth.refresh(req.cookies[COOKIE]));
});

router.post('/logout', async (req, res) => {
  await auth.logout(req.cookies[COOKIE]);
  res.clearCookie(COOKIE, cookieOptions);
  res.status(204).end();
});
