import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from './index';

export async function runMigrations() {
  console.log('🔄 [DB] Iniciando verificação e aplicação do schema PostgreSQL...');
  
  const schemaPath = fileURLToPath(new URL('schema.sql', import.meta.url));
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // Executa DDL
  await query(schemaSql);
  console.log('✅ [DB] Schema DDL aplicado com sucesso.');

  // Verifica se há usuários cadastrados
  const usersCheck = await query('SELECT count(*) as count FROM users');
  const count = Number(usersCheck.rows[0].count);

  if (count === 0) {
    console.log('🌱 [DB] Banco vazio. Executando seed com dados padrão do Cerimonial...');
    await runSeed();
    console.log('✅ [DB] Seed inicial concluído.');
  } else {
    console.log(`ℹ️ [DB] Banco já contém ${count} usuário(s). Seed ignorado.`);
  }
}

async function runSeed() {
  // 1. Usuários
  const users = [
    {
      id: 'user-admin',
      nome: 'Cel. Valério Mendonça',
      email: 'valerio.mendonca@cerimonial.fab.br',
      cargo: 'Chefe de Cerimonial e Gabinete',
      role: 'admin',
      authorizedEventIds: ['evt-1', 'evt-2', 'evt-3'],
    },
    {
      id: 'user-gestor',
      nome: 'Maj. Patrícia Silveira',
      email: 'patricia.silveira@cerimonial.fab.br',
      cargo: 'Coordenadora Executiva de Eventos',
      role: 'gestor',
      authorizedEventIds: ['evt-1', 'evt-2'],
    },
    {
      id: 'user-operador',
      nome: 'Ten. Lucas Albuquerque',
      email: 'lucas.albuquerque@cerimonial.fab.br',
      cargo: 'Oficial de Credenciamento e Portaria',
      role: 'operador',
      authorizedEventIds: ['evt-1'],
    },
    {
      id: 'user-leitor',
      nome: 'Auditor Marcos Dias',
      email: 'marcos.dias@auditoria.fab.br',
      cargo: 'Inspetor de Auditoria e Controle',
      role: 'leitor',
      authorizedEventIds: ['evt-1'],
    },
  ];

  for (const u of users) {
    await query(
      `INSERT INTO users (id, nome, email, cargo, role, authorized_event_ids)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [u.id, u.nome, u.email, u.cargo, u.role, JSON.stringify(u.authorizedEventIds)]
    );
  }

  // 2. Categorias padrão
  const defaultCategories = [
    { id: 'cat-autoridade', nome: 'Autoridade', descricao: 'Autoridades civis, militares ou institucionais', cor: '#0B2A4A' },
    { id: 'cat-diretoria', nome: 'Diretoria', descricao: 'Diretores e membros da alta administração', cor: '#1C4E80' },
    { id: 'cat-comite', nome: 'Comitê', descricao: 'Integrantes de comissões ou comitês', cor: '#276CA3' },
    { id: 'cat-geral', nome: 'Convidado geral', descricao: 'Participantes sem classificação especial', cor: '#5B6E84' },
  ];

  // 3. Eventos
  const events = [
    {
      id: 'evt-1',
      nome: 'Solenidade Comemorativa e Outorga de Mérito Institucional',
      dataHorario: '15 de Novembro de 2026 às 19:30',
      local: 'Salão Nobre do Comando Geral · Brasília - DF',
      visibilidade: 'reservado',
      publicoEstimado: 120,
      categorias: defaultCategories,
      estado: 'ativo',
      criadoEm: '2026-10-01T10:00:00.000Z',
      atualizadoEm: '2026-10-10T08:00:00.000Z',
    },
    {
      id: 'evt-2',
      nome: 'Simpósio Estratégico de Liderança e Defesa Aeroespacial',
      dataHorario: '28 de Novembro de 2026 às 08:30',
      local: 'Auditório Santos-Dumont · Centro de Convenções',
      visibilidade: 'publico',
      publicoEstimado: 250,
      categorias: [
        ...defaultCategories,
        { id: 'cat-palestrante', nome: 'Palestrante / Painelista', descricao: 'Conferencistas convidados', cor: '#047857' },
      ],
      estado: 'ativo',
      criadoEm: '2026-10-05T14:30:00.000Z',
      atualizadoEm: '2026-10-08T11:00:00.000Z',
    },
    {
      id: 'evt-3',
      nome: 'Reunião Plenária de Alto Comando (Ciclo Anterior)',
      dataHorario: '12 de Setembro de 2026 às 14:00',
      local: 'Gabinete Superior · Ala Norte',
      visibilidade: 'reservado',
      publicoEstimado: 40,
      categorias: defaultCategories,
      estado: 'encerrado',
      criadoEm: '2026-08-20T09:00:00.000Z',
      atualizadoEm: '2026-09-12T18:00:00.000Z',
      encerradoEm: '2026-09-12T18:00:00.000Z',
    },
  ];

  for (const e of events) {
    await query(
      `INSERT INTO events (id, nome, data_horario, local, visibilidade, publico_estimado, categorias, estado, criado_em, atualizado_em, encerrado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        e.id,
        e.nome,
        e.dataHorario,
        e.local,
        e.visibilidade,
        e.publicoEstimado,
        JSON.stringify(e.categorias),
        e.estado,
        e.criadoEm,
        e.atualizadoEm,
        e.encerradoEm || null,
      ]
    );
  }

  // 4. Convidados do Evento 1
  const guests = [
    {
      id: 'gst-1',
      eventId: 'evt-1',
      numero: 1,
      nome: 'Alm. Henrique Villanova',
      categoria: 'Autoridade',
      rsvp: 'confirmado',
      papel: 'titular',
      relacionamento: null,
      presenca: 'presente',
      checkInAt: '2026-10-10T19:15:00.000Z',
      checkInBy: 'Ten. Lucas Albuquerque',
      observacao: 'Mesa de honra designada',
      conflitoAtivo: false,
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-10T19:15:00.000Z',
    },
    {
      id: 'gst-2',
      eventId: 'evt-1',
      numero: 2,
      nome: 'Sra. Beatriz Villanova',
      categoria: 'Convidado geral',
      rsvp: 'confirmado',
      papel: 'acompanhante',
      relacionamento: {
        tipoOriginal: 'acompanhante',
        titularId: 'gst-1',
        titularNome: 'Alm. Henrique Villanova',
        motivo: 'Acompanhante oficial',
        dataVinculo: '2026-10-01T10:00:00.000Z',
      },
      presenca: 'presente',
      checkInAt: '2026-10-10T19:15:00.000Z',
      checkInBy: 'Ten. Lucas Albuquerque',
      observacao: 'Acompanha Alm. Henrique',
      conflitoAtivo: false,
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-10T19:15:00.000Z',
    },
    {
      id: 'gst-3',
      eventId: 'evt-1',
      numero: 3,
      nome: 'Dr. Fernando Araripe',
      categoria: 'Diretoria',
      rsvp: 'pendente',
      papel: 'titular',
      relacionamento: null,
      presenca: 'aguardando',
      checkInAt: null,
      checkInBy: null,
      observacao: 'Aguardando confirmação de agenda',
      conflitoAtivo: false,
      createdAt: '2026-10-01T10:05:00.000Z',
      updatedAt: '2026-10-01T10:05:00.000Z',
    },
    {
      id: 'gst-4',
      eventId: 'evt-1',
      numero: 4,
      nome: 'Dra. Maria Clara Silveira',
      categoria: 'Diretoria',
      rsvp: 'confirmado',
      papel: 'representante',
      relacionamento: {
        tipoOriginal: 'acompanhante',
        titularId: 'gst-3',
        titularNome: 'Dr. Fernando Araripe',
        motivo: 'Titular pendente de confirmação (CA-05)',
        dataVinculo: '2026-10-02T14:20:00.000Z',
      },
      presenca: 'aguardando',
      checkInAt: null,
      checkInBy: null,
      observacao: 'Origem: acompanhante do Dr. Fernando',
      conflitoAtivo: false,
      createdAt: '2026-10-01T10:05:00.000Z',
      updatedAt: '2026-10-02T14:20:00.000Z',
    },
    {
      id: 'gst-5',
      eventId: 'evt-1',
      numero: 5,
      nome: 'Gen. Carlos Eduardo Vasconcelos',
      categoria: 'Autoridade',
      rsvp: 'confirmado',
      papel: 'titular',
      relacionamento: null,
      presenca: 'aguardando',
      checkInAt: null,
      checkInBy: null,
      observacao: 'Confirmou presença tardiamente gerando conflito (CA-06)',
      conflitoAtivo: true,
      createdAt: '2026-10-01T10:10:00.000Z',
      updatedAt: '2026-10-04T11:00:00.000Z',
    },
    {
      id: 'gst-6',
      eventId: 'evt-1',
      numero: 6,
      nome: 'Cel. Roberto Dornelles',
      categoria: 'Comitê',
      rsvp: 'confirmado',
      papel: 'representante',
      relacionamento: {
        tipoOriginal: 'representante',
        titularId: 'gst-5',
        titularNome: 'Gen. Carlos Eduardo Vasconcelos',
        motivo: 'Designado como representante institucional (CA-06)',
        dataVinculo: '2026-10-03T09:00:00.000Z',
      },
      presenca: 'aguardando',
      checkInAt: null,
      checkInBy: null,
      observacao: 'Conflito ativo com Gen. Carlos Eduardo',
      conflitoAtivo: true,
      createdAt: '2026-10-03T09:00:00.000Z',
      updatedAt: '2026-10-04T11:00:00.000Z',
    },
    {
      id: 'gst-7',
      eventId: 'evt-1',
      numero: 7,
      nome: 'Ministro André Portela',
      categoria: 'Autoridade',
      rsvp: 'recusado',
      papel: 'titular',
      relacionamento: null,
      presenca: 'aguardando',
      checkInAt: null,
      checkInBy: null,
      observacao: 'Informou compromisso oficial inadiável no exterior',
      conflitoAtivo: false,
      createdAt: '2026-10-01T10:15:00.000Z',
      updatedAt: '2026-10-02T16:45:00.000Z',
    },
  ];

  for (const g of guests) {
    await query(
      `INSERT INTO guests (id, event_id, numero, nome, categoria, rsvp, papel, relacionamento, presenca, check_in_at, check_in_by, observacao, conflito_ativo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO NOTHING`,
      [
        g.id,
        g.eventId,
        g.numero,
        g.nome,
        g.categoria,
        g.rsvp,
        g.papel,
        g.relacionamento ? JSON.stringify(g.relacionamento) : null,
        g.presenca,
        g.checkInAt || null,
        g.checkInBy || null,
        g.observacao || null,
        g.conflitoAtivo,
        g.createdAt,
        g.updatedAt,
      ]
    );
  }

  // 5. Auditoria inicial
  const auditLogs = [
    {
      id: 'aud-1',
      timestamp: '2026-10-01T10:00:00.000Z',
      userId: 'user-admin',
      userName: 'Cel. Valério Mendonça',
      userRole: 'admin',
      eventId: 'evt-1',
      eventNome: 'Solenidade Comemorativa e Outorga de Mérito Institucional',
      acao: 'CRIAÇÃO_EVENTO',
      detalhes: 'Evento criado no sistema com público estimado de 120 convidados.',
      dispositivo: 'Desktop Gabinete (Chrome 130 / Linux)',
    },
    {
      id: 'aud-2',
      timestamp: '2026-10-04T11:00:00.000Z',
      userId: 'user-gestor',
      userName: 'Maj. Patrícia Silveira',
      userRole: 'gestor',
      eventId: 'evt-1',
      eventNome: 'Solenidade Comemorativa e Outorga de Mérito Institucional',
      guestId: 'gst-5',
      guestNumero: 5,
      guestNome: 'Gen. Carlos Eduardo Vasconcelos',
      acao: 'CONFLITO_GERADO',
      detalhes: 'Conflito de representação detectado: Titular #5 confirmado enquanto Representante #6 já estava confirmado (CA-06).',
      dispositivo: 'Notebook Corporativo (Firefox 132 / macOS)',
    },
    {
      id: 'aud-3',
      timestamp: '2026-10-10T19:15:00.000Z',
      userId: 'user-operador',
      userName: 'Ten. Lucas Albuquerque',
      userRole: 'operador',
      eventId: 'evt-1',
      eventNome: 'Solenidade Comemorativa e Outorga de Mérito Institucional',
      guestId: 'gst-1',
      guestNumero: 1,
      guestNome: 'Alm. Henrique Villanova',
      acao: 'CHECK_IN_CONCLUIDO',
      detalhes: 'Credenciamento e entrega de credencial de honra realizados com sucesso (CA-09).',
      dispositivo: 'Tablet Portaria Salão Nobre (Edge 129 / Android)',
    },
  ];

  for (const a of auditLogs) {
    await query(
      `INSERT INTO audit_logs (id, timestamp, user_id, user_nome, user_role, event_id, event_nome, guest_id, guest_numero, guest_nome, acao, detalhes, dispositivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO NOTHING`,
      [
        a.id,
        a.timestamp,
        a.userId,
        a.userName,
        a.userRole,
        a.eventId,
        a.eventNome,
        a.guestId || null,
        a.guestNumero || null,
        a.guestNome || null,
        a.acao,
        a.detalhes,
        a.dispositivo,
      ]
    );
  }
}
