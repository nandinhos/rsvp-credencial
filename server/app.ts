import express from 'express';
import cors from 'cors';
import { usersRouter } from './routes/users';
import { eventsRouter } from './routes/events';
import { guestsRouter } from './routes/guests';
import { auditRouter } from './routes/audit';
import { metricsRouter } from './routes/metrics';
import { importRouter } from './routes/import';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'rsvp-credencial-backend',
  });
});

// Rotas da API
app.use('/api/users', usersRouter);
app.use('/api/events', eventsRouter);
app.use('/api/guests', guestsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/import', importRouter);
