import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { GuestListView } from './components/GuestListView';
import { CheckInStationView } from './components/CheckInStationView';
import { ImportPipelineView } from './components/ImportPipelineView';
import { AuditLogView } from './components/AuditLogView';
import { EventSettingsView } from './components/EventSettingsView';
import { GuestFormModal } from './components/GuestFormModal';
import { GuestDetailModal } from './components/GuestDetailModal';
import { ConflictResolutionModal } from './components/ConflictResolutionModal';
import { ExportModal } from './components/ExportModal';
import { PrintableReport } from './components/PrintableReport';
import { NewEventModal } from './components/NewEventModal';
import { CriteriaVerifierModal } from './components/CriteriaVerifierModal';
import { ActionToastContainer, ToastItem } from './components/ActionToast';
import { ConfirmActionModal } from './components/ConfirmActionModal';
import { store } from './services/store';
import { Guest } from './types';
import { ShieldCheck, BookOpen } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'guests' | 'checkin' | 'import' | 'audit' | 'events'>('dashboard');

  // Store state subscriber
  const [tick, setTick] = useState(0);
  useEffect(() => {
    return store.subscribe(() => setTick(t => t + 1));
  }, []);

  const currentUser = store.getActiveUser();
  const allUsers = store.getUsers();
  const authorizedEvents = store.getAuthorizedEvents();
  const activeEvent = store.getActiveEvent() || authorizedEvents[0];

  // Convidados e Auditoria do evento ativo
  const guests = useMemo(() => {
    if (!activeEvent) return [];
    try {
      return store.getGuests(activeEvent.id);
    } catch {
      return [];
    }
  }, [activeEvent, currentUser, tick]);

  const auditLogs = useMemo(() => {
    return store.getAuditLogs();
  }, [tick]);

  const metrics = useMemo(() => {
    if (!activeEvent) {
      return {
        publicoEstimado: 0,
        confirmadosTitulares: 0,
        acompanhantesConfirmados: 0,
        representantesConfirmados: 0,
        naoConfirmados: 0,
        presencas: 0,
        participantesPrevistos: 0,
        taxaConfirmacao: null,
        taxaComparecimento: null,
        saldoCapacidade: 0,
        ausentesPrevistos: 0,
        totalCadastrados: 0,
        conflitosCount: 0,
        conflitos: [],
      };
    }
    return store.getDashboardMetrics(activeEvent.id);
  }, [activeEvent, guests]);

  // Sistema de Toasts interativos com ação de Desfazer
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const triggerToast = (toast: {
    type: 'success' | 'warning' | 'info';
    title: string;
    message: string;
    undoAction?: () => void;
    undoLabel?: string;
  }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 7000);
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Filtro inicial para Lista de Convidados acionado pelo Dashboard
  const [guestListFilter, setGuestListFilter] = useState<{
    papel?: string;
    rsvp?: string;
    presence?: string;
    conflict?: boolean;
  } | null>(null);

  const handleFilterFromDashboard = (filter: { papel?: string; rsvp?: string; presence?: string }) => {
    setGuestListFilter(filter);
    setCurrentTab('guests');
  };

  // Modais
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isGuestFormModalOpen, setIsGuestFormModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [selectedGuestDetail, setSelectedGuestDetail] = useState<Guest | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [isPrintFiltered, setIsPrintFiltered] = useState(false);
  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [isRestoreDemoModalOpen, setIsRestoreDemoModalOpen] = useState(false);

  // Abertura de edição de convidado
  const handleOpenEditGuest = (guest: Guest) => {
    setEditingGuest(guest);
    setIsGuestFormModalOpen(true);
  };

  const handleOpenAddGuest = () => {
    setEditingGuest(null);
    setIsGuestFormModalOpen(true);
  };

  // Confirmação de restauração dos dados de demonstração
  const handleConfirmRestoreDemo = () => {
    store.resetToInitial();
    triggerToast({
      type: 'success',
      title: 'Dados Restaurados',
      message: 'A base de demonstração foi redefinida com os eventos e convidados originais do PRD.',
    });
  };

  // Ações a partir do modal de detalhes do convidado
  const handleCheckInFromDetail = (guest: Guest) => {
    try {
      store.performCheckIn(guest.id);
      setSelectedGuestDetail(prev => prev && prev.id === guest.id ? { ...prev, presenca: 'presente' } : prev);
      triggerToast({
        type: 'success',
        title: `Credenciamento Realizado: #${guest.numero} ${guest.nome}`,
        message: 'Presença registrada.',
        undoLabel: 'Desfazer Check-in',
        undoAction: () => {
          store.revertCheckIn(guest.id, 'Desfazer credenciamento via detalhes');
          setSelectedGuestDetail(prev => prev && prev.id === guest.id ? { ...prev, presenca: 'aguardando' } : prev);
        },
      });
    } catch (err: unknown) {
      triggerToast({
        type: 'warning',
        title: 'Atenção',
        message: err instanceof Error ? err.message : 'Falha ao credenciar.',
      });
    }
  };

  const handleEstornoFromDetail = (guest: Guest) => {
    try {
      store.revertCheckIn(guest.id, 'Estorno solicitado no painel de detalhes');
      setSelectedGuestDetail(prev => prev && prev.id === guest.id ? { ...prev, presenca: 'aguardando' } : prev);
      triggerToast({
        type: 'info',
        title: `Estorno Concluído: #${guest.numero} ${guest.nome}`,
        message: 'Presença revertida para aguardando.',
        undoLabel: 'Refazer Check-in',
        undoAction: () => {
          store.performCheckIn(guest.id);
          setSelectedGuestDetail(prev => prev && prev.id === guest.id ? { ...prev, presenca: 'presente' } : prev);
        },
      });
    } catch (err: unknown) {
      triggerToast({
        type: 'warning',
        title: 'Atenção',
        message: err instanceof Error ? err.message : 'Falha ao estornar.',
      });
    }
  };

  const handleUndoRsvpFromDetail = (guest: Guest) => {
    try {
      const anterior = guest.rsvp;
      store.undoRSVP(guest.id, 'Desfazer confirmação via painel de detalhes');
      setSelectedGuestDetail(prev => prev && prev.id === guest.id ? { ...prev, rsvp: 'pendente' } : prev);
      triggerToast({
        type: 'info',
        title: `Confirmação Desfeita: #${guest.numero} ${guest.nome}`,
        message: 'RSVP retornado para Pendente.',
        undoLabel: 'Reconfirmar RSVP',
        undoAction: () => {
          store.updateRSVP(guest.id, anterior);
          setSelectedGuestDetail(prev => prev && prev.id === guest.id ? { ...prev, rsvp: anterior } : prev);
        },
      });
    } catch (err: unknown) {
      triggerToast({
        type: 'warning',
        title: 'Atenção',
        message: err instanceof Error ? err.message : 'Falha ao desfazer RSVP.',
      });
    }
  };

  if (allUsers.length === 0 && !activeEvent) {
    return (
      <div className="min-h-screen bg-[#F6F9FC] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-[#1C4E80] border-t-transparent rounded-full animate-spin mb-3" />
        <h2 className="text-[#0B2A4A] font-semibold text-sm">Carregando Cerimonial & RSVP...</h2>
        <p className="text-slate-500 text-xs mt-1">Conectando ao banco de dados PostgreSQL...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F9FC] text-[#182738] flex flex-col font-sans">
      {/* Header com Navegação e Controles de Sessão */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'guests') setGuestListFilter(null);
        }}
        activeEvent={activeEvent}
        authorizedEvents={authorizedEvents}
        currentUser={currentUser}
        allUsers={allUsers}
        onOpenNewEvent={() => setIsNewEventModalOpen(true)}
        onRestoreDemo={() => setIsRestoreDemoModalOpen(true)}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!activeEvent ? (
          <div className="bg-white p-12 text-center rounded-lg border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800">Nenhum evento autorizado localizado</h2>
            <p className="text-xs text-slate-500 mt-1">
              O usuário ativo não possui permissão para acessar os eventos cadastrados (CA-01).
            </p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                event={activeEvent}
                metrics={metrics}
                currentUser={currentUser}
                onNavigateTab={(tab) => {
                  setCurrentTab(tab);
                  if (tab === 'guests') setGuestListFilter(null);
                }}
                onOpenConflictModal={() => setIsConflictModalOpen(true)}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                onOpenAddGuestModal={handleOpenAddGuest}
                onFilterGuests={handleFilterFromDashboard}
              />
            )}

            {currentTab === 'guests' && (
              <GuestListView
                event={activeEvent}
                guests={guests}
                currentUser={currentUser}
                onOpenAddGuestModal={handleOpenAddGuest}
                onOpenEditGuestModal={handleOpenEditGuest}
                onOpenConflictModal={() => setIsConflictModalOpen(true)}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                onSelectGuestDetail={setSelectedGuestDetail}
                initialFilter={guestListFilter}
                onClearInitialFilter={() => setGuestListFilter(null)}
                onTriggerToast={triggerToast}
              />
            )}

            {currentTab === 'checkin' && (
              <CheckInStationView
                event={activeEvent}
                guests={guests}
                currentUser={currentUser}
                onOpenConflictModal={() => setIsConflictModalOpen(true)}
                onTriggerToast={triggerToast}
              />
            )}

            {currentTab === 'import' && (
              <ImportPipelineView
                event={activeEvent}
                currentUser={currentUser}
                onSuccessImport={() => {
                  setGuestListFilter(null);
                  setCurrentTab('guests');
                  triggerToast({
                    type: 'success',
                    title: 'Importação Concluída',
                    message: 'Novos convidados integrados e numerados no evento.',
                  });
                }}
              />
            )}

            {currentTab === 'audit' && (
              <AuditLogView
                event={activeEvent}
                auditLogs={auditLogs}
                currentUser={currentUser}
              />
            )}

            {currentTab === 'events' && (
              <EventSettingsView
                event={activeEvent}
                currentUser={currentUser}
                onRefresh={() => setTick(t => t + 1)}
                onOpenNewEventModal={() => setIsNewEventModalOpen(true)}
                onTriggerToast={triggerToast}
              />
            )}
          </>
        )}
      </main>

      {/* Rodapé Institucional com Link para os Critérios de Aceite */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#0B2A4A]">Cerimonial & RSVP</span>
            <span>·</span>
            <span>MVP Premium 1.0 (Metodologia PonyTail)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCriteriaModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-[#1C4E80] hover:text-[#0B2A4A] font-semibold hover:underline"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Ver Matriz de Critérios de Aceite (CA-01 a CA-14)</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modais do Sistema */}
      {isNewEventModalOpen && (
        <NewEventModal
          isOpen={isNewEventModalOpen}
          onClose={() => setIsNewEventModalOpen(false)}
          onSuccess={() => {
            setTick(t => t + 1);
            triggerToast({
              type: 'success',
              title: 'Evento Cadastrado',
              message: 'Novo evento institucional criado com sucesso.',
            });
          }}
        />
      )}

      {isGuestFormModalOpen && activeEvent && (
        <GuestFormModal
          isOpen={isGuestFormModalOpen}
          onClose={() => {
            setIsGuestFormModalOpen(false);
            setEditingGuest(null);
          }}
          event={activeEvent}
          existingGuest={editingGuest}
          allGuests={guests}
          onSuccess={() => {
            setTick(t => t + 1);
            triggerToast({
              type: 'success',
              title: editingGuest ? 'Convidado Atualizado' : 'Convidado Cadastrado',
              message: 'Dados persistidos e auditados com sucesso.',
            });
          }}
        />
      )}

      {selectedGuestDetail && (
        <GuestDetailModal
          guest={selectedGuestDetail}
          onClose={() => setSelectedGuestDetail(null)}
          auditLogs={auditLogs}
          currentUser={currentUser}
          onEdit={handleOpenEditGuest}
          onCheckIn={handleCheckInFromDetail}
          onEstorno={handleEstornoFromDetail}
          onUndoRsvp={handleUndoRsvpFromDetail}
        />
      )}

      {isConflictModalOpen && (
        <ConflictResolutionModal
          isOpen={isConflictModalOpen}
          onClose={() => setIsConflictModalOpen(false)}
          conflicts={metrics.conflitos}
          allGuests={guests}
          currentUser={currentUser}
        />
      )}

      {isExportModalOpen && activeEvent && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          event={activeEvent}
          allGuests={guests}
          filteredGuests={guests}
          hasFilterActive={false}
          currentUser={currentUser}
          onOpenPrintReport={(filtered) => {
            setIsPrintFiltered(filtered);
            setIsPrintReportOpen(true);
          }}
        />
      )}

      {isPrintReportOpen && activeEvent && (
        <PrintableReport
          event={activeEvent}
          guests={guests}
          metrics={metrics}
          onClose={() => setIsPrintReportOpen(false)}
        />
      )}

      {isCriteriaModalOpen && (
        <CriteriaVerifierModal
          isOpen={isCriteriaModalOpen}
          onClose={() => setIsCriteriaModalOpen(false)}
          onSelectTab={setCurrentTab}
        />
      )}

      {/* Modal de Confirmação para Restaurar Demonstração */}
      {isRestoreDemoModalOpen && (
        <ConfirmActionModal
          isOpen={isRestoreDemoModalOpen}
          onClose={() => setIsRestoreDemoModalOpen(false)}
          actionType="resetar_dados"
          title="Restaurar Dados de Demonstração"
          description="Deseja recarregar o banco de dados inicial do PRD com os 3 eventos padrão, categorias, convidados, promoções e conflitos exemplares? Todas as alterações manuais recentes serão reinicializadas."
          confirmLabel="Restaurar Demonstração"
          onConfirm={handleConfirmRestoreDemo}
        />
      )}

      {/* Contêiner de Toasts com Suporte a Desfazer Imediato */}
      <ActionToastContainer
        toasts={toasts}
        onDismiss={handleDismissToast}
      />
    </div>
  );
}
