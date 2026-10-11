/**
 * Sistema de Gestão de Convidados, RSVP e Presença
 * PRD 1.0 - Tipos e Definições de Domínio
 */

export type Role = 'admin' | 'gestor' | 'operador' | 'leitor';

export interface User {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  role: Role;
  authorizedEventIds: string[]; // Eventos que o usuário tem acesso (para 'admin', acesso universal)
}

export type EventStatus = 'rascunho' | 'ativo' | 'encerrado';
export type EventVisibility = 'publico' | 'reservado';

export interface EventCategory {
  id: string;
  nome: string;
  descricao?: string;
  cor?: string;
}

export interface EventItem {
  id: string;
  nome: string;
  dataHorario: string; // ISO ou formato descritivo legível
  local: string;
  imagemCapa?: string;
  visibilidade: EventVisibility;
  publicoEstimado: number;
  categorias: EventCategory[];
  estado: EventStatus;
  criadoEm: string;
  atualizadoEm: string;
  encerradoEm?: string;
  reabertoEm?: string;
}

export type RSVPStatus = 'pendente' | 'confirmado' | 'recusado';
export type GuestRole = 'titular' | 'acompanhante' | 'representante';
export type PresenceStatus = 'aguardando' | 'presente';

export interface GuestRelationship {
  tipoOriginal: 'acompanhante' | 'representante' | null;
  titularId: string | null;
  titularNome?: string;
  motivo?: string;
  dataVinculo: string;
}

export interface Guest {
  id: string;
  eventId: string;
  numero: number; // Numeração sequencial estável no evento (1, 2, 3...)
  nome: string;
  categoria: string; // Obrigatória
  rsvp: RSVPStatus;
  papel: GuestRole;
  relacionamento?: GuestRelationship | null;
  presenca: PresenceStatus;
  checkInAt?: string | null;
  checkInBy?: string | null;
  observacao?: string;
  conflitoAtivo?: boolean; // Conflito: titular e representante ambos confirmados
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null; // Exclusão lógica para não reutilizar número
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  eventId: string;
  eventNome: string;
  guestId?: string;
  guestNumero?: number;
  guestNome?: string;
  acao: string;
  detalhes: string;
  dispositivo: string;
}

export interface ImportPreviewItem {
  index: number;
  nome: string;
  tipo: string;
  relacaoRaw: string;
  confirmacaoRaw: string;
  // Campos interpretados:
  parsedRsvp: RSVPStatus;
  parsedPapel: GuestRole;
  relacionadoGuestId: string | null;
  relacionadoGuestNome: string | null;
  seraPromovido: boolean;
  erros: string[];
  avisos: string[];
  duplicidadeProvavel: boolean;
}

export interface ImportSummary {
  totalLidos: number;
  totalValidos: number;
  totalComErros: number;
  totalPromocoes: number;
  totalConflitos: number;
  itens: ImportPreviewItem[];
}
