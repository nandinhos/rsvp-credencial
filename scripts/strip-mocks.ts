import fs from 'fs';
import path from 'path';

const storePath = path.resolve(__dirname, '../src/services/store.ts');
let content = fs.readFileSync(storePath, 'utf-8');

// 1. Substituir declaração das constantes mockadas de INITIAL_USERS até o fim de INITIAL_AUDIT
const mockStart = content.indexOf('// Usuários iniciais com papéis claros');
const classStart = content.indexOf('class StoreService {');

if (mockStart !== -1 && classStart !== -1) {
  content = content.substring(0, mockStart) + 
`// Usuários, Eventos, Convidados e Auditoria são gerenciados e persistidos exclusivamente no PostgreSQL.
` + content.substring(classStart);
}

// 2. Substituir a inicialização da classe StoreService
const oldClassDef = `class StoreService {
  private events: EventItem[] = [];
  private guests: Guest[] = [];
  private users: User[] = [];
  private auditLogs: AuditLog[] = [];
  private activeUserId: string = 'user-admin';
  private activeEventId: string = 'evt-1';
  private listeners: (() => void)[] = [];`;

const newClassDef = `class StoreService {
  private events: EventItem[] = [];
  private guests: Guest[] = [];
  private users: User[] = [];
  private auditLogs: AuditLog[] = [];
  private activeUserId: string = 'user-admin';
  private activeEventId: string = 'evt-1';
  private listeners: (() => void)[] = [];
  private initialized: boolean = false;`;

content = content.replace(oldClassDef, newClassDef);

// 3. Substituir construtor, syncWithBackend, loadFromStorage e saveToStorage
const methodsStart = content.indexOf('  constructor() {');
const subscribeStart = content.indexOf('  public subscribe(fn: () => void) {');

if (methodsStart !== -1 && subscribeStart !== -1) {
  const newMethods = `  constructor() {
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

`;
  content = content.substring(0, methodsStart) + newMethods + content.substring(subscribeStart);
}

// 4. Substituir resetToInitial para sincronizar com o banco
const oldReset = `  public resetToInitial() {
    this.events = INITIAL_EVENTS;
    this.guests = INITIAL_GUESTS;
    this.users = INITIAL_USERS;
    this.auditLogs = INITIAL_AUDIT;
    this.activeUserId = INITIAL_USERS[0].id;
    this.activeEventId = INITIAL_EVENTS[0].id;
    this.saveToStorage();
  }`;

const newReset = `  public async resetToInitial() {
    await this.init();
  }`;

content = content.replace(oldReset, newReset);

fs.writeFileSync(storePath, content, 'utf-8');
console.log('✅ [STRIP MOCKS] store.ts refatorado com sucesso sem dados mockados!');
