import {
  AuditLog,
  EventCategory,
  EventItem,
  Guest,
  GuestRelationship,
  GuestRole,
  ImportPreviewItem,
  ImportSummary,
  PresenceStatus,
  Role,
  RSVPStatus,
  User,
} from '../types';
import { api } from './apiClient';

const STORAGE_KEYS = {
  EVENTS: 'cerimonial_events_v1',
  GUESTS: 'cerimonial_guests_v1',
  USERS: 'cerimonial_users_v1',
  AUDIT: 'cerimonial_audit_v1',
  ACTIVE_USER_ID: 'cerimonial_active_user_id_v1',
  ACTIVE_EVENT_ID: 'cerimonial_active_event_id_v1',
};

// Categorias padrão
export const DEFAULT_CATEGORIES: EventCategory[] = [
  { id: 'cat-autoridade', nome: 'Autoridade', descricao: 'Autoridades civis, militares ou institucionais', cor: '#0B2A4A' },
  { id: 'cat-diretoria', nome: 'Diretoria', descricao: 'Diretores e membros da alta administração', cor: '#1C4E80' },
  { id: 'cat-comite', nome: 'Comitê', descricao: 'Integrantes de comissões ou comitês', cor: '#276CA3' },
  { id: 'cat-geral', nome: 'Convidado geral', descricao: 'Participantes sem classificação especial', cor: '#5B6E84' },
];

// Usuários, Eventos, Convidados e Auditoria são gerenciados e persistidos exclusivamente no PostgreSQL.
class StoreService {
  private events: EventItem[] = [];
  private guests: Guest[] = [];
  private users: User[] = [];
  private auditLogs: AuditLog[] = [];
  private activeUserId: string = 'user-admin';
  private activeEventId: string = 'evt-1';
  private listeners: (() => void)[] = [];
  private initialized: boolean = false;

  constructor() {
    this.restoreSessionPreferences();
    this.init();
  }

