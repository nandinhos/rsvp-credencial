import * as XLSX from 'xlsx';
import { EventItem, Guest } from '../types';

// Sanitiza valores para prevenir execução indevida de fórmulas no Excel (CWE-1236 / Formula Injection)
export function sanitizeCell(value: unknown): string | number {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  // Se começar com caracteres de fórmula (=, +, -, @), prefixa com aspas simples apóstrofo
  if (['=', '+', '-', '@', '\t', '\r'].some(prefix => str.startsWith(prefix))) {
    return `'${str}`;
  }
  return str;
}

export function exportGuestsToExcel(event: EventItem, guests: Guest[], filenameSuffix: string = 'lista_completa') {
  // Prepara dados formatados com títulos claros e sem ambiguidades
  const rows = guests.map(g => {
    let papelFormatado = 'Titular';
    let origemDetalhe = '';

    if (g.papel === 'acompanhante') {
      papelFormatado = 'Acompanhante';
      origemDetalhe = g.relacionamento?.titularNome ? `Titular: ${g.relacionamento.titularNome}` : '';
    } else if (g.papel === 'representante') {
      papelFormatado = 'Representante';
      if (g.relacionamento?.tipoOriginal === 'acompanhante') {
        origemDetalhe = `Origem: acompanhante de ${g.relacionamento.titularNome || 'Titular'}`;
      } else {
        origemDetalhe = `Representando: ${g.relacionamento?.titularNome || 'Titular'}`;
      }
    }

    let rsvpTexto = 'Pendente';
    if (g.rsvp === 'confirmado') rsvpTexto = 'Confirmado';
    if (g.rsvp === 'recusado') rsvpTexto = 'Não participará';

    let presencaTexto = 'Aguardando credenciamento';
    if (g.presenca === 'presente') {
      const dataHora = g.checkInAt ? new Date(g.checkInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      presencaTexto = `Presente (${dataHora} por ${g.checkInBy || 'Recepção'})`;
    }

    return {
      'Nº Sequencial': sanitizeCell(g.numero),
      'Nome Completo': sanitizeCell(g.nome),
      'Categoria': sanitizeCell(g.categoria),
      'Papel': sanitizeCell(papelFormatado),
      'Origem / Vínculo': sanitizeCell(origemDetalhe),
      'Status RSVP': sanitizeCell(rsvpTexto),
      'Presença': sanitizeCell(presencaTexto),
      'Conflito': sanitizeCell(g.conflitoAtivo ? 'Sim - Requer Resolução' : 'Não'),
      'Observação': sanitizeCell(g.observacao || ''),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Ajusta largura estimada das colunas para legibilidade
  const colWidths = [
    { wch: 14 }, // Nº Sequencial
    { wch: 32 }, // Nome Completo
    { wch: 18 }, // Categoria
    { wch: 16 }, // Papel
    { wch: 34 }, // Origem / Vínculo
    { wch: 18 }, // Status RSVP
    { wch: 28 }, // Presença
    { wch: 14 }, // Conflito
    { wch: 35 }, // Observação
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Convidados');

  // Adiciona aba resumo do evento
  const resumo = [
    { Campo: 'Evento', Valor: sanitizeCell(event.nome) },
    { Campo: 'Data e Horário', Valor: sanitizeCell(event.dataHorario) },
    { Campo: 'Local', Valor: sanitizeCell(event.local) },
    { Campo: 'Público Estimado', Valor: sanitizeCell(event.publicoEstimado) },
    { Campo: 'Total Exportado', Valor: sanitizeCell(guests.length) },
    { Campo: 'Data de Geração', Valor: sanitizeCell(new Date().toLocaleString('pt-BR')) },
  ];
  const resumoSheet = XLSX.utils.json_to_sheet(resumo);
  XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo do Evento');

  const safeEventName = event.nome.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  const fileName = `${safeEventName}_${filenameSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}
