import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  UserCheck,
  UserPlus,
  ArrowUpDown,
  MoreVertical,
  Edit2,
  Trash2,
  HelpCircle,
  Shield,
  Eye,
  Info,
  ChevronRight,
  Sparkles,
  Download,
  RotateCcw,
  Undo2
} from 'lucide-react';
import { EventItem, Guest, User } from '../types';
import { store } from '../services/store';
import { ConfirmActionModal, DialogActionType } from './ConfirmActionModal';

interface GuestListViewProps {
  event: EventItem;
  guests: Guest[];
  currentUser: User;
  onOpenAddGuestModal: () => void;
  onOpenEditGuestModal: (guest: Guest) => void;
  onOpenConflictModal: () => void;
  onOpenExportModal: (filteredOnly?: boolean) => void;
  onSelectGuestDetail: (guest: Guest) => void;
  initialFilter?: {
    papel?: string;
    rsvp?: string;
    presence?: string;
    conflict?: boolean;
  } | null;
  onClearInitialFilter?: () => void;
  onTriggerToast?: (toast: {
    type: 'success' | 'warning' | 'info';
    title: string;
    message: string;
    undoAction?: () => void;
    undoLabel?: string;
  }) => void;
}

export const GuestListView: React.FC<GuestListViewProps> = ({
  event,
  guests,
  currentUser,
  onOpenAddGuestModal,
  onOpenEditGuestModal,
  onOpenConflictModal,
  onOpenExportModal,
  onSelectGuestDetail,
  initialFilter,
  onClearInitialFilter,
  onTriggerToast,
}) => {
  const isClosed = event.estado === 'encerrado';
  const canOperate = (currentUser.role === 'admin' || currentUser.role === 'gestor' || currentUser.role === 'operador') && !isClosed;
  const canManage = (currentUser.role === 'admin' || currentUser.role === 'gestor') && !isClosed;

  // Filtros e Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPapel, setFilterPapel] = useState<string>(initialFilter?.papel || 'all');
  const [filterRSVP, setFilterRSVP] = useState<string>(initialFilter?.rsvp || 'all');
  const [filterPresence, setFilterPresence] = useState<string>(initialFilter?.presence || 'all');
  const [filterConflict, setFilterConflict] = useState<boolean>(initialFilter?.conflict || false);
  const [sortBy, setSortBy] = useState<'numero' | 'nome' | 'categoria' | 'rsvp'>('numero');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Atualiza se initialFilter mudar
  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.papel !== undefined) setFilterPapel(initialFilter.papel);
      if (initialFilter.rsvp !== undefined) setFilterRSVP(initialFilter.rsvp);
      if (initialFilter.presence !== undefined) setFilterPresence(initialFilter.presence);
      if (initialFilter.conflict !== undefined) setFilterConflict(initialFilter.conflict);
    }
  }, [initialFilter]);

  // Menu de ações rápidas
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Estados para Modal de Confirmação In-App
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: DialogActionType;
    guest: Guest | null;
    title: string;
    description: string;
    confirmLabel: string;
    isDestructive: boolean;
  }>({
    isOpen: false,
    type: 'estorno_checkin',
    guest: null,
    title: '',
    description: '',
    confirmLabel: 'Confirmar',
    isDestructive: false,
  });

  // Lista filtrada e ordenada
  const filteredGuests = useMemo(() => {
    let result = [...guests];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(g =>
        g.nome.toLowerCase().includes(term) ||
        String(g.numero) === term ||
        g.categoria.toLowerCase().includes(term) ||
        (g.relacionamento?.titularNome && g.relacionamento.titularNome.toLowerCase().includes(term))
      );
    }

    if (filterCategory !== 'all') {
      result = result.filter(g => g.categoria === filterCategory);
    }

    if (filterPapel !== 'all') {
      result = result.filter(g => g.papel === filterPapel);
    }

    if (filterRSVP !== 'all') {
      if (filterRSVP === 'nao_confirmados') {
        result = result.filter(g => g.rsvp === 'pendente' || g.rsvp === 'recusado');
      } else {
        result = result.filter(g => g.rsvp === filterRSVP);
      }
    }

    if (filterPresence !== 'all') {
      result = result.filter(g => g.presenca === filterPresence);
    }

    if (filterConflict) {
      result = result.filter(g => g.conflitoAtivo);
    }

    result.sort((a, b) => {
      let comp = 0;
      if (sortBy === 'numero') {
        comp = a.numero - b.numero;
      } else if (sortBy === 'nome') {
        comp = a.nome.localeCompare(b.nome);
      } else if (sortBy === 'categoria') {
        comp = a.categoria.localeCompare(b.categoria);
      } else if (sortBy === 'rsvp') {
        comp = a.rsvp.localeCompare(b.rsvp);
      }
      return sortDirection === 'asc' ? comp : -comp;
    });

    return result;
  }, [guests, searchTerm, filterCategory, filterPapel, filterRSVP, filterPresence, filterConflict, sortBy, sortDirection]);

  // Manipuladores de Ações Rápidas
  const handleQuickRSVP = (guest: Guest, novoRsvp: 'pendente' | 'confirmado' | 'recusado') => {
    try {
      const anterior = guest.rsvp;
      store.updateRSVP(guest.id, novoRsvp);
      setActiveActionMenuId(null);

      if (onTriggerToast) {
        onTriggerToast({
          type: 'success',
          title: `RSVP Atualizado: #${guest.numero} ${guest.nome}`,
          message: `Status alterado de "${anterior}" para "${novoRsvp}".`,
          undoLabel: 'Desfazer Alteração',
          undoAction: () => {
            store.updateRSVP(guest.id, anterior);
          },
        });
      }
    } catch (err: unknown) {
      if (onTriggerToast) {
        onTriggerToast({
          type: 'warning',
          title: 'Erro no RSVP',
          message: err instanceof Error ? err.message : 'Falha ao atualizar RSVP.',
        });
      }
    }
  };

  const handleQuickCheckIn = (guest: Guest) => {
    try {
      store.performCheckIn(guest.id);
      setActiveActionMenuId(null);

      if (onTriggerToast) {
        onTriggerToast({
          type: 'success',
          title: `Credenciamento Realizado: #${guest.numero} ${guest.nome}`,
          message: `Check-in concluído por ${currentUser.nome}. Presença confirmada.`,
          undoLabel: 'Desfazer Check-in',
          undoAction: () => {
            store.revertCheckIn(guest.id, 'Desfeito imediatamente após credenciamento');
          },
        });
      }
    } catch (err: unknown) {
      if (onTriggerToast) {
        onTriggerToast({
          type: 'warning',
          title: 'Erro no Credenciamento',
          message: err instanceof Error ? err.message : 'Falha ao credenciar.',
        });
      }
    }
  };

  // Abrir Modal de Estorno
  const handleOpenEstornoDialog = (guest: Guest) => {
    setActiveActionMenuId(null);
    setDialogState({
      isOpen: true,
      type: 'estorno_checkin',
      guest,
      title: 'Estornar Credenciamento',
      description: `Você está estornando a presença do convidado #${guest.numero} ${guest.nome}. O status retornará para "Aguardando credenciamento" e a operação será registrada na auditoria.`,
      confirmLabel: 'Confirmar Estorno',
      isDestructive: false,
    });
  };

  // Abrir Modal de Desfazer Confirmação RSVP
  const handleOpenUndoRsvpDialog = (guest: Guest) => {
    setActiveActionMenuId(null);
    setDialogState({
      isOpen: true,
      type: 'desfazer_rsvp',
      guest,
      title: 'Desfazer Confirmação RSVP',
      description: `Você está desfazendo a confirmação de presença de #${guest.numero} ${guest.nome}. O RSVP retornará para "Pendente" e eventuais regras de representação serão reajustadas.`,
      confirmLabel: 'Desfazer Confirmação',
      isDestructive: false,
    });
  };

  // Abrir Modal de Exclusão
  const handleOpenDeleteDialog = (guest: Guest) => {
    setActiveActionMenuId(null);
    setDialogState({
      isOpen: true,
      type: 'excluir_convidado',
      guest,
      title: 'Exclusão Lógica de Convidado',
      description: `Confirma a exclusão lógica de #${guest.numero} ${guest.nome}? Em conformidade com o PRD Seção 2.1 e CA-13, o número sequencial #${guest.numero} permanecerá reservado e nunca será reciclado.`,
      confirmLabel: 'Confirmar Exclusão Lógica',
      isDestructive: true,
    });
  };

  // Executar confirmação do diálogo
  const handleConfirmDialog = (reason: string) => {
    const { type, guest } = dialogState;
    if (!guest) return;

    try {
      if (type === 'estorno_checkin') {
        store.revertCheckIn(guest.id, reason);
        if (onTriggerToast) {
          onTriggerToast({
            type: 'info',
            title: `Estorno Concluído: #${guest.numero} ${guest.nome}`,
            message: `Credenciamento estornado. Motivo: ${reason}`,
            undoLabel: 'Refazer Check-in',
            undoAction: () => {
              store.performCheckIn(guest.id);
            },
          });
        }
      } else if (type === 'desfazer_rsvp') {
        const anterior = guest.rsvp;
        store.undoRSVP(guest.id, reason);
        if (onTriggerToast) {
          onTriggerToast({
            type: 'info',
            title: `Confirmação Desfeita: #${guest.numero} ${guest.nome}`,
            message: 'RSVP retornado para "Pendente".',
            undoLabel: 'Reconfirmar RSVP',
            undoAction: () => {
              store.updateRSVP(guest.id, anterior);
            },
          });
        }
      } else if (type === 'excluir_convidado') {
        store.deleteGuest(guest.id, reason);
        if (onTriggerToast) {
          onTriggerToast({
            type: 'info',
            title: `Convidado Removido: #${guest.numero} ${guest.nome}`,
            message: `Exclusão lógica realizada. Número #${guest.numero} preservado.`,
          });
        }
      }
    } catch (err: unknown) {
      if (onTriggerToast) {
        onTriggerToast({
          type: 'warning',
          title: 'Erro na Operação',
          message: err instanceof Error ? err.message : 'Falha na execução.',
        });
      }
    }
  };

  const handleResetFilters = () => {
    setFilterCategory('all');
    setFilterPapel('all');
    setFilterRSVP('all');
    setFilterPresence('all');
    setFilterConflict(false);
    setSearchTerm('');
    if (onClearInitialFilter) onClearInitialFilter();
  };

  return (
    <div className="space-y-4">
      {/* Barra de Ferramentas: Busca, Filtros e Ações de Criação/Exportação */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Busca Imediata por Nome ou Número */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, nº sequencial ou vínculo..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-[#1C4E80] focus:ring-1 focus:ring-[#1C4E80] outline-none transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                × Limpar
              </button>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={onOpenAddGuestModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1C4E80] hover:bg-[#0B2A4A] text-white text-xs sm:text-sm font-medium rounded transition-colors shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Convidado</span>
              </button>
            )}

            <button
              onClick={() => onOpenExportModal(filteredGuests.length !== guests.length)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded transition-colors border border-slate-300"
              title="Exportar dados atuais para Excel ou Relatório de Cerimonial"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Exportar</span>
              <span className="text-[11px] text-slate-500 font-bold">({filteredGuests.length})</span>
            </button>
          </div>
        </div>

        {/* Linha de Filtros Compactos */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          {/* Categoria */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-[#1C4E80]"
          >
            <option value="all">Todas Categorias</option>
            {event.categorias.map(cat => (
              <option key={cat.id} value={cat.nome}>{cat.nome}</option>
            ))}
          </select>

          {/* Papel */}
          <select
            value={filterPapel}
            onChange={e => setFilterPapel(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-[#1C4E80]"
          >
            <option value="all">Todos os Papéis</option>
            <option value="titular">Titulares</option>
            <option value="acompanhante">Acompanhantes</option>
            <option value="representante">Representantes</option>
          </select>

          {/* RSVP */}
          <select
            value={filterRSVP}
            onChange={e => setFilterRSVP(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-[#1C4E80]"
          >
            <option value="all">Todo RSVP</option>
            <option value="confirmado">Confirmados</option>
            <option value="pendente">Pendentes</option>
            <option value="recusado">Não participará</option>
            <option value="nao_confirmados">Pendentes ou Recusas</option>
          </select>

          {/* Presença */}
          <select
            value={filterPresence}
            onChange={e => setFilterPresence(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-[#1C4E80]"
          >
            <option value="all">Toda Presença</option>
            <option value="presente">Presente (Credenciado)</option>
            <option value="aguardando">Aguardando Credenciamento</option>
          </select>

          {/* Botão de Toggle Conflitos */}
          <button
            onClick={() => setFilterConflict(!filterConflict)}
            className={`px-2 py-1 rounded text-xs font-medium border transition-colors flex items-center gap-1 ${
              filterConflict
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Apenas com Conflito</span>
          </button>

          {(filterCategory !== 'all' || filterPapel !== 'all' || filterRSVP !== 'all' || filterPresence !== 'all' || filterConflict || searchTerm) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#1C4E80] hover:underline ml-auto font-medium"
            >
              Resetar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela no Desktop / Cards no Mobile */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {/* Visualização Tabela (Desktop/Tablet) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th
                  onClick={() => {
                    if (sortBy === 'numero') setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('numero'); setSortDirection('asc'); }
                  }}
                  className="py-3 px-3 w-16 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>Nº</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortBy === 'nome') setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('nome'); setSortDirection('asc'); }
                  }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>Nome do Convidado</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortBy === 'categoria') setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('categoria'); setSortDirection('asc'); }
                  }}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>Categoria</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Papel & Origem</th>
                <th
                  onClick={() => {
                    if (sortBy === 'rsvp') setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('rsvp'); setSortDirection('asc'); }
                  }}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>Confirmação RSVP</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Credenciamento</th>
                <th className="py-3 px-3 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Nenhum convidado encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredGuests.map(guest => {
                  const isPresent = guest.presenca === 'presente';
                  const isConflict = !!guest.conflitoAtivo;
                  const isConfirmed = guest.rsvp === 'confirmado';

                  return (
                    <tr
                      key={guest.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isConflict ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Numeração estável */}
                      <td className="py-3 px-3 font-mono text-slate-500 font-semibold">
                        #{guest.numero}
                      </td>

                      {/* Nome e Linha de Detalhes */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectGuestDetail(guest)}
                            className="font-medium text-[#182738] hover:text-[#1C4E80] text-left hover:underline"
                          >
                            {guest.nome}
                          </button>

                          {isConflict && (
                            <span
                              onClick={onOpenConflictModal}
                              className="cursor-pointer text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1"
                              title="Conflito de representação pendente de resolução (CA-06)"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Conflito
                            </span>
                          )}
                        </div>

                        {guest.observacao && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5" title={guest.observacao}>
                            {guest.observacao}
                          </div>
                        )}
                      </td>

                      {/* Categoria Obrigatória (CA-02) */}
                      <td className="py-3 px-3">
                        <span className="text-slate-700 font-medium">
                          {guest.categoria}
                        </span>
                      </td>

                      {/* Papel & Vínculo/Origem (CA-04, CA-05) */}
                      <td className="py-3 px-3">
                        {guest.papel === 'titular' ? (
                          <span className="text-slate-600">Titular</span>
                        ) : guest.papel === 'acompanhante' ? (
                          <div className="text-[11px]">
                            <span className="text-sky-800 font-medium">Acompanhante</span>
                            {guest.relacionamento?.titularNome && (
                              <div className="text-slate-500 truncate" title={`Vinculado ao titular ${guest.relacionamento.titularNome}`}>
                                de {guest.relacionamento.titularNome}
                              </div>
                            )}
                          </div>
                        ) : (
                          // Representante
                          <div className="text-[11px]">
                            <span className="text-indigo-800 font-semibold">Representante</span>
                            {guest.relacionamento?.tipoOriginal === 'acompanhante' ? (
                              <div
                                className="text-slate-500 text-[10px] cursor-help flex items-center gap-0.5"
                                title={`Origem: acompanhante de ${guest.relacionamento.titularNome} (Promovido a representante - CA-05)`}
                              >
                                <Info className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                <span className="truncate">Origem: acomp. de {guest.relacionamento.titularNome}</span>
                              </div>
                            ) : (
                              guest.relacionamento?.titularNome && (
                                <div className="text-slate-500 text-[10px] truncate">
                                  de {guest.relacionamento.titularNome}
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </td>

                      {/* RSVP (CA-03: 0 = pendente, não recusado!) */}
                      <td className="py-3 px-3">
                        <div className="inline-flex items-center gap-1.5">
                          {guest.rsvp === 'confirmado' ? (
                            <span className="text-emerald-700 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Confirmado
                            </span>
                          ) : guest.rsvp === 'recusado' ? (
                            <span className="text-rose-700 font-medium flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              Não participará
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              Pendente
                            </span>
                          )}

                          {/* Quick RSVP toggle com ação de Desfazer Confirmação */}
                          {canOperate && (
                            <div className="relative inline-block ml-1">
                              <button
                                onClick={() => setActiveActionMenuId(activeActionMenuId === `rsvp-${guest.id}` ? null : `rsvp-${guest.id}`)}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
                                title="Alterar confirmação RSVP"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              {activeActionMenuId === `rsvp-${guest.id}` && (
                                <div className="absolute left-0 mt-1 w-44 bg-white border border-slate-200 rounded shadow-lg py-1 z-50 text-xs">
                                  <button
                                    onClick={() => handleQuickRSVP(guest, 'confirmado')}
                                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-emerald-700 font-medium flex items-center gap-1.5"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar presença
                                  </button>

                                  {isConfirmed ? (
                                    <button
                                      onClick={() => handleOpenUndoRsvpDialog(guest)}
                                      className="w-full text-left px-2.5 py-1.5 hover:bg-amber-50 text-amber-800 font-semibold flex items-center gap-1.5 border-t border-slate-100"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" /> Desfazer Confirmação
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleQuickRSVP(guest, 'pendente')}
                                      className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-600 flex items-center gap-1.5"
                                    >
                                      <Clock className="w-3.5 h-3.5" /> Deixar Pendente
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleQuickRSVP(guest, 'recusado')}
                                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-rose-700 flex items-center gap-1.5"
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Não participará
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Credenciamento / Presença Física */}
                      <td className="py-3 px-3">
                        {isPresent ? (
                          <div>
                            <span className="text-emerald-800 font-semibold flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Presente
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {guest.checkInAt ? new Date(guest.checkInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                              {guest.checkInBy ? ` · ${guest.checkInBy}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            Aguardando
                          </span>
                        )}
                      </td>

                      {/* Ações Rápidas na Tabela */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Check-in ou Estorno Direto */}
                          {canOperate && (
                            isPresent ? (
                              <button
                                onClick={() => handleOpenEstornoDialog(guest)}
                                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors flex items-center gap-1"
                                title="Estornar credenciamento (correção operacional)"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-700" />
                                <span>Estornar</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleQuickCheckIn(guest)}
                                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#0B2A4A] hover:bg-[#1C4E80] text-white shadow-xs transition-colors flex items-center gap-1"
                                title="Registrar credenciamento (check-in)"
                              >
                                <UserCheck className="w-3 h-3 text-emerald-300" />
                                <span>Check-in</span>
                              </button>
                            )
                          )}

                          {/* Detalhes / Ações Extras */}
                          <button
                            onClick={() => onSelectGuestDetail(guest)}
                            className="p-1 text-slate-500 hover:text-[#1C4E80] hover:bg-slate-100 rounded"
                            title="Ver detalhes completos e auditoria"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canManage && (
                            <div className="relative inline-block">
                              <button
                                onClick={() => setActiveActionMenuId(activeActionMenuId === `action-${guest.id}` ? null : `action-${guest.id}`)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeActionMenuId === `action-${guest.id}` && (
                                <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded shadow-lg py-1 z-50 text-xs">
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      onOpenEditGuestModal(guest);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" /> Editar dados
                                  </button>

                                  {isConfirmed && (
                                    <button
                                      onClick={() => handleOpenUndoRsvpDialog(guest)}
                                      className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-amber-900 flex items-center gap-1.5"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" /> Desfazer RSVP
                                    </button>
                                  )}

                                  {isPresent && (
                                    <button
                                      onClick={() => handleOpenEstornoDialog(guest)}
                                      className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-amber-900 flex items-center gap-1.5"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" /> Estornar Check-in
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleOpenDeleteDialog(guest)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-700 flex items-center gap-1.5 border-t border-slate-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Excluir (Lógica)
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Visualização Cartões Compactos (Mobile - PRD Seção 5 e 10) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredGuests.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Nenhum convidado encontrado.
            </div>
          ) : (
            filteredGuests.map(guest => {
              const isPresent = guest.presenca === 'presente';
              const isConflict = !!guest.conflitoAtivo;
              const isConfirmed = guest.rsvp === 'confirmado';

              return (
                <div key={guest.id} className="p-3.5 space-y-2 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-slate-500 font-bold text-xs mt-0.5">
                        #{guest.numero}
                      </span>
                      <div>
                        <button
                          onClick={() => onSelectGuestDetail(guest)}
                          className="font-medium text-sm text-[#182738] text-left hover:text-[#1C4E80]"
                        >
                          {guest.nome}
                        </button>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{guest.categoria}</span>
                          <span>·</span>
                          <span className={guest.papel === 'representante' ? 'text-indigo-700 font-medium' : guest.papel === 'acompanhante' ? 'text-sky-700' : 'text-slate-600'}>
                            {guest.papel.charAt(0).toUpperCase() + guest.papel.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badge RSVP com ação rápida */}
                    <div className="text-right">
                      {guest.rsvp === 'confirmado' ? (
                        <div>
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Confirmado
                          </span>
                          {canOperate && (
                            <button
                              onClick={() => handleOpenUndoRsvpDialog(guest)}
                              className="text-[10px] text-amber-800 underline block mt-0.5"
                            >
                              Desfazer RSVP
                            </button>
                          )}
                        </div>
                      ) : guest.rsvp === 'recusado' ? (
                        <span className="text-[11px] text-rose-700 font-semibold flex items-center justify-end gap-1">
                          <XCircle className="w-3 h-3 text-rose-600" /> Recusado
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Pendente</span>
                      )}
                    </div>
                  </div>

                  {/* Vínculo de Representante ou Acompanhante no Mobile */}
                  {guest.relacionamento?.titularNome && (
                    <div className="text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded">
                      {guest.relacionamento.tipoOriginal === 'acompanhante'
                        ? `Origem: acompanhante de ${guest.relacionamento.titularNome}`
                        : `Vinculado a ${guest.relacionamento.titularNome}`}
                    </div>
                  )}

                  {isConflict && (
                    <div className="bg-amber-100 text-amber-900 text-xs p-2 rounded flex items-center justify-between">
                      <span className="font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Conflito de representação
                      </span>
                      <button
                        onClick={onOpenConflictModal}
                        className="text-xs underline font-semibold text-amber-900"
                      >
                        Resolver
                      </button>
                    </div>
                  )}

                  {/* Ações Mobile com toque confortável (min 44px) */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                    <span className="text-xs text-slate-500">
                      {isPresent ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Presente
                        </span>
                      ) : (
                        'Aguardando check-in'
                      )}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectGuestDetail(guest)}
                        className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-medium"
                      >
                        Detalhes
                      </button>

                      {canOperate && (
                        isPresent ? (
                          <button
                            onClick={() => handleOpenEstornoDialog(guest)}
                            className="min-h-[40px] px-3 py-1.5 rounded text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                            <span>Estornar</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleQuickCheckIn(guest)}
                            className="min-h-[40px] px-3.5 py-1.5 rounded text-xs font-semibold bg-[#0B2A4A] text-white active:bg-[#1C4E80] flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Check-in</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Reutilizável de Confirmação In-App (Estorno, Desfazer RSVP, Exclusão) */}
      {dialogState.isOpen && dialogState.guest && (
        <ConfirmActionModal
          isOpen={dialogState.isOpen}
          onClose={() => setDialogState(prev => ({ ...prev, isOpen: false, guest: null }))}
          actionType={dialogState.type}
          title={dialogState.title}
          description={dialogState.description}
          targetName={dialogState.guest.nome}
          targetNumero={dialogState.guest.numero}
          confirmLabel={dialogState.confirmLabel}
          isDestructive={dialogState.isDestructive}
          onConfirm={handleConfirmDialog}
        />
      )}
    </div>
  );
};
