import { Router, Request, Response } from 'express';
import { query } from '../db';

export const auditRouter = Router();

auditRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { eventId, limit = 200 } = req.query;
    let sql = `
      SELECT 
        id, 
        timestamp, 
        user_id as "userId", 
        user_nome as "userName", 
        user_role as "userRole", 
        event_id as "eventId", 
        event_nome as "eventNome", 
        guest_id as "guestId", 
        guest_numero as "guestNumero", 
        guest_nome as "guestNome", 
        acao, 
        detalhes, 
        dispositivo
      FROM audit_logs
    `;
    const params: any[] = [];

    if (eventId) {
      sql += ' WHERE event_id = $1';
      params.push(eventId);
    }

    sql += ' ORDER BY timestamp DESC LIMIT $' + (params.length + 1);
    params.push(Number(limit));

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
