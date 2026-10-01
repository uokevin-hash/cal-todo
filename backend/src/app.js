import express from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler, notFound } from './errors.js';
import { router as adminRouter } from './routes/admin.js';
import { router as attendanceRouter } from './routes/attendance.js';
import { router as authRouter } from './routes/auth.js';
import { router as datesRouter } from './routes/dates.js';
import { router as groupsRouter } from './routes/groups.js';
import { router as meRouter } from './routes/me.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json());
app.use(cookieParser());

// 정적 파일 서빙은 OPS-2(C-20)
export const api = express.Router();
api.use('/auth', authRouter);
api.use('/me', meRouter);
api.use(datesRouter); // /calendar, /dates/*
api.use('/groups', groupsRouter);
api.use('/attendance', attendanceRouter);
api.use('/admin', adminRouter);
app.use('/api', api, notFound);

app.use(errorHandler);
