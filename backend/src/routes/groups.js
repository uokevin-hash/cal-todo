import express from 'express';
import { config } from '../config.js';
import { requireAuth } from '../middleware.js';
import * as attendanceService from '../services/attendance.js';
import * as groupsService from '../services/groups.js';
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

router.get('/:id/messages', async (req, res) => {
  res.json(await groupsService.listMessages(validate.id(req.params.id), req.member));
});

router.post('/:id/messages', async (req, res) => {
  const groupId = validate.id(req.params.id);
  const body = validate.messageBody(req.body?.body);
  res.status(201).json(await groupsService.postMessage(groupId, req.member.id, body));
});

// 붙여넣은 이미지. 본문은 이미지 바이트 그대로(Content-Type: image/*)
const imageBody = express.raw({ type: validate.CHAT_IMAGE_TYPES, limit: config.chatImageMaxBytes });

router.post('/:id/images', imageBody, async (req, res) => {
  const groupId = validate.id(req.params.id);
  const image = validate.chatImage(req.body, req.is(validate.CHAT_IMAGE_TYPES) || '');
  res.status(201).json(await groupsService.postImage(groupId, req.member.id, image));
});

router.get('/:id/messages/:messageId/image', async (req, res) => {
  const groupId = validate.id(req.params.id);
  const messageId = validate.id(req.params.messageId);
  const { image, imageType } = await groupsService.getImage(groupId, messageId, req.member.id);
  res.set({ 'Content-Type': imageType, 'X-Content-Type-Options': 'nosniff' }).send(image);
});
