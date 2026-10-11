import { Router, Request, Response } from 'express';
import { query } from '../db';

export const eventsRouter = Router();

// Listar eventos
eventsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        id, 
        nome, 
        data_horario as "dataHorario", 
        local, 
        imagem_capa as "imagemCapa", 
        visibilidade, 
        publico_estimado as "publicoEstimado", 
        categorias, 
        estado, 
        criado_em as "criadoEm", 
        atualizado_em as "atualizadoEm", 
        encerrado_em as "encerradoEm", 
        reaberto_em as "reabertoEm"
      FROM events 
      ORDER BY criado_em DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Criar evento
eventsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { id, nome, dataHorario, local, imagemCapa, visibilidade, publicoEstimado, categorias, userId, userName, userRole } = req.body;

    if (!nome || !dataHorario || !local) {
      return res.status(400).json({ error: 'Nome, data/horário e local são obrigatórios.' });
    }

    if (!categorias || !Array.isArray(categorias) || categorias.length === 0) {
      return res.status(400).json({ error: 'O evento deve possuir ao menos uma categoria obrigatória (CA-02).' });
    }

    const eventId = id || `evt-${Date.now()}`;
    const now = new Date().toISOString();

    await query(
      `INSERT INTO events (id, nome, data_horario, local, imagem_capa, visibilidade, publico_estimado, categorias, estado, criado_em, atualizado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ativo', $9, $9)`,
      [
        eventId,
        nome,
        dataHorario,
        local,
        imagemCapa || null,
        visibilidade || 'reservado',
        Number(publicoEstimado) || 100,
        JSON.stringify(categorias),
        now,
      ]
    );

    // Auditoria (CA-10)
    await query(
      `INSERT INTO audit_logs (id, timestamp, user_id, user_nome, user_role, event_id, event_nome, acao, detalhes, dispositivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'CRIAÇÃO_EVENTO', $8, $9)`,
      [
        `aud-${Date.now()}`,
        now,
        userId || 'user-admin',
        userName || 'Administrador',
        userRole || 'admin',
        eventId,
        nome,
        `Evento cadastrado com público estimado de ${publicoEstimado || 100} participantes.`,
        req.headers['user-agent'] || 'API Server',
      ]
    );

    res.status(201).json({ id: eventId, message: 'Evento criado com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar evento
eventsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, dataHorario, local, imagemCapa, visibilidade, publicoEstimado, categorias, userId, userName, userRole } = req.body;

    // Verificar se evento está encerrado (CA-14)
    const current = await query('SELECT estado, nome FROM events WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }
    if (current.rows[0].estado === 'encerrado') {
      return res.status(403).json({ error: 'Este evento está encerrado. Nenhuma modificação operacional é permitida (CA-14).' });
    }

    if (categorias && (!Array.isArray(categorias) || categorias.length === 0)) {
      return res.status(400).json({ error: 'O evento deve manter ao menos uma categoria obrigatória (CA-02).' });
    }

    const now = new Date().toISOString();
    await query(
      `UPDATE events 
       SET nome = COALESCE($1, nome),
           data_horario = COALESCE($2, data_horario),
           local = COALESCE($3, local),
           imagem_capa = COALESCE($4, imagem_capa),
           visibilidade = COALESCE($5, visibilidade),
           publico_estimado = COALESCE($6, publico_estimado),
           categorias = COALESCE($7, categorias),
           atualizado_em = $8
       WHERE id = $9`,
      [
        nome,
        dataHorario,
        local,
        imagemCapa,
        visibilidade,
        publicoEstimado ? Number(publicoEstimado) : null,
        categorias ? JSON.stringify(categorias) : null,
        now,
        id,
      ]
    );

    res.json({ message: 'Evento atualizado com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Encerrar evento (CA-14)
eventsRouter.post('/:id/close', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName, userRole } = req.body;
    const now = new Date().toISOString();

    const ev = await query('SELECT nome FROM events WHERE id = $1', [id]);
    if (ev.rows.length === 0) return res.status(404).json({ error: 'Evento não encontrado.' });

    await query(
      `UPDATE events SET estado = 'encerrado', encerrado_em = $1, atualizado_em = $1 WHERE id = $2`,
      [now, id]
    );

    // Auditoria (CA-10, CA-14)
    await query(
      `INSERT INTO audit_logs (id, timestamp, user_id, user_nome, user_role, event_id, event_nome, acao, detalhes, dispositivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ENCERRAMENTO_EVENTO', 'Evento formalmente encerrado pelo gestor (CA-14).', $8)`,
      [
        `aud-${Date.now()}`,
        now,
        userId || 'user-admin',
        userName || 'Administrador',
        userRole || 'admin',
        id,
        ev.rows[0].nome,
        req.headers['user-agent'] || 'API Server',
      ]
    );

    res.json({ message: 'Evento encerrado com sucesso (CA-14).' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reabrir evento (CA-14 - Apenas admin)
eventsRouter.post('/:id/reopen', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName, userRole } = req.body;
    const now = new Date().toISOString();

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem reabrir eventos encerrados (CA-14).' });
    }

    const ev = await query('SELECT nome FROM events WHERE id = $1', [id]);
    if (ev.rows.length === 0) return res.status(404).json({ error: 'Evento não encontrado.' });

    await query(
      `UPDATE events SET estado = 'ativo', reaberto_em = $1, atualizado_em = $1 WHERE id = $2`,
      [now, id]
    );

    // Auditoria (CA-10, CA-14)
    await query(
      `INSERT INTO audit_logs (id, timestamp, user_id, user_nome, user_role, event_id, event_nome, acao, detalhes, dispositivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'REABERTURA_EVENTO', 'Evento reaberto em caráter excepcional por administrador com auditoria ativa (CA-14).', $8)`,
      [
        `aud-${Date.now()}`,
        now,
        userId,
        userName,
        userRole,
        id,
        ev.rows[0].nome,
        req.headers['user-agent'] || 'API Server',
      ]
    );

    res.json({ message: 'Evento reaberto com sucesso (CA-14).' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
