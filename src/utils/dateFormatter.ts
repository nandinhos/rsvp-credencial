/**
 * Utilitários para formatação e interpretação de data e horário institucional
 */

export const MESES_BR = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function formatToEventDateTime(dateStr: string, timeStr: string): string {
  if (!dateStr) return '';
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

  const mesNome = MESES_BR[month - 1] || '';
  const horaParte = timeStr ? ` às ${timeStr}` : '';
  return `${day} de ${mesNome} de ${year}${horaParte}`;
}

export function parseEventDateTime(raw: string): { date: string; time: string } {
  if (!raw || !raw.trim()) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return { date: `${y}-${m}-${d}`, time: '19:00' };
  }

  const str = raw.trim();

  // 1. Se for formato ISO tipo YYYY-MM-DDTHH:mm ou YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [dPart, tPart] = str.split('T');
    return {
      date: dPart,
      time: tPart ? tPart.slice(0, 5) : '19:00',
    };
  }

  // 2. Se for formato DD/MM/YYYY às HH:mm
  const slashMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+às\s+(\d{1,2}:\d{2}))?/i);
  if (slashMatch) {
    const d = slashMatch[1].padStart(2, '0');
    const m = slashMatch[2].padStart(2, '0');
    const y = slashMatch[3];
    const t = slashMatch[4] || '19:00';
    return { date: `${y}-${m}-${d}`, time: t };
  }

  // 3. Se for formato por extenso: "10 de Dezembro de 2026 às 19:00"
  const extensoMatch = str.match(
    /(\d{1,2})\s+de\s+([A-Za-zçÇãÃéÉ]+)\s+de\s+(\d{4})(?:\s+às\s+(\d{1,2}:\d{2}))?/i
  );
  if (extensoMatch) {
    const d = extensoMatch[1].padStart(2, '0');
    const monthName = extensoMatch[2].toLowerCase();
    const y = extensoMatch[3];
    const t = extensoMatch[4] || '19:00';

    const mesesMap: Record<string, string> = {
      janeiro: '01',
      fevereiro: '02',
      março: '03',
      marco: '03',
      abril: '04',
      maio: '05',
      junho: '06',
      julho: '07',
      agosto: '08',
      setembro: '09',
      outubro: '10',
      novembro: '11',
      dezembro: '12',
    };

    const m = mesesMap[monthName] || '11';
    return { date: `${y}-${m}-${d}`, time: t.padStart(5, '0') };
  }

  // Fallback seguro
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return { date: `${y}-${m}-${d}`, time: '19:00' };
}
