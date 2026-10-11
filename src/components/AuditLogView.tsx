import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Shield,
  Filter,
  User,
  Calendar,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { AuditLog, EventItem, User as AppUser } from '../types';

interface AuditLogViewProps {
  event: EventItem;
  auditLogs: AuditLog[];
  currentUser: AppUser;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  event,
  auditLogs,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterScope, setFilterScope] = useState<'current_event' | 'all_events'>('current_event');

  const filteredLogs = useMemo(() => {
    let list = auditLogs;

    if (filterScope === 'current_event') {
      list = list.filter(l => l.eventId === event.id);
    }

    if (filterAction !== 'all') {
      list = list.filter(l => l.acao === filterAction);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(l =>
        l.userName.toLowerCase().includes(term) ||
        l.acao.toLowerCase().includes(term) ||
        l.detalhes.toLowerCase().includes(term) ||
        (l.guestNome && l.guestNome.toLowerCase().includes(term)) ||
        (l.guestNumero && String(l.guestNumero).includes(term))
      );
    }

    return list;
  }, [auditLogs, event.id, filterScope, filterAction, searchTerm]);

  // Lista de ações distintas
  const availableActions = useMemo(() => {
    const set = new Set(auditLogs.map(l => l.acao));
    return Array.from(set);
  }, [auditLogs]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1C4E80]">
              <Shield className="w-4 h-4" />
              <span>Auditoria e Rastreabilidade Integral (PRD Seção 9)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B2A4A] tracking-tight mt-1">
              Trilha de Auditoria e Conformidade
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Registro imutável de todas as ações operacionais, credenciamentos, promoções automáticas e resoluções.
            </p>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded border border-slate-200">
            <span>Registros carregados: </span>
            <strong className="text-slate-800">{filteredLogs.length}</strong>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por operador, convidado, ação ou detalhes..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-[#1C4E80] outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded text-slate-700 outline-none"
            >
              <option value="all">Todas as Ações</option>
              {availableActions.map(ac => (
                <option key={ac} value={ac}>{ac}</option>
              ))}
            </select>

            {currentUser.role === 'admin' && (
              <select
                value={filterScope}
                onChange={e => setFilterScope(e.target.value as 'current_event' | 'all_events')}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded text-slate-700 outline-none font-medium"
              >
                <option value="current_event">Apenas Evento Ativo</option>
                <option value="all_events">Todos os Eventos (Admin)</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-40">Data & Horário</th>
                <th className="py-3 px-3 w-44">Operador / Perfil</th>
                <th className="py-3 px-3 w-36">Ação</th>
                <th className="py-3 px-3 w-48">Registro Afetado</th>
                <th className="py-3 px-3">Detalhes da Operação</th>
                <th className="py-3 px-3 text-right">Dispositivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800 block">{log.userName}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                        {log.userRole}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        log.acao === 'CHECK_IN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.acao === 'DETECCAO_CONFLITO' || log.acao === 'RESOLUCAO_CONFLITO'
                            ? 'bg-amber-100 text-amber-900'
                            : log.acao === 'PROMOCAO_REPRESENTANTE'
                              ? 'bg-indigo-100 text-indigo-900'
                              : log.acao === 'EXCLUSAO_LOGICA'
                                ? 'bg-rose-100 text-rose-900'
                                : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.acao}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {log.guestNome ? (
                        <div>
                          <span className="font-medium text-slate-800">
                            {log.guestNumero ? `#${log.guestNumero} ` : ''}{log.guestNome}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Evento: {log.eventNome}</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-700">
                      {log.detalhes}
                    </td>

                    <td className="py-3 px-3 text-right text-[10px] text-slate-400 font-mono truncate max-w-[150px]" title={log.dispositivo}>
                      {log.dispositivo}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
