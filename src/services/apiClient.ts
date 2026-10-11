import { AuditLog, EventItem, Guest, User } from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = `Erro na requisição ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Health
  checkHealth: () => request<{ status: string }>('/health'),

  // Usuários
  getUsers: () => request<User[]>('/users'),

  // Eventos
  getEvents: () => request<EventItem[]>('/events'),
  createEvent: (data: Partial<EventItem> & { userId?: string; userName?: string; userRole?: string }) =>
    request<{ id: string; message: string }>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEvent: (id: string, data: Partial<EventItem> & { userId?: string; userName?: string; userRole?: string }) =>
    request<{ message: string }>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  closeEvent: (id: string, user: { userId: string; userName: string; userRole: string }) =>
    request<{ message: string }>(`/events/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(user),
    }),
  reopenEvent: (id: string, user: { userId: string; userName: string; userRole: string }) =>
    request<{ message: string }>(`/events/${id}/reopen`, {
      method: 'POST',
      body: JSON.stringify(user),
    }),

  // Convidados
  getGuests: (eventId: string) => request<Guest[]>(`/guests?eventId=${encodeURIComponent(eventId)}`),
  createGuest: (data: Partial<Guest> & { userId?: string; userName?: string; userRole?: string }) =>
    request<{ id: string; numero: number; message: string }>('/guests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateGuest: (id: string, data: Partial<Guest> & { userId?: string; userName?: string; userRole?: string }) =>
    request<{ message: string }>(`/guests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateRsvp: (id: string, data: { novoRsvp: string; userId?: string; userName?: string; userRole?: string }) =>
    request<{ message: string; conflitoAtivo: boolean }>(`/guests/${id}/rsvp`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  checkInGuest: (id: string, data: { operadorNome?: string; userId?: string; userName?: string; userRole?: string }) =>
    request<{ message: string; checkInAt: string; checkInBy: string }>(`/guests/${id}/checkin`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  undoCheckIn: (id: string, data: { userId?: string; userName?: string; userRole?: string }) =>
    request<{ message: string }>(`/guests/${id}/undo-checkin`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resolveConflict: (data: { titularId: string; representanteId: string; decisao: string; userId?: string; userName?: string; userRole?: string }) =>
    request<{ message: string }>('/guests/resolve-conflict', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteGuest: (id: string, data: { userId?: string; userName?: string; userRole?: string }) =>
    request<{ message: string }>(`/guests/${id}`, {
      method: 'DELETE',
      body: JSON.stringify(data),
    }),

  // Auditoria
  getAuditLogs: (eventId?: string) =>
    request<AuditLog[]>(`/audit${eventId ? `?eventId=${encodeURIComponent(eventId)}` : ''}`),

  // Métricas
  getMetrics: (eventId: string) => request<any>(`/metrics/${encodeURIComponent(eventId)}`),

  // Importação em lote
  importBatch: (data: { eventId: string; items: any[]; userId?: string; userName?: string; userRole?: string }) =>
    request<{ message: string; totalImportados: number }>('/import/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
