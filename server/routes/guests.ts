import { Router, Request, Response } from 'express';
import { query } from '../db';

export const guestsRouter = Router();

// Middleware auxiliar de verificação de evento encerrado (CA-14)
async function assertEventActive(eventId: string) {
  const ev = await query('SELECT estado FROM events WHERE id = $1', [eventId]);
  if (ev.rows.length === 0) throw new Error('Evento não encontrado.');
  if (ev.rows[0].estado === 'encerrado') {
    throw new Error('Este evento está encerrado. Nenhuma modificação operacional é permitida (CA-14).');
  }
}

// Listar convidados por evento
guestsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.query;
    if (!eventId) {
      return res.status(400).json({ error: 'eventId é obrigatório.' });
    }

    const result = await query(
      `SELECT 
        id, 
        event_id as "eventId", 
        numero, 
        nome, 
        categoria, 
        rsvp, 
        papel, 
        relacionamento, 
        presenca, 
        check_in_at as "checkInAt", 
        check_in_by as "checkInBy", 
        observacao, 
        conflito_ativo as "conflitoAtivo", 
        created_at as "createdAt", 
        updated_at as "updatedAt", 
        deleted_at as "deletedAt"
       FROM guests 
       WHERE event_id = $1 AND deleted_at IS NULL
       ORDER BY numero ASC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cadastrar novo convidado (CA-02, CA-13)
guestsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      eventId,
      nome,
      categoria,
      rsvp = 'pendente',
      papel = 'titular',
      relacionamento = null,
      observacao = '',
      userId,
      userName,
      userRole,
    } = req.body;

    await assertEventActive(eventId);

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'O nome do convidado é obrigatório.' });
    }
    if (!categoria || !categoria.trim()) {
      return res.status(400).json({ error: 'A categoria do convidado é obrigatória (CA-02).' });
    }

    // Calcular próximo número estável (CA-13) considerando inclusive excluídos
    const maxNumRes = await query('SELECT COALESCE(MAX(numero), 0) as max_num FROM guests WHERE event_id = $1', [eventId]);
    const proximoNumero = Number(maxNumRes.rows[0].max_num) + 1;

    const guestId = `gst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    let papelFinal = papel;
    let relFinal = relacionamento;

    // Regra CA-05 na criação: se acompanhante confirmado mas titular pendente/recusado
    if (papel === 'acompanhante' && rsvp === 'confirmado' && relacionamento?.titularId) {
      const titularRes = await query('SELECT rsvp, nome FROM guests WHERE id = $1', [relacionamento.titularId]);
      if (titularRes.rows.length > 0 && titularRes.rows[0].rsvp !== 'confirmado') {
        papelFinal = 'representante';
        relFinal = {
          tipoOriginal: 'acompanhante',
          titularId: relacionamento.titularId,
          titularNome: titularRes.rows[0].nome,
          motivo: `Titular não está confirmado no cadastro do acompanhante (CA-05).`,
          dataVinculo: now,
        };
      }
    }

    await query(
      `INSERT INTO guests (id, event_id, numero, nome, categoria, rsvp, papel, relacionamento, presenca, observacao, conflito_ativo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'aguardando', $9, false, $10, $10)`,
      [
        guestId,
        eventId,
        proximoNumero,
        nome.trim(),
        categoria.trim(),
        rsvp,
        papelFinal,
        relFinal ? JSON.stringify(relFinal) : null,
        observacao,
        now,
      ]
    );

    // Auditoria (CA-10)
    const ev = await query('SELECT nome FROM events WHERE id = $1', [eventId]);
    await query(
      `INSERT INTO audit_logs (id, timestamp, user_id, user_nome, user_role, event_id, event_nome, guest_id, guest_numero, guest_nome, acao, detalhes, dispositivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'CADASTRO_CONVIDADO', $11, $12)`,
      [
        `aud-${Date.now()}`,
        now,
        userId || 'user-admin',
        userName || 'Administrador',
        userRole || 'admin',
        eventId,
        ev.rows[0]?.nome || 'Evento',
        guestId,
        proximoNumero,
        nome.trim(),
        `Convidado #${proximoNumero} cadastrado como ${papelFinal} (${categoria}).`,
        req.headers['user-agent'] || 'API Server',
      ]
    );

    res.status(201).json({ id: guestId, numero: proximoNumero, message: 'Convidado cadastrado com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar RSVP com regras de Cerimonial (CA-04, CA-05, CA-06)
guestsRouter.post('/:id/rsvp', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { novoRsvp, userId, userName, userRole } = req.body;

    const guestRes = await query('SELECT * FROM guests WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (guestRes.rows.length === 0) return res.status(404).json({ error: 'Convidado não encontrado.' });

    const guest = guestRes.rows[0];
    await assertEventActive(guest.event_id);

    const now = new Date().toISOString();
    let novoPapel = guest.papel;
    let novoRel = guest.relacionamento;
    let novoConflito = false;

    // REGRA 1: Se é ACOMPANHANTE e confirma enquanto titular NÃO está confirmado -> PROMOVER A REPRESENTANTE (CA-05)
    if (guest.papel === 'acompanhante' && novoRsvp === 'confirmado' && guest.relacionamento?.titularId) {
      const titularRes = await query('SELECT * FROM guests WHERE id = $1', [guest.relacionamento.titularId]);
      if (titularRes.rows.length > 0 && titularRes.rows[0].rsvp !== 'confirmado') {
        novoPapel = 'representante';
        novoRel = {
          tipoOriginal: 'acompanhante',
          titularId: titularRes.rows[0].id,
          titularNome: titularRes.rows[0].nome,
          motivo: `Acompanhante confirmou presença enquanto titular estava ${titularRes.rows[0].rsvp} (CA-05).`,
          dataVinculo: now,
        };
      }
    }

    // REGRA 2: Se é TITULAR e confirma, verificar se há representantes vinculados já confirmados -> CONFLITO (CA-06)
    if (guest.papel === 'titular' && novoRsvp === 'confirmado') {
      const reps = await query(
        `SELECT id, numero, nome FROM guests 
         WHERE event_id = $1 AND deleted_at IS NULL AND papel = 'representante' AND rsvp = 'confirmado' 
         AND relacionamento->>'titularId' = $2`,
        [guest.event_id, guest.id]
      );
      if (reps.rows.length > 0) {
        novoConflito = true;
        // Marca também os representantes como conflitantes
        for (const r of reps.rows) {
          await query('UPDATE guests SET conflito_ativo = true, updated_at = $1 WHERE id = $2', [now, r.id]);
        }
      }
    }

    // REGRA 3: Se TITULAR deixa de ser confirmado, qualquer acompanhante confirmado dele é promovido a representante (CA-05)
    if (guest.papel === 'titular' && (novoRsvp === 'pendente' || novoRsvp === 'recusado')) {
      // Remove conflitos anteriores
      await query(
        `UPDATE guests SET conflito_ativo = false, updated_at = $1 
         WHERE event_id = $2 AND relacionamento->>'titularId' = $3`,
        [now, guest.event_id, guest.id]
      );

      const acomps = await query(
        `SELECT id, numero, nome FROM guests 
         WHERE event_id = $1 AND deleted_at IS NULL AND papel = 'acompanhante' AND rsvp = 'confirmado' 
         AND relacionamento->>'titularId' = $2`,
        [guest.event_id, guest.id]
      );

      for (const ac of acomps.rows) {
        const relPromo = {
          tipoOriginal: 'acompanhante',
          titularId: guest.id,
          titularNome: guest.nome,
          motivo: `Acompanhante promovido após titular deixar de estar confirmado (CA-05).`,
          dataVinculo: now,
        };
        await query(
          `UPDATE guests SET papel = 'representante', relacionamento = $1, conflito_ativo = false, updated_at = $2 WHERE id = $3`,
          [JSON.stringify(relPromo), now, ac.id]
        );
      }
    }

    // Atualiza convidado
    await query(
      `UPDATE guests 
       SET rsvp = $1, papel = $2, relacionamento = $3, conflito_ativo = $4, updated_at = $5 
       WHERE id = $6`,
      [novoRsvp, novoPapel, novoRel ? JSON.stringify(novoRel) : null, novoConflito, now, id]
    );

    // Auditoria (CA-10)
    const ev = await query('SELECT nome FROM events WHERE id = $1', [guest.event_id]);
    await query(
      `INSERT INTO audit_logs (id, timestamp, user_id, user_nome, user_role, event_id, event_nome, guest_id, guest_numero, guest_nome, acao, detalhes, dispositivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ALTERAÇÃO_RSVP', $11, $12)`,
      [
        `aud-${Date.now()}`,
        now,
        userId || 'user-admin',
        userName || 'Administrador',
        userRole || 'admin',
        guest.event_id,
        ev.rows[0]?.nome || 'Evento',
        guest.id,
        guest.numero,
        guest.nome,
        `RSVP alterado de ${guest.rsvp} para ${novoRsvp}${novoConflito ? ' (CONFLITO DETECTADO CA-06)' : ''}.`,
        req.headers['user-agent'] || 'API Server',
      ]
    );

    res.json({ message: 'RSVP atualizado com sucesso.', conflitoAtivo: novoConflito });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Credenciamento (Check-in) com idempotência garantida (CA-09, CA-13)
guestsRouter.post('/:id/checkin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operadorNome, userId, userName, userRole } = req.body;

    const guestRes = await query('SELECT * FROM guests WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (guestRes.rows.length === 0) return res.status(404).json({ error: 'Convidado não encontrado.' });

    const guest = guestRes.rows[0];
    await assertEventActive(guest.event_id);

    // CA-09: Idempotência - se já estiver presente, retorna sucesso sem duplicar
    if (guest.presenca === 'presente') {
      return res.json({
        message: 'Convidado já credenciado anteriormente (idempotente - CA-09).',
        alreadyCheckedIn: true,
        checkInAt: guest.check_in_at,
        checkInBy: guest.check_in_by,
      });
    }

    const now = new Date().toISOString();
    const operador = operadorNome || userName || 'Recepção';

    await query(
      `UPDATE guests SET presenca = 'presente', check_in_at = $1, check_in_by = $2, updated_at = $1 WHERE id = $3`,
      [now, operador, id]
    );

    // Auditoria (CA-10)
    const ev = await query('SELECT nome FROM events WHERE id = $1', [guest.event_id]);
    await query(
      `INSERT INTO audit_logs (id, timestamp, user_id, user_nome, user_role, event_id, event_nome, guest_id, guest_numero, guest_nome, acao, detalhes, dispositivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'CHECK_IN_CONCLUIDO', $11, $12)`,
      [
        `aud-${Date.now()}`,
        now,
        userId || 'user-operador',
        userName || operador,
        userRole || 'operador',
        guest.event_id,
        ev.rows[0]?.nome || 'Evento',
        guest.id,
        guest.numero,
        guest.nome,
        `Credenciamento realizado com sucesso pelo operador ${operador} (CA-09).`,
        req.headers['user-agent'] || 'API Server',
      ]
    );

    res.json({ message: 'Credenciamento realizado com sucesso (CA-09).', checkInAt: now, checkInBy: operador });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Desfazer check-in
guestsRouter.post('/:id/undo-checkin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName, userRole } = req.body;

    const guestRes = await query('SELECT * FROM guests WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (guestRes.rows.length === 0) return res.status(404).json({ error: 'Convidado não encontrado.' });

    const guest = guestRes.rows[0];
    await assertEventActive(guest.event_id);

    const now = new Date().toISOString();
    await query(
      `UPDATE guests SET presenca = 'aguardando', check_in_at = NULL, check_in_by = NULL, updated_at = $1 WHERE id = $2`,
      [now, id]
    );

    res.json({ message: 'Credenciamento revertido com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resolução explícita de conflito (CA-06)
guestsRouter.post('/resolve-conflict', async (req: Request, res: Response) => {
  try {
    const { titularId, representanteId, decisao, userId, userName, userRole } = req.body;
    // decisao: 'manter_titular' | 'manter_representante' | 'manter_ambos'

    const now = new Date().toISOString();

    if (decisao === 'manter_titular') {
      await query(`UPDATE guests SET rsvp = 'confirmado', conflito_ativo = false, updated_at = $1 WHERE id = $2`, [now, titularId]);
      await query(`UPDATE guests SET rsvp = 'recusado', conflito_ativo = false, updated_at = $1 WHERE id = $2`, [now, representanteId]);
    } else if (decisao === 'manter_representante') {
      await query(`UPDATE guests SET rsvp = 'recusado', conflito_ativo = false, updated_at = $1 WHERE id = $2`, [now, titularId]);
      await query(`UPDATE guests SET rsvp = 'confirmado', conflito_ativo = false, updated_at = $1 WHERE id = $2`, [now, representanteId]);
    } else if (decisao === 'manter_ambos') {
      await query(`UPDATE guests SET rsvp = 'confirmado', conflito_ativo = false, updated_at = $1 WHERE id = $2`, [now, titularId]);
      await query(
        `UPDATE guests SET rsvp = 'confirmado', papel = 'acompanhante', conflito_ativo = false, updated_at = $1 WHERE id = $2`,
        [now, representanteId]
      );
    }

    res.json({ message: 'Conflito de representação resolvido com sucesso (CA-06).' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Exclusão lógica com numeração estável preservada (CA-13)
guestsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName, userRole } = req.body;

    const guestRes = await query('SELECT * FROM guests WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (guestRes.rows.length === 0) return res.status(404).json({ error: 'Convidado não encontrado.' });

    const guest = guestRes.rows[0];
    await assertEventActive(guest.event_id);

    const now = new Date().toISOString();
    await query('UPDATE guests SET deleted_at = $1, updated_at = $1 WHERE id = $2', [now, id]);

    // Auditoria (CA-10)
    const ev = await query('SELECT nome FROM events WHERE id = $1', [guest.event_id]);
    await query(
      `INSERT INTO audit_logs (id, timestamp, user_id, user_nome, user_role, event_id, event_nome, guest_id, guest_numero, guest_nome, acao, detalhes, dispositivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'EXCLUSÃO_LÓGICA', $11, $12)`,
      [
        `aud-${Date.now()}`,
        now,
        userId || 'user-admin',
        userName || 'Administrador',
        userRole || 'admin',
        guest.event_id,
        ev.rows[0]?.nome || 'Evento',
        guest.id,
        guest.numero,
        guest.nome,
        `Convidado #${guest.numero} excluído logicamente. Numeração mantida estável para crachás (CA-13).`,
        req.headers['user-agent'] || 'API Server',
      ]
    );

    res.json({ message: 'Convidado excluído com sucesso (numeração mantida estável CA-13).' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
