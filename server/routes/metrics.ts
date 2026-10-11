import { Router, Request, Response } from 'express';
import { query } from '../db';

export const metricsRouter = Router();

metricsRouter.get('/:eventId', async (req: Request, res: Response) => {
  try {
    const eventId = String(req.params.eventId || req.query.eventId || '');

    // Buscar capacidade
    const evRes = await query('SELECT publico_estimado FROM events WHERE id = $1', [eventId]);
    if (evRes.rows.length === 0) return res.status(404).json({ error: 'Evento não encontrado.' });
    const publicoEstimado = Number(evRes.rows[0].publico_estimado) || 0;

    // Buscar todos os convidados ativos do evento
    const guestsRes = await query(
      `SELECT id, numero, nome, rsvp, papel, presenca, conflito_ativo, relacionamento 
       FROM guests 
       WHERE event_id = $1 AND deleted_at IS NULL`,
      [eventId]
    );

    const guests = guestsRes.rows;

    let confirmadosTitulares = 0;
    let acompanhantesConfirmados = 0;
    let representantesConfirmados = 0;
    let naoConfirmados = 0;
    let presencas = 0;
    let conflitosCount = 0;
    const conflitos: any[] = [];

    for (const g of guests) {
      if (g.presenca === 'presente') presencas++;

      if (g.rsvp === 'confirmado') {
        if (g.papel === 'titular') confirmadosTitulares++;
        else if (g.papel === 'acompanhante') acompanhantesConfirmados++;
        else if (g.papel === 'representante') representantesConfirmados++;
      } else {
        naoConfirmados++;
      }

      if (g.conflito_ativo) {
        conflitosCount++;
        conflitos.push(g);
      }
    }

    // Zero dupla contagem (CA-07): participantesPrevistos = soma exata dos confirmados
    const participantesPrevistos = confirmadosTitulares + acompanhantesConfirmados + representantesConfirmados;
    const saldoCapacidade = publicoEstimado - participantesPrevistos;
    const ausentesPrevistos = Math.max(0, participantesPrevistos - presencas);

    const taxaConfirmacao = publicoEstimado > 0 ? (participantesPrevistos / publicoEstimado) * 100 : null;
    const taxaComparecimento = participantesPrevistos > 0 ? (presencas / participantesPrevistos) * 100 : null;

    res.json({
      publicoEstimado,
      confirmadosTitulares,
      acompanhantesConfirmados,
      representantesConfirmados,
      naoConfirmados,
      presencas,
      participantesPrevistos,
      taxaConfirmacao,
      taxaComparecimento,
      saldoCapacidade,
      ausentesPrevistos,
      totalCadastrados: guests.length,
      conflitosCount,
      conflitos,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
