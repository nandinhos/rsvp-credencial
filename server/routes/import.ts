import { Router, Request, Response } from 'express';
import { query } from '../db';

export const importRouter = Router();

importRouter.post('/batch', async (req: Request, res: Response) => {
  try {
    const { eventId, items, userId, userName, userRole } = req.body;

    if (!eventId || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'eventId e itens são obrigatórios.' });
    }

    const ev = await query('SELECT nome, estado FROM events WHERE id = $1', [eventId]);
    if (ev.rows.length === 0) return res.status(404).json({ error: 'Evento não encontrado.' });
    if (ev.rows[0].estado === 'encerrado') {
      return res.status(403).json({ error: 'Evento encerrado. Importação bloqueada (CA-14).' });
    }

    const now = new Date().toISOString();
    let importados = 0;

    // Obter próximo número sequencial
    const maxNumRes = await query('SELECT COALESCE(MAX(numero), 0) as max_num FROM guests WHERE event_id = $1', [eventId]);
    let proximoNumero = Number(maxNumRes.rows[0].max_num);

    for (const item of items) {
      if (item.erros && item.erros.length > 0) continue; // Pula itens com erro

      proximoNumero++;
      const guestId = `gst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      let rel = null;
      if (item.relacionadoGuestId || item.relacionadoGuestNome) {
        rel = {
          tipoOriginal: item.seraPromovido ? 'acompanhante' : item.parsedPapel,
          titularId: item.relacionadoGuestId || null,
          titularNome: item.relacionadoGuestNome || '',
          motivo: item.seraPromovido
            ? 'Promovido a representante na importação pois titular não confirmou (CA-05).'
            : 'Vínculo importado.',
          dataVinculo: now,
        };
      }

      await query(
        `INSERT INTO guests (id, event_id, numero, nome, categoria, rsvp, papel, relacionamento, presenca, observacao, conflito_ativo, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'aguardando', $9, false, $10, $10)`,
        [
          guestId,
          eventId,
          proximoNumero,
          item.nome,
          item.tipo,
          item.parsedRsvp || 'pendente',
          item.parsedPapel || 'titular',
          rel ? JSON.stringify(rel) : null,
          item.seraPromovido ? 'Promovido automaticamente a representante (CA-05)' : '',
          now,
        ]
      );
      importados++;
    }

    // Auditoria (CA-10)
    await query(
      `INSERT INTO audit_logs (id, timestamp, user_id, user_nome, user_role, event_id, event_nome, acao, detalhes, dispositivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'IMPORTAÇÃO_LOTE', $8, $9)`,
      [
        `aud-${Date.now()}`,
        now,
        userId || 'user-admin',
        userName || 'Administrador',
        userRole || 'admin',
        eventId,
        ev.rows[0].nome,
        `Importação concluída: ${importados} convidados inseridos no banco PostgreSQL.`,
        req.headers['user-agent'] || 'API Server',
      ]
    );

    res.json({ message: 'Importação processada com sucesso.', totalImportados: importados });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
