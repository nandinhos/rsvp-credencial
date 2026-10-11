import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Search,
  Users,
  RotateCcw,
  Sparkles,
  Clock,
  ShieldCheck,
  UserCheck,
  Check,
  Filter,
  AlertTriangle,
  Lock,
  Undo2
} from 'lucide-react';
import { EventItem, Guest, User } from '../types';
import { store } from '../services/store';
import { ConfirmActionModal } from './ConfirmActionModal';

interface CheckInStationViewProps {
  event: EventItem;
  guests: Guest[];
  currentUser: User;
  onOpenConflictModal: () => void;
  onTriggerToast?: (toast: {
    type: 'success' | 'warning' | 'info';
    title: string;
    message: string;
    undoAction?: () => void;
    undoLabel?: string;
  }) => void;
}

export const CheckInStationView: React.FC<CheckInStationViewProps> = ({
  event,
  guests,
  currentUser,
  onOpenConflictModal,
  onTriggerToast,
}) => {
  const isClosed = event.estado === 'encerrado';
  const canOperate = (currentUser.role === 'admin' || currentUser.role === 'gestor' || currentUser.role === 'operador') && !isClosed;
  const canRevert = canOperate; // Operadores e Gestores autorizados para estorno operacional

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'aguardando' | 'presente'>('all');
  const [lastCheckedGuest, setLastCheckedGuest] = useState<Guest | null>(null);

  // Modal de confirmação de estorno
  const [estornoTargetGuest, setEstornoTargetGuest] = useState<Guest | null>(null);
  const [isEstornoModalOpen, setIsEstornoModalOpen] = useState(false);

  // Modal de desfazer RSVP
  const [undoRsvpTargetGuest, setUndoRsvpTargetGuest] = useState<Guest | null>(null);
  const [isUndoRsvpModalOpen, setIsUndoRsvpModalOpen] = useState(false);

  // Filtra convidados
  const filteredGuests = useMemo(() => {
    let result = guests;

    if (filterMode === 'aguardando') {
      result = result.filter(g => g.presenca === 'aguardando');
    } else if (filterMode === 'presente') {
      result = result.filter(g => g.presenca === 'presente');
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(g =>
        g.nome.toLowerCase().includes(term) ||
        String(g.numero) === term ||
        g.categoria.toLowerCase().includes(term) ||
        (g.relacionamento?.titularNome && g.relacionamento.titularNome.toLowerCase().includes(term))
      );
    }

    // Prioriza ordenação: quem está aguardando e confirmados primeiro
    return [...result].sort((a, b) => {
      if (a.presenca !== b.presenca) {
        return a.presenca === 'aguardando' ? -1 : 1;
      }
      return a.numero - b.numero;
    });
  }, [guests, searchTerm, filterMode]);

  // Contadores ao vivo
  const totalPresentes = useMemo(() => guests.filter(g => g.presenca === 'presente').length, [guests]);
  const totalConfirmados = useMemo(() => guests.filter(g => g.rsvp === 'confirmado').length, [guests]);
  const totalAguardando = useMemo(() => guests.filter(g => g.presenca === 'aguardando' && g.rsvp === 'confirmado').length, [guests]);

  // Ação de Check-in
  const handleCheckIn = (guest: Guest) => {
    if (!canOperate) return;
    try {
      const updated = store.performCheckIn(guest.id);
      setLastCheckedGuest(updated);

      if (onTriggerToast) {
        onTriggerToast({
          type: 'success',
          title: `Credenciamento Realizado: #${guest.numero} ${guest.nome}`,
          message: `Check-in gravado por ${currentUser.nome}. Presença confirmada.`,
          undoLabel: 'Desfazer Check-in',
          undoAction: () => {
            store.revertCheckIn(guest.id, 'Desfeito imediatamente após credenciamento');
            if (lastCheckedGuest?.id === guest.id) setLastCheckedGuest(null);
          },
        });
      }
    } catch (err: unknown) {
      if (onTriggerToast) {
        onTriggerToast({
          type: 'warning',
          title: 'Atenção no Credenciamento',
          message: err instanceof Error ? err.message : 'Falha ao credenciar.',
        });
      }
    }
  };

  // Reversão direta do último credenciado
  const handleDirectUndoLastCheckIn = () => {
    if (!lastCheckedGuest || !canRevert) return;
    try {
      const guestToRevert = lastCheckedGuest;
      store.revertCheckIn(guestToRevert.id, 'Estorno imediato do último credenciamento');
      setLastCheckedGuest(null);

      if (onTriggerToast) {
        onTriggerToast({
          type: 'info',
          title: `Estorno Concluído: #${guestToRevert.numero} ${guestToRevert.nome}`,
          message: 'Presença revertida para "Aguardando credenciamento".',
          undoLabel: 'Refazer Check-in',
          undoAction: () => {
            store.performCheckIn(guestToRevert.id);
          },
        });
      }
    } catch (err: unknown) {
      if (onTriggerToast) {
        onTriggerToast({
          type: 'warning',
          title: 'Falha no Estorno',
          message: err instanceof Error ? err.message : 'Erro ao reverter credenciamento.',
        });
      }
    }
  };

  // Confirmação de Estorno via Modal
  const handleOpenEstornoModal = (guest: Guest) => {
    setEstornoTargetGuest(guest);
    setIsEstornoModalOpen(true);
  };

  const handleConfirmEstorno = (reason: string) => {
    if (!estornoTargetGuest) return;
    try {
      const g = estornoTargetGuest;
      store.revertCheckIn(g.id, reason);
      if (lastCheckedGuest?.id === g.id) {
        setLastCheckedGuest(null);
      }

      if (onTriggerToast) {
        onTriggerToast({
          type: 'info',
          title: `Estorno Confirmado: #${g.numero} ${g.nome}`,
          message: `Presença estornada. Motivo: ${reason}`,
          undoLabel: 'Refazer Check-in',
          undoAction: () => {
            store.performCheckIn(g.id);
          },
        });
      }
    } catch (err: unknown) {
      if (onTriggerToast) {
        onTriggerToast({
          type: 'warning',
          title: 'Falha ao Estornar',
          message: err instanceof Error ? err.message : 'Erro ao estornar.',
        });
      }
    }
  };

  // Desfazer Confirmação RSVP via Modal
  const handleOpenUndoRsvpModal = (guest: Guest) => {
    setUndoRsvpTargetGuest(guest);
    setIsUndoRsvpModalOpen(true);
  };

  const handleConfirmUndoRsvp = (reason: string) => {
    if (!undoRsvpTargetGuest) return;
    try {
      const g = undoRsvpTargetGuest;
      store.undoRSVP(g.id, reason);

      if (onTriggerToast) {
        onTriggerToast({
          type: 'info',
          title: `Confirmação Desfeita: #${g.numero} ${g.nome}`,
          message: 'RSVP retornado para "Pendente".',
          undoLabel: 'Reconfirmar RSVP',
          undoAction: () => {
            store.updateRSVP(g.id, 'confirmado');
          },
        });
      }
    } catch (err: unknown) {
      if (onTriggerToast) {
        onTriggerToast({
          type: 'warning',
          title: 'Falha ao Desfazer RSVP',
          message: err instanceof Error ? err.message : 'Erro ao alterar RSVP.',
        });
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner de Portaria e Métricas em Tempo Real */}
      <div className="bg-[#0B2A4A] text-white rounded-lg p-5 shadow-sm border border-[#1C4E80]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-sky-200">
              <span className="font-semibold uppercase tracking-wider">Terminal de Recepção & Portaria</span>
              <span>·</span>
              <span>Operador: {currentUser.nome}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1 text-white">
              Credenciamento Rápido de Convidados
            </h2>
            <p className="text-xs text-sky-100/80 mt-0.5">
              {event.nome}
            </p>
          </div>

          {/* Mini Ticker ao Vivo */}
          <div className="flex items-center gap-3 bg-[#1C4E80]/80 px-4 py-2.5 rounded-lg border border-white/10">
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-bold text-sky-200 block">Presentes</span>
              <span className="text-2xl font-black text-emerald-400 leading-none">{totalPresentes}</span>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-bold text-sky-200 block">Aguardando</span>
              <span className="text-2xl font-black text-amber-300 leading-none">{totalAguardando}</span>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-bold text-sky-200 block">Total Previstos</span>
              <span className="text-2xl font-black text-white leading-none">{totalConfirmados}</span>
            </div>
          </div>
        </div>

        {/* Feedback Interativo do Último Credenciado com Estorno 100% Funcional */}
        {lastCheckedGuest && (
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-emerald-950/40 p-3 rounded-lg border border-emerald-400/20">
            <div className="flex items-center gap-2 text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Último credenciado: <strong>#{lastCheckedGuest.numero} {lastCheckedGuest.nome}</strong> ({lastCheckedGuest.categoria})
              </span>
            </div>
            {canRevert && (
              <button
                onClick={handleDirectUndoLastCheckIn}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded text-xs transition-colors shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-900" />
                <span>Desfazer Check-in (Estorno)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Busca Gigante e Filtros de Toque */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Digite o nome, sobrenome ou o número sequencial do convidado..."
            className="w-full pl-12 pr-10 py-3.5 text-sm sm:text-base bg-slate-50 border-2 border-slate-300 rounded-lg focus:bg-white focus:border-[#1C4E80] focus:ring-2 focus:ring-[#1C4E80]/20 outline-none transition-all placeholder:text-slate-400 font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Filtro Rápido de Status */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-[#1C4E80] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({guests.length})
            </button>
            <button
              onClick={() => setFilterMode('aguardando')}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                filterMode === 'aguardando'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Aguardando Chegada ({guests.filter(g => g.presenca === 'aguardando').length})
            </button>
            <button
              onClick={() => setFilterMode('presente')}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                filterMode === 'presente'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Já Credenciados ({totalPresentes})
            </button>
          </div>

          <span className="text-slate-500 hidden sm:inline">
            Mostrando <strong>{filteredGuests.length}</strong> convidados
          </span>
        </div>
      </div>

      {/* Lista Otimizada para Operação de Portaria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredGuests.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-lg border border-slate-200 text-slate-400">
            Nenhum convidado localizado com o termo pesquisado.
          </div>
        ) : (
          filteredGuests.map(guest => {
            const isPresent = guest.presenca === 'presente';
            const isConflict = !!guest.conflitoAtivo;
            const isConfirmed = guest.rsvp === 'confirmado';

            return (
              <div
                key={guest.id}
                className={`bg-white rounded-lg border transition-all p-4 flex flex-col justify-between ${
                  isPresent
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-200 hover:border-[#1C4E80] shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="font-mono text-sm font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded shrink-0">
                      #{guest.numero}
                    </span>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-base text-[#182738] leading-tight truncate">
                        {guest.nome}
                      </h3>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <span className="font-medium text-slate-700">{guest.categoria}</span>
                        <span>·</span>
                        <span className={guest.papel === 'representante' ? 'text-indigo-700 font-semibold' : guest.papel === 'acompanhante' ? 'text-sky-700 font-medium' : 'text-slate-600'}>
                          {guest.papel.toUpperCase()}
                        </span>

                        {guest.relacionamento?.titularNome && (
                          <>
                            <span>·</span>
                            <span className="text-slate-500 truncate" title={`Vinculado a ${guest.relacionamento.titularNome}`}>
                              de {guest.relacionamento.titularNome}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Aviso de Origem de Acompanhante Promovido (CA-05) */}
                      {guest.papel === 'representante' && guest.relacionamento?.tipoOriginal === 'acompanhante' && (
                        <div className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded mt-1 inline-block">
                          Origem: acompanhante de {guest.relacionamento.titularNome}
                        </div>
                      )}

                      {/* Alerta de Conflito Ativo */}
                      {isConflict && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Conflito: titular e representante confirmados</span>
                        </div>
                      )}

                      {guest.observacao && (
                        <p className="text-xs text-slate-500 italic mt-1.5 truncate">
                          Obs: {guest.observacao}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Estado RSVP com botão rápido de Desfazer Confirmação */}
                  <div className="shrink-0 text-right flex flex-col items-end gap-1">
                    {guest.rsvp === 'confirmado' ? (
                      <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        RSVP Confirmado
                      </span>
                    ) : guest.rsvp === 'recusado' ? (
                      <span className="text-xs text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        RSVP Recusado
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        RSVP Pendente
                      </span>
                    )}

                    {canOperate && isConfirmed && (
                      <button
                        onClick={() => handleOpenUndoRsvpModal(guest)}
                        className="text-[10px] text-slate-500 hover:text-amber-800 underline flex items-center gap-0.5"
                        title="Desfazer confirmação (retornar para Pendente)"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        Desfazer RSVP
                      </button>
                    )}
                  </div>
                </div>

                {/* Linha de Ação Rápida de Credenciamento e Estorno */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {isPresent ? (
                      <div>
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Check-in às {guest.checkInAt ? new Date(guest.checkInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          por {guest.checkInBy || 'Recepção'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">
                        Aguardando portaria
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isPresent ? (
                      canRevert && (
                        <button
                          onClick={() => handleOpenEstornoModal(guest)}
                          className="min-h-[44px] px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-xs"
                          title="Estornar presença (correção operacional)"
                        >
                          <RotateCcw className="w-4 h-4 text-amber-700" />
                          <span>Estornar Check-in</span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleCheckIn(guest)}
                        disabled={!canOperate}
                        className={`min-h-[44px] px-5 py-2 rounded-md font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                          canOperate
                            ? 'bg-[#0B2A4A] hover:bg-[#1C4E80] active:scale-98 text-white shadow-sm'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <UserCheck className="w-4 h-4 text-emerald-300" />
                        <span>Credenciar Agora</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Estorno de Presença */}
      {isEstornoModalOpen && estornoTargetGuest && (
        <ConfirmActionModal
          isOpen={isEstornoModalOpen}
          onClose={() => {
            setIsEstornoModalOpen(false);
            setEstornoTargetGuest(null);
          }}
          actionType="estorno_checkin"
          title="Estornar Credenciamento"
          description={`Você está revertendo a presença do convidado #${estornoTargetGuest.numero} ${estornoTargetGuest.nome}. O estado retornará para "Aguardando credenciamento" e a operação será registrada na auditoria.`}
          targetName={estornoTargetGuest.nome}
          targetNumero={estornoTargetGuest.numero}
          confirmLabel="Confirmar Estorno"
          onConfirm={handleConfirmEstorno}
        />
      )}

      {/* Modal de Desfazer Confirmação RSVP */}
      {isUndoRsvpModalOpen && undoRsvpTargetGuest && (
        <ConfirmActionModal
          isOpen={isUndoRsvpModalOpen}
          onClose={() => {
            setIsUndoRsvpModalOpen(false);
            setUndoRsvpTargetGuest(null);
          }}
          actionType="desfazer_rsvp"
          title="Desfazer Confirmação RSVP"
          description={`Você está cancelando a confirmação recente de #${undoRsvpTargetGuest.numero} ${undoRsvpTargetGuest.nome}. O status RSVP retornará para "Pendente" e as regras de relacionamento serão reajustadas.`}
          targetName={undoRsvpTargetGuest.nome}
          targetNumero={undoRsvpTargetGuest.numero}
          confirmLabel="Desfazer Confirmação"
          onConfirm={handleConfirmUndoRsvp}
        />
      )}
    </div>
  );
};