  private restoreSessionPreferences() {
    try {
      const storedUserId = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID);
      if (storedUserId) {
        this.activeUserId = storedUserId;
      }
      const storedEventId = localStorage.getItem(STORAGE_KEYS.ACTIVE_EVENT_ID);
      if (storedEventId) {
        this.activeEventId = storedEventId;
      }
    } catch {}
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, this.activeUserId);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_EVENT_ID, this.activeEventId);
    } catch (e) {
      console.error('Falha ao persistir preferências de sessão no localStorage', e);
    }
    this.notify();
  }

  public async init() {
    try {
      const [remoteEvents, remoteUsers, remoteAudit] = await Promise.all([
        api.getEvents().catch(() => []),
        api.getUsers().catch(() => []),
        api.getAuditLogs().catch(() => []),
      ]);

      this.events = remoteEvents || [];
      this.users = remoteUsers || [];
      this.auditLogs = remoteAudit || [];

      if (this.events.length > 0 && !this.events.some(e => e.id === this.activeEventId)) {
        this.activeEventId = this.events[0].id;
      }
      if (this.users.length > 0 && !this.users.some(u => u.id === this.activeUserId)) {
        this.activeUserId = this.users[0].id;
      }

      if (this.activeEventId) {
        const remoteGuests = await api.getGuests(this.activeEventId).catch(() => []);
        this.guests = remoteGuests || [];
      }

      this.initialized = true;
      this.notify();
    } catch (e) {
      console.error('Falha ao inicializar dados do PostgreSQL:', e);
    }
  }

  public async syncWithBackend() {
    await this.init();
  }

  public async refreshGuests(eventId?: string) {
    const targetEventId = eventId || this.activeEventId;
    if (!targetEventId) return;
    try {
      const remoteGuests = await api.getGuests(targetEventId);
      this.guests = remoteGuests || [];
      this.notify();
    } catch (e) {
      console.error('Erro ao atualizar convidados do PostgreSQL:', e);
    }
  }

  public async refreshAudit() {
    try {
      const remoteAudit = await api.getAuditLogs();
      this.auditLogs = remoteAudit || [];
      this.notify();
    } catch (e) {
      console.error('Erro ao atualizar auditoria do PostgreSQL:', e);
    }
  }

  public subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // --- Usuários e Sessão ---
  public getUsers(): User[] {
    return [...this.users];
  }

  public getActiveUser(): User {
    const user = this.users.find(u => u.id === this.activeUserId);
    return user || this.users[0];
  }

  public setActiveUser(userId: string) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;
    this.activeUserId = userId;
    // Se o usuário não tiver autorização para o evento ativo, seleciona o primeiro autorizado
    if (user.role !== 'admin' && !user.authorizedEventIds.includes(this.activeEventId)) {
      const allowedEvent = this.events.find(e => user.authorizedEventIds.includes(e.id));
      if (allowedEvent) {
        this.activeEventId = allowedEvent.id;
      }
    }
    this.saveToStorage();
  }

  // Validação de permissões no backend/store (CA-01)
  public checkAuthorization(eventId: string, requiredRoles: Role[]): { authorized: boolean; reason?: string } {
    const user = this.getActiveUser();
    if (user.role === 'admin') {
      return { authorized: true };
    }
    if (!user.authorizedEventIds.includes(eventId)) {
      return {
        authorized: false,
        reason: `Acesso negado: o usuário ${user.nome} (${user.cargo}) não possui autorização para este evento.`,
      };
    }
    if (!requiredRoles.includes(user.role)) {
      return {
        authorized: false,
        reason: `Permissão insuficiente: perfil '${user.role}' não pode executar esta ação.`,
      };
    }
    return { authorized: true };
  }

  // --- Gestão de Eventos ---
  public getAuthorizedEvents(): EventItem[] {
    const user = this.getActiveUser();
    if (user.role === 'admin') {
      return [...this.events];
    }
    return this.events.filter(e => user.authorizedEventIds.includes(e.id));
  }

  public getActiveEvent(): EventItem | undefined {
    return this.events.find(e => e.id === this.activeEventId);
  }

  public setActiveEvent(eventId: string) {
    const auth = this.checkAuthorization(eventId, ['admin', 'gestor', 'operador', 'leitor']);
    if (!auth.authorized) {
      throw new Error(auth.reason);
    }
    this.activeEventId = eventId;
    this.saveToStorage();
  }

  public createEvent(data: Omit<EventItem, 'id' | 'criadoEm' | 'atualizadoEm'>): EventItem {
    const user = this.getActiveUser();
    if (user.role !== 'admin' && user.role !== 'gestor') {
      throw new Error('Apenas Administrador ou Gestor pode criar eventos.');
    }
    const newId = `evt-${Date.now()}`;
    const newEvent: EventItem = {
      ...data,
      id: newId,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    this.events.unshift(newEvent);

    // Se o gestor criou, adiciona à lista dele
    if (user.role === 'gestor') {
      user.authorizedEventIds.push(newId);
    }

    this.activeEventId = newId;
    this.logAudit({
      eventId: newId,
      eventNome: newEvent.nome,
      acao: 'CRIAÇÃO_EVENTO',
      detalhes: `Novo evento criado com público estimado de ${newEvent.publicoEstimado}.`,
    });

    this.saveToStorage();
    return newEvent;
  }

  public updateEvent(eventId: string, data: Partial<EventItem>): EventItem {
    const auth = this.checkAuthorization(eventId, ['admin', 'gestor']);
    if (!auth.authorized) throw new Error(auth.reason);

    const eventIndex = this.events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) throw new Error('Evento não encontrado.');

    const event = this.events[eventIndex];
    const updated = {
      ...event,
      ...data,
      atualizadoEm: new Date().toISOString(),
    };
    this.events[eventIndex] = updated;

    this.logAudit({
      eventId,
      eventNome: updated.nome,
      acao: 'ATUALIZAÇÃO_EVENTO',
      detalhes: `Configurações do evento atualizadas.`,
    });

    this.saveToStorage();
    return updated;
  }

  // Encerramento e reabertura auditada (CA-14)
  public closeEvent(eventId: string, motivo: string): EventItem {
    const auth = this.checkAuthorization(eventId, ['admin', 'gestor']);
    if (!auth.authorized) throw new Error(auth.reason);

    const event = this.events.find(e => e.id === eventId);
    if (!event) throw new Error('Evento não encontrado.');

    event.estado = 'encerrado';
    event.encerradoEm = new Date().toISOString();
    event.atualizadoEm = new Date().toISOString();

    this.logAudit({
      eventId,
      eventNome: event.nome,
      acao: 'ENCERRAMENTO_EVENTO',
      detalhes: `Evento encerrado. Motivo: ${motivo || 'Operação concluída'}. Modificações operacionais bloqueadas.`,
    });

    this.saveToStorage();
    return event;
  }

  public reopenEvent(eventId: string, justificativa: string): EventItem {
    const auth = this.checkAuthorization(eventId, ['admin']);
    if (!auth.authorized) throw new Error('Apenas o Administrador pode reabrir um evento encerrado.');

    const event = this.events.find(e => e.id === eventId);
    if (!event) throw new Error('Evento não encontrado.');

    event.estado = 'ativo';
    event.reabertoEm = new Date().toISOString();
    event.atualizadoEm = new Date().toISOString();

    this.logAudit({
      eventId,
      eventNome: event.nome,
      acao: 'REABERTURA_EVENTO',
      detalhes: `Evento reaberto pelo Administrador. Justificativa: ${justificativa}.`,
    });

    this.saveToStorage();
    return event;
  }

  // --- Gestão de Convidados & Numeração Estável ---
  public getGuests(eventId: string): Guest[] {
    const auth = this.checkAuthorization(eventId, ['admin', 'gestor', 'operador', 'leitor']);
    if (!auth.authorized) {
      throw new Error(auth.reason);
    }
    // Retorna apenas convidados não deletados logicamente
    return this.guests.filter(g => g.eventId === eventId && !g.deletedAt);
  }

  // Próximo número estável e sequencial que NUNCA reutiliza números deletados
  public getNextGuestNumber(eventId: string): number {
    const allEventGuests = this.guests.filter(g => g.eventId === eventId);
    if (allEventGuests.length === 0) return 1;
    const maxNum = Math.max(...allEventGuests.map(g => g.numero));
    return maxNum + 1;
  }

  private ensureEventNotClosed(eventId: string) {
    const event = this.events.find(e => e.id === eventId);
    if (event?.estado === 'encerrado') {
      throw new Error('Este evento está encerrado. Nenhuma modificação operacional é permitida (CA-14).');
    }
  }

  // Cadastrar convidado com aplicação de regras
  public addGuest(guestData: {
    eventId: string;
    nome: string;
    categoria: string;
    rsvp?: RSVPStatus;
    papel?: GuestRole;
    relacionamento?: GuestRelationship | null;
    observacao?: string;
  }): Guest {
    const { eventId, nome, categoria, rsvp = 'pendente', papel = 'titular', relacionamento = null, observacao = '' } = guestData;
    this.ensureEventNotClosed(eventId);
    const auth = this.checkAuthorization(eventId, ['admin', 'gestor']);
    if (!auth.authorized) throw new Error(auth.reason);

    // Validação de categoria obrigatória (CA-02)
    if (!categoria || categoria.trim() === '') {
      throw new Error('A categoria do convidado é obrigatória (CA-02).');
    }

    const nextNumero = this.getNextGuestNumber(eventId);
    const newGuestId = `gst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Regras de acompanhante e promoção:
    let finalPapel: GuestRole = papel;
    let finalRelacionamento = relacionamento;

    if (finalPapel === 'acompanhante' && finalRelacionamento?.titularId) {
      const titular = this.guests.find(g => g.id === finalRelacionamento!.titularId && !g.deletedAt);
      if (titular) {
        finalRelacionamento.titularNome = titular.nome;
        // CA-05: Se acompanhante confirma enquanto titular não está confirmado (pendente ou recusado)
        if (rsvp === 'confirmado' && titular.rsvp !== 'confirmado') {
          finalPapel = 'representante';
          finalRelacionamento.tipoOriginal = 'acompanhante';
          finalRelacionamento.motivo = `Promovido a representante pois o titular ${titular.nome} está '${titular.rsvp}'.`;
        }
      }
    }

    const newGuest: Guest = {
      id: newGuestId,
      eventId,
      numero: nextNumero,
      nome: nome.trim(),
      categoria,
      rsvp,
      papel: finalPapel,
      relacionamento: finalRelacionamento,
      presenca: 'aguardando',
      observacao,
      conflitoAtivo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.guests.push(newGuest);

    this.logAudit({
      eventId,
      eventNome: this.getActiveEvent()?.nome || '',
      guestId: newGuest.id,
      guestNumero: newGuest.numero,
      guestNome: newGuest.nome,
      acao: 'CADASTRO_CONVIDADO',
      detalhes: `Convidado #${newGuest.numero} cadastrado como ${newGuest.papel} (${newGuest.categoria}), RSVP: ${newGuest.rsvp}.`,
    });

    this.saveToStorage();
    return newGuest;
  }

  // Atualizar RSVP com regras de promoção, despromoção e conflitos
  public updateRSVP(guestId: string, novoRsvp: RSVPStatus): Guest {
    const guest = this.guests.find(g => g.id === guestId && !g.deletedAt);
    if (!guest) throw new Error('Convidado não encontrado.');

    this.ensureEventNotClosed(guest.eventId);
    const auth = this.checkAuthorization(guest.eventId, ['admin', 'gestor', 'operador']);
    if (!auth.authorized) throw new Error(auth.reason);

    const rsvpAnterior = guest.rsvp;
    guest.rsvp = novoRsvp;
    guest.updatedAt = new Date().toISOString();

    // REGRA 1: Se este convidado é ACOMPANHANTE e confirma enquanto titular NÃO está confirmado -> PROMOVER A REPRESENTANTE (CA-05)
    if (guest.papel === 'acompanhante' && guest.relacionamento?.titularId && novoRsvp === 'confirmado') {
      const titular = this.guests.find(g => g.id === guest.relacionamento!.titularId && !g.deletedAt);
      if (titular && titular.rsvp !== 'confirmado') {
        guest.papel = 'representante';
        guest.relacionamento.tipoOriginal = 'acompanhante';
        guest.relacionamento.motivo = `Promovido a representante automaticamente pois o titular ${titular.nome} está '${titular.rsvp}'.`;
        this.logAudit({
          eventId: guest.eventId,
          eventNome: this.getActiveEvent()?.nome || '',
          guestId: guest.id,
          guestNumero: guest.numero,
          guestNome: guest.nome,
          acao: 'PROMOCAO_REPRESENTANTE',
          detalhes: `Acompanhante #${guest.numero} promovido a Representante de ${titular.nome} após confirmação individual (CA-05).`,
        });
      }
    }

    // REGRA 2: Se este convidado é TITULAR e passa a ser CONFIRMADO:
    // Verificar se ele possui representantes ativos confirmados (seja promovido de acompanhante ou representante direto).
    // CA-06: Se titular e representante forem posteriormente confirmados -> CONFLITO DE RESOLUÇÃO EXPLÍCITA!
    if (guest.papel === 'titular') {
      const representantesVinculados = this.guests.filter(
        g => g.eventId === guest.eventId &&
             !g.deletedAt &&
             g.relacionamento?.titularId === guest.id &&
             g.papel === 'representante' &&
             g.rsvp === 'confirmado'
      );

      if (novoRsvp === 'confirmado' && representantesVinculados.length > 0) {
        // Marca conflito ativo em ambos para exigir resolução explícita do operador
        guest.conflitoAtivo = true;
        representantesVinculados.forEach(rep => {
          rep.conflitoAtivo = true;
        });

        this.logAudit({
          eventId: guest.eventId,
          eventNome: this.getActiveEvent()?.nome || '',
          guestId: guest.id,
          guestNumero: guest.numero,
          guestNome: guest.nome,
          acao: 'DETECCAO_CONFLITO',
          detalhes: `Conflito de representação detectado: Titular #${guest.numero} confirmado com ${representantesVinculados.length} representante(s) já confirmado(s) (CA-06).`,
        });
      } else if (novoRsvp !== 'confirmado') {
        // Se titular deixou de ser confirmado, conflito de representação ativa é desarmado
        guest.conflitoAtivo = false;
        representantesVinculados.forEach(rep => {
          rep.conflitoAtivo = false;
        });

        // CA-05: Se titular deixou de ser confirmado, qualquer acompanhante confirmado dele deve ser promovido a representante!
        const acompConfirmados = this.guests.filter(
          g => g.eventId === guest.eventId &&
               !g.deletedAt &&
               g.relacionamento?.titularId === guest.id &&
               g.papel === 'acompanhante' &&
               g.rsvp === 'confirmado'
        );
        acompConfirmados.forEach(acomp => {
          acomp.papel = 'representante';
          if (acomp.relacionamento) {
            acomp.relacionamento.tipoOriginal = 'acompanhante';
            acomp.relacionamento.motivo = `Promovido a representante pois o titular ${guest.nome} não está mais confirmado (RSVP: '${novoRsvp}').`;
          }
          this.logAudit({
            eventId: guest.eventId,
            eventNome: this.getActiveEvent()?.nome || '',
            guestId: acomp.id,
            guestNumero: acomp.numero,
            guestNome: acomp.nome,
            acao: 'PROMOCAO_REPRESENTANTE',
            detalhes: `Acompanhante #${acomp.numero} promovido a representante após titular #${guest.numero} deixar de estar confirmado (CA-05).`,
          });
        });
      }
    }

    // REGRA 3: Se este convidado é REPRESENTANTE
    if (guest.papel === 'representante') {
      // Se era acompanhante promovido e teve sua confirmação desfeita (não está mais confirmado)
      if (guest.relacionamento?.tipoOriginal === 'acompanhante' && novoRsvp !== 'confirmado') {
        guest.papel = 'acompanhante';
        guest.conflitoAtivo = false;
        if (guest.relacionamento) {
          guest.relacionamento.motivo = `Retornado ao papel de acompanhante após desfeita a confirmação individual (RSVP: '${novoRsvp}').`;
        }
        this.logAudit({
          eventId: guest.eventId,
          eventNome: this.getActiveEvent()?.nome || '',
          guestId: guest.id,
          guestNumero: guest.numero,
          guestNome: guest.nome,
          acao: 'RETORNO_ACOMPANHANTE',
          detalhes: `Representante #${guest.numero} retornou ao papel de Acompanhante após desfeita a confirmação.`,
        });
      } else if (guest.relacionamento?.titularId) {
        const titular = this.guests.find(g => g.id === guest.relacionamento!.titularId && !g.deletedAt);
        if (titular && titular.rsvp === 'confirmado' && novoRsvp === 'confirmado') {
          guest.conflitoAtivo = true;
          titular.conflitoAtivo = true;
          this.logAudit({
            eventId: guest.eventId,
            eventNome: this.getActiveEvent()?.nome || '',
            guestId: guest.id,
            guestNumero: guest.numero,
            guestNome: guest.nome,
            acao: 'DETECCAO_CONFLITO',
            detalhes: `Conflito detectado: Representante #${guest.numero} confirmado enquanto titular ${titular.nome} já estava confirmado (CA-06).`,
          });
        } else if (novoRsvp !== 'confirmado') {
          guest.conflitoAtivo = false;
          if (titular) {
            const outros = this.guests.filter(
              g => g.id !== guest.id &&
                   g.eventId === guest.eventId &&
                   !g.deletedAt &&
                   g.relacionamento?.titularId === titular.id &&
                   g.papel === 'representante' &&
                   g.rsvp === 'confirmado'
            );
            if (outros.length === 0) titular.conflitoAtivo = false;
          }
        }
      }
    }

    this.logAudit({
      eventId: guest.eventId,
      eventNome: this.getActiveEvent()?.nome || '',
      guestId: guest.id,
      guestNumero: guest.numero,
      guestNome: guest.nome,
      acao: 'ALTERACAO_RSVP',
      detalhes: `RSVP alterado de '${rsvpAnterior}' para '${novoRsvp}'.`,
    });

    this.saveToStorage();
    return guest;
  }

  // Resolução explícita de conflito (CA-06)
  public resolveConflict(titularId: string, representanteId: string, acao: 'converter_acompanhante' | 'desconfirmar_titular' | 'desconfirmar_representante' | 'emancipar_titular_independente'): void {
    const titular = this.guests.find(g => g.id === titularId && !g.deletedAt);
    const rep = this.guests.find(g => g.id === representanteId && !g.deletedAt);
    if (!titular || !rep) throw new Error('Registros não encontrados para resolução.');

    this.ensureEventNotClosed(titular.eventId);
    const auth = this.checkAuthorization(titular.eventId, ['admin', 'gestor']);
    if (!auth.authorized) throw new Error(auth.reason);

    if (acao === 'converter_acompanhante') {
      // Ambos confirmados, representante passa a ser acompanhante oficial
      rep.papel = 'acompanhante';
      if (rep.relacionamento) {
        rep.relacionamento.tipoOriginal = 'acompanhante';
        rep.relacionamento.motivo = 'Resolvido pelo operador: Titular e acompanhante ambos comparecerão.';
      }
      rep.conflitoAtivo = false;
      titular.conflitoAtivo = false;
      this.logAudit({
        eventId: titular.eventId,
        eventNome: this.getActiveEvent()?.nome || '',
        guestId: rep.id,
        guestNumero: rep.numero,
        guestNome: rep.nome,
        acao: 'RESOLUCAO_CONFLITO',
        detalhes: `Conflito resolvido: Representante #${rep.numero} convertido para Acompanhante do titular #${titular.numero} ${titular.nome}.`,
      });
    } else if (acao === 'desconfirmar_titular') {
      titular.rsvp = 'recusado';
      titular.conflitoAtivo = false;
      rep.conflitoAtivo = false;
      this.logAudit({
        eventId: titular.eventId,
        eventNome: this.getActiveEvent()?.nome || '',
        guestId: titular.id,
        guestNumero: titular.numero,
        guestNome: titular.nome,
        acao: 'RESOLUCAO_CONFLITO',
        detalhes: `Conflito resolvido: Titular #${titular.numero} marcado como ausente (não participará), mantendo #${rep.numero} como representante.`,
      });
    } else if (acao === 'desconfirmar_representante') {
      rep.rsvp = 'recusado';
      rep.conflitoAtivo = false;
      titular.conflitoAtivo = false;
      this.logAudit({
        eventId: rep.eventId,
        eventNome: this.getActiveEvent()?.nome || '',
        guestId: rep.id,
        guestNumero: rep.numero,
        guestNome: rep.nome,
        acao: 'RESOLUCAO_CONFLITO',
        detalhes: `Conflito resolvido: Representante #${rep.numero} desconfirmado (não participará), mantendo o titular #${titular.numero} confirmado.`,
      });
    } else if (acao === 'emancipar_titular_independente') {
      rep.papel = 'titular';
      rep.relacionamento = null;
      rep.conflitoAtivo = false;
      titular.conflitoAtivo = false;
      this.logAudit({
        eventId: rep.eventId,
        eventNome: this.getActiveEvent()?.nome || '',
        guestId: rep.id,
        guestNumero: rep.numero,
        guestNome: rep.nome,
        acao: 'RESOLUCAO_CONFLITO',
        detalhes: `Conflito resolvido: Convidado #${rep.numero} emancipado para Titular Independente.`,
      });
    }

    this.saveToStorage();
  }

  // Credenciamento (Check-in) com proteção contra duplicidade (CA-09, CA-13)
  public performCheckIn(guestId: string): Guest {
    const guest = this.guests.find(g => g.id === guestId && !g.deletedAt);
    if (!guest) throw new Error('Convidado não encontrado.');

    this.ensureEventNotClosed(guest.eventId);
    const auth = this.checkAuthorization(guest.eventId, ['admin', 'gestor', 'operador']);
    if (!auth.authorized) throw new Error(auth.reason);

    // CA-09: Se já estiver presente, não duplica presença
    if (guest.presenca === 'presente') {
      return guest;
    }

    const currentUser = this.getActiveUser();
    guest.presenca = 'presente';
    guest.checkInAt = new Date().toISOString();
    guest.checkInBy = currentUser.nome;
    guest.updatedAt = new Date().toISOString();

    this.logAudit({
      eventId: guest.eventId,
      eventNome: this.getActiveEvent()?.nome || '',
      guestId: guest.id,
      guestNumero: guest.numero,
      guestNome: guest.nome,
      acao: 'CHECK_IN',
      detalhes: `Credenciamento realizado com sucesso por ${currentUser.nome} (${currentUser.cargo}).`,
    });

    this.saveToStorage();
    return guest;
  }

  // Cancelar ou estornar credenciamento (correção operacional acessível a operadores e gestores)
  public revertCheckIn(guestId: string, motivo: string = 'Estorno operacional de credenciamento'): Guest {
    const guest = this.guests.find(g => g.id === guestId && !g.deletedAt);
    if (!guest) throw new Error('Convidado não encontrado.');

    this.ensureEventNotClosed(guest.eventId);
    const auth = this.checkAuthorization(guest.eventId, ['admin', 'gestor', 'operador']);
    if (!auth.authorized) throw new Error(auth.reason || 'Usuário sem permissão para estornar credenciamento.');

    guest.presenca = 'aguardando';
    const oldCheckInAt = guest.checkInAt;
    guest.checkInAt = null;
    guest.checkInBy = null;
    guest.updatedAt = new Date().toISOString();

    const currentUser = this.getActiveUser();
    this.logAudit({
      eventId: guest.eventId,
      eventNome: this.getActiveEvent()?.nome || '',
      guestId: guest.id,
      guestNumero: guest.numero,
      guestNome: guest.nome,
      acao: 'ESTORNO_CHECK_IN',
      detalhes: `Credenciamento estornado por ${currentUser.nome} (anterior: ${oldCheckInAt || 'Presente'}). Motivo: ${motivo || 'Correção operacional'}.`,
    });

    this.saveToStorage();
    return guest;
  }

  // Desfazer confirmação recente (volta RSVP para 'pendente')
  public undoRSVP(guestId: string, motivo: string = 'Desfazer confirmação recente'): Guest {
    const guest = this.guests.find(g => g.id === guestId && !g.deletedAt);
    if (!guest) throw new Error('Convidado não encontrado.');

    return this.updateRSVP(guestId, 'pendente');
  }

  // Editar dados do convidado
  public updateGuest(guestId: string, updates: Partial<Guest>): Guest {
    const guest = this.guests.find(g => g.id === guestId && !g.deletedAt);
    if (!guest) throw new Error('Convidado não encontrado.');

    this.ensureEventNotClosed(guest.eventId);
    const auth = this.checkAuthorization(guest.eventId, ['admin', 'gestor']);
    if (!auth.authorized) throw new Error(auth.reason);

    // Impedir alteração manual de número para proteger estabilidade
    const { numero: _, id: __, eventId: ___, ...allowedUpdates } = updates;

    Object.assign(guest, allowedUpdates, { updatedAt: new Date().toISOString() });

    this.logAudit({
      eventId: guest.eventId,
      eventNome: this.getActiveEvent()?.nome || '',
      guestId: guest.id,
      guestNumero: guest.numero,
      guestNome: guest.nome,
      acao: 'EDICAO_CONVIDADO',
      detalhes: `Dados do convidado #${guest.numero} atualizados.`,
    });

    this.saveToStorage();
    return guest;
  }

  // Exclusão lógica (preserva número e histórico de auditoria)
  public deleteGuest(guestId: string, motivo: string): void {
    const guest = this.guests.find(g => g.id === guestId && !g.deletedAt);
    if (!guest) throw new Error('Convidado não encontrado.');

    this.ensureEventNotClosed(guest.eventId);
    const auth = this.checkAuthorization(guest.eventId, ['admin', 'gestor']);
    if (!auth.authorized) throw new Error(auth.reason);

    guest.deletedAt = new Date().toISOString();
    guest.updatedAt = new Date().toISOString();

    this.logAudit({
      eventId: guest.eventId,
      eventNome: this.getActiveEvent()?.nome || '',
      guestId: guest.id,
      guestNumero: guest.numero,
      guestNome: guest.nome,
      acao: 'EXCLUSAO_LOGICA',
      detalhes: `Convidado #${guest.numero} (${guest.nome}) excluído logicamente. O número ${guest.numero} permanece reservado. Motivo: ${motivo || 'Remoção pelo gestor'}.`,
    });

    this.saveToStorage();
  }

  // --- Pipeline de Importação (10 Passos - PRD Seção 6) ---
  public previewImport(
    eventId: string,
    rawRecords: Array<{ nome: string; tipo: string; relacao?: string; confirmacao?: string | number }>
  ): ImportSummary {
    const event = this.events.find(e => e.id === eventId);
    if (!event) throw new Error('Evento não encontrado.');

    const existingGuests = this.getGuests(eventId);
    const categoryNames = event.categorias.map(c => c.nome.toLowerCase().trim());

    const previewItems: ImportPreviewItem[] = [];
    let validos = 0;
    let comErros = 0;
    let promocoes = 0;
    let conflitos = 0;

    rawRecords.forEach((rec, idx) => {
      const erros: string[] = [];
      const avisos: string[] = [];

      const rawNome = (rec.nome || '').trim();
      const rawTipo = (rec.tipo || '').trim();
      const rawRelacao = (rec.relacao || '').trim();
      const rawConf = String(rec.confirmacao ?? '').trim();

      // 1. Validação de nome
      if (!rawNome) {
        erros.push('Nome completo é obrigatório.');
      }

      // 2. Validação de categoria obrigatória (CA-02)
      let resolvedTipo = rawTipo;
      if (!resolvedTipo) {
        erros.push('Categoria é obrigatória (CA-02).');
      } else {
        const matchCat = event.categorias.find(
          c => c.nome.toLowerCase() === resolvedTipo.toLowerCase()
        );
        if (!matchCat) {
          avisos.push(`Categoria "${resolvedTipo}" não existe no evento. Será criada como Convidado geral ou adicionada.`);
        } else {
          resolvedTipo = matchCat.nome;
        }
      }

      // 3. Validação de Confirmação RSVP (CA-03):
      // Na importação simplificada, 1 representa confirmado e 0 representa pendente!
      // A recusa é uma ação explícita, nunca uma interpretação automática de 0.
      let parsedRsvp: RSVPStatus = 'pendente';
      if (rawConf === '1' || rawConf.toLowerCase() === 'sim' || rawConf.toLowerCase() === 'confirmado') {
        parsedRsvp = 'confirmado';
      } else if (rawConf.toLowerCase() === 'recusado' || rawConf.toLowerCase() === 'nao' || rawConf.toLowerCase() === 'não') {
        parsedRsvp = 'recusado';
      } else {
        // '0' ou vazio -> PENDENTE (CA-03)
        parsedRsvp = 'pendente';
      }

      // 4. Resolução de Relação e Papel (Acompanhante / Representante)
      let parsedPapel: GuestRole = 'titular';
      let relacionadoGuestId: string | null = null;
      let relacionadoGuestNome: string | null = null;
      let seraPromovido = false;

      if (rawRelacao) {
        // Busca na lista existente ou no lote atual
        const matchingExisting = existingGuests.filter(
          g => g.nome.toLowerCase() === rawRelacao.toLowerCase()
        );

        if (matchingExisting.length === 1) {
          const titular = matchingExisting[0];
          relacionadoGuestId = titular.id;
          relacionadoGuestNome = titular.nome;
          parsedPapel = 'acompanhante';

          // CA-05: Se acompanhante for confirmado e titular NÃO estiver confirmado -> Promovido a representante!
          if (parsedRsvp === 'confirmado' && titular.rsvp !== 'confirmado') {
            seraPromovido = true;
            parsedPapel = 'representante';
            avisos.push(
              `Titular "${titular.nome}" está "${titular.rsvp}". O acompanhante confirmado será promovido a Representante (CA-05).`
            );
            promocoes++;
          }
        } else if (matchingExisting.length > 1) {
          erros.push(
            `Ambiguidade: existem ${matchingExisting.length} convidados com o nome "${rawRelacao}". Vínculo não pode ser gerado automaticamente.`
          );
        } else {
          // Checa no próprio lote atual antes deste índice
          const loteMatch = rawRecords.slice(0, idx).filter(r => (r.nome || '').trim().toLowerCase() === rawRelacao.toLowerCase());
          if (loteMatch.length === 1) {
            relacionadoGuestNome = loteMatch[0].nome;
            parsedPapel = 'acompanhante';
            const loteTitularConf = String(loteMatch[0].confirmacao ?? '').trim();
            const titularConfirmado = loteTitularConf === '1' || loteTitularConf.toLowerCase() === 'confirmado';
            if (parsedRsvp === 'confirmado' && !titularConfirmado) {
              seraPromovido = true;
              parsedPapel = 'representante';
              avisos.push(
                `Titular "${relacionadoGuestNome}" no lote não está confirmado. Convidado será importado como Representante (CA-05).`
              );
              promocoes++;
            }
          } else if (loteMatch.length > 1) {
            erros.push(`Ambiguidade no arquivo: múltiplos registros com o nome "${rawRelacao}".`);
          } else {
            erros.push(`Convidado relacionado "${rawRelacao}" não foi localizado na base.`);
          }
        }
      }

      // 5. Verificação de duplicidade provável
      const duplicidadeProvavel = existingGuests.some(
        g => g.nome.toLowerCase() === rawNome.toLowerCase()
      );
      if (duplicidadeProvavel) {
        avisos.push('Atenção: Já existe outro convidado com este mesmo nome cadastrado no evento.');
      }

      if (erros.length > 0) {
        comErros++;
      } else {
        validos++;
      }

      previewItems.push({
        index: idx + 1,
        nome: rawNome,
        tipo: resolvedTipo || 'Convidado geral',
        relacaoRaw: rawRelacao,
        confirmacaoRaw: rawConf,
        parsedRsvp,
        parsedPapel,
        relacionadoGuestId,
        relacionadoGuestNome,
        seraPromovido,
        erros,
        avisos,
        duplicidadeProvavel,
      });
    });

    return {
      totalLidos: rawRecords.length,
      totalValidos: validos,
      totalComErros: comErros,
      totalPromocoes: promocoes,
      totalConflitos: conflitos,
      itens: previewItems,
    };
  }

  // Executar importação confirmada
  public commitImport(eventId: string, itemsToImport: ImportPreviewItem[]): { importedCount: number } {
    this.ensureEventNotClosed(eventId);
    const auth = this.checkAuthorization(eventId, ['admin', 'gestor']);
    if (!auth.authorized) throw new Error(auth.reason);

    let count = 0;
    const now = new Date().toISOString();

    itemsToImport.forEach(item => {
      if (item.erros.length > 0) return; // Não importa com erros

      const numero = this.getNextGuestNumber(eventId);
      const newGuestId = `gst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      let rel: GuestRelationship | null = null;
      if (item.relacionadoGuestNome) {
        rel = {
          tipoOriginal: item.seraPromovido ? 'acompanhante' : (item.parsedPapel === 'representante' ? 'representante' : 'acompanhante'),
          titularId: item.relacionadoGuestId,
          titularNome: item.relacionadoGuestNome,
          motivo: item.seraPromovido
            ? `Promovido a representante na importação pois titular não confirmou (CA-05).`
            : `Vínculo com ${item.relacionadoGuestNome}`,
          dataVinculo: now,
        };
      }

      const guest: Guest = {
        id: newGuestId,
        eventId,
        numero,
        nome: item.nome,
        categoria: item.tipo,
        rsvp: item.parsedRsvp,
        papel: item.parsedPapel,
        relacionamento: rel,
        presenca: 'aguardando',
        conflitoAtivo: false,
        createdAt: now,
        updatedAt: now,
      };

      this.guests.push(guest);
      count++;
    });

    this.logAudit({
      eventId,
      eventNome: this.getActiveEvent()?.nome || '',
      acao: 'IMPORTACAO_CONVIDADOS',
      detalhes: `Importação em lote concluída com sucesso: ${count} convidados cadastrados.`,
    });

    this.saveToStorage();
    return { importedCount: count };
  }

  // --- Auditoria ---
  public getAuditLogs(eventId?: string): AuditLog[] {
    if (eventId) {
      return this.auditLogs.filter(a => a.eventId === eventId);
    }
    return [...this.auditLogs];
  }

  private logAudit(entry: {
    eventId: string;
    eventNome: string;
    guestId?: string;
    guestNumero?: number;
    guestNome?: string;
    acao: string;
    detalhes: string;
  }) {
    const user = this.getActiveUser();
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.nome,
      userRole: user.role,
      eventId: entry.eventId,
      eventNome: entry.eventNome,
      guestId: entry.guestId,
      guestNumero: entry.guestNumero,
      guestNome: entry.guestNome,
      acao: entry.acao,
      detalhes: entry.detalhes,
      dispositivo: typeof navigator !== 'undefined' ? `${navigator.platform} · ${navigator.userAgent.slice(0, 48)}` : 'Node Server',
    };
    this.auditLogs.unshift(newLog);
  }

  // Estatísticas e Indicadores (Painel Principal - PRD Seção 4)
  public getDashboardMetrics(eventId: string) {
    const event = this.events.find(e => e.id === eventId);
    const guests = this.getGuests(eventId);

    const publicoEstimado = event?.publicoEstimado || 0;

    // Confirmados: Titulares confirmados, sem papel de acompanhante ou representante
    const confirmadosTitulares = guests.filter(
      g => g.rsvp === 'confirmado' && g.papel === 'titular'
    ).length;

    // Acompanhantes: Pessoas confirmadas com papel atual de acompanhante
    const acompanhantesConfirmados = guests.filter(
      g => g.rsvp === 'confirmado' && g.papel === 'acompanhante'
    ).length;

    // Representantes: Pessoas confirmadas que representam titulares
    const representantesConfirmados = guests.filter(
      g => g.rsvp === 'confirmado' && g.papel === 'representante'
    ).length;

    // Não confirmados: Registros pendentes ou que informaram não participar
    const naoConfirmados = guests.filter(
      g => g.rsvp === 'pendente' || g.rsvp === 'recusado'
    ).length;

    // Presenças: Pessoas efetivamente credenciadas
    const presencas = guests.filter(g => g.presenca === 'presente').length;

    // Total de participantes previstos = titulares confirmados + acompanhantes confirmados + representantes confirmados
    // (Zero dupla contagem - CA-07)
    const participantesPrevistos = confirmadosTitulares + acompanhantesConfirmados + representantesConfirmados;

    // Métricas derivadas com proteção contra divisão por zero
    const taxaConfirmacao = publicoEstimado > 0 ? (participantesPrevistos / publicoEstimado) * 100 : null;
    const taxaComparecimento = participantesPrevistos > 0 ? (presencas / participantesPrevistos) * 100 : null;

    // Diferenças
    const saldoCapacidade = publicoEstimado - participantesPrevistos;
    const ausentesPrevistos = participantesPrevistos - presencas;

    // Conflitos pendentes
    const conflitos = guests.filter(g => g.conflitoAtivo);

    return {
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
      conflitosCount: conflitos.length,
      conflitos,
    };
  }

  // Reset para estado inicial limpo (útil para testes de homologação)
  public async resetToInitial() {
    await this.init();
  }
}

export const store = new StoreService();
