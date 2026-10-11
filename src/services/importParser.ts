import * as XLSX from 'xlsx';

export interface RawImportRow {
  nome: string;
  tipo: string;
  relacao?: string;
  confirmacao?: string | number;
}

// Parser de linhas CSV respeitando aspas duplas ("Nome com, vírgula", "outro")
export function parseCSVLine(text: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cur += '"';
        i++; // pula aspas escapadas
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

// Parser para texto colado (formato mínimo: nome,tipo,relacao,confirmacao separados por ; ou quebra de linha)
export function parsePastedText(rawText: string): RawImportRow[] {
  if (!rawText || !rawText.trim()) return [];

  // Primeiro divide por quebras de linha ou por ponto e vírgula se for tudo em uma linha
  const lines = rawText
    .split(/[\r\n]+/)
    .flatMap(line => line.split(';'))
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const rows: RawImportRow[] = [];

  for (const line of lines) {
    // Detecta se é cabeçalho comum e ignora
    const lower = line.toLowerCase();
    if (lower.startsWith('nome,tipo') || lower.startsWith('nome;tipo')) {
      continue;
    }

    const cols = parseCSVLine(line, line.includes(';') && !line.includes(',') ? ';' : ',');
    if (cols.length >= 1) {
      rows.push({
        nome: cols[0] || '',
        tipo: cols[1] || '',
        relacao: cols[2] || '',
        confirmacao: cols[3] !== undefined ? cols[3] : '',
      });
    }
  }

  return rows;
}

// Parser de Markdown Table (| Nome | Categoria | Relação | Confirmação |)
export function parseMarkdownTable(mdContent: string): RawImportRow[] {
  const lines = mdContent.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.startsWith('|') && l.endsWith('|'));
  const rows: RawImportRow[] = [];

  // Pula cabeçalho e divisor (ex: |---|---|)
  const dataLines = lines.filter(l => !l.includes('---'));

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const cells = line.split('|').map(c => c.trim()).slice(1, -1);
    if (cells.length === 0) continue;

    // Se primeira linha for cabeçalho
    if (i === 0 && cells[0].toLowerCase().includes('nome')) {
      continue;
    }

    rows.push({
      nome: cells[0] || '',
      tipo: cells[1] || '',
      relacao: cells[2] || '',
      confirmacao: cells[3] !== undefined ? cells[3] : '',
    });
  }

  return rows;
}

// Parser para arquivos (.xlsx, .csv, .txt, .md)
export async function parseImportFile(file: File): Promise<RawImportRow[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'xlsx' || extension === 'xls') {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const json: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    return json.map(row => {
      // Procura chaves insensíveis a maiúsculas
      const keys = Object.keys(row);
      const findKey = (candidates: string[]) => keys.find(k => candidates.some(c => k.toLowerCase().includes(c)));

      const kNome = findKey(['nome', 'name', 'convidado']);
      const kTipo = findKey(['tipo', 'categoria', 'category']);
      const kRelacao = findKey(['relacao', 'relação', 'titular', 'acompanha', 'representa']);
      const kConf = findKey(['confirmacao', 'confirmação', 'rsvp', 'status']);

      return {
        nome: String(kNome ? row[kNome] : (row['nome'] ?? '')).trim(),
        tipo: String(kTipo ? row[kTipo] : (row['tipo'] ?? '')).trim(),
        relacao: String(kRelacao ? row[kRelacao] : (row['relacao'] ?? '')).trim(),
        confirmacao: kConf ? String(row[kConf]) : (row['confirmacao'] !== undefined ? String(row['confirmacao']) : ''),
      };
    });
  }

  const textContent = await file.text();

  if (extension === 'md') {
    return parseMarkdownTable(textContent);
  }

  // CSV ou TXT
  return parsePastedText(textContent);
}

// Download do modelo de exemplo
export function downloadSampleTemplate(format: 'csv' | 'xlsx') {
  const sampleData = [
    {
      'Nome': 'Gen. Silveira Ramos',
      'Tipo': 'Autoridade',
      'Relacao': '',
      'Confirmacao': '1',
    },
    {
      'Nome': 'Sra. Mariana Ramos',
      'Tipo': 'Convidado geral',
      'Relacao': 'Gen. Silveira Ramos',
      'Confirmacao': '1',
    },
    {
      'Nome': 'Dr. Roberto Magalhães',
      'Tipo': 'Diretoria',
      'Relacao': '',
      'Confirmacao': '0',
    },
    {
      'Nome': 'Dra. Camila Bittencourt',
      'Tipo': 'Diretoria',
      'Relacao': 'Dr. Roberto Magalhães',
      'Confirmacao': '1',
    },
  ];

  if (format === 'csv') {
    const csvContent =
      'nome,tipo,relacao,confirmacao\n' +
      '"Gen. Silveira Ramos","Autoridade","",1\n' +
      '"Sra. Mariana Ramos","Convidado geral","Gen. Silveira Ramos",1\n' +
      '"Dr. Roberto Magalhães","Diretoria","",0\n' +
      '"Dra. Camila Bittencourt","Diretoria","Dr. Roberto Magalhães",1\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_importacao_convidados.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');
    XLSX.writeFile(workbook, 'modelo_importacao_convidados.xlsx');
  }
}
