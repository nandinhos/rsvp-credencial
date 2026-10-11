import { Router, Request, Response } from 'express';
import { query } from '../db';

export const usersRouter = Router();

usersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT id, nome, email, cargo, role, authorized_event_ids as "authorizedEventIds" FROM users ORDER BY nome ASC'
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
