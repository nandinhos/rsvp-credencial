import React, { useState } from 'react';
import {
  Settings,
  Calendar,
  MapPin,
  Users,
  Eye,
  Lock,
  Unlock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Save,
  Clock
} from 'lucide-react';
import { EventCategory, EventItem, EventStatus, EventVisibility, User } from '../types';
import { store } from '../services/store';
import { ConfirmActionModal } from './ConfirmActionModal';
import { DateTimePickerInput } from './DateTimePickerInput';

interface EventSettingsViewProps {
  event: EventItem;
  currentUser: User;
  onRefresh: () => void;
  onOpenNewEventModal: () => void;
  onTriggerToast?: (toast: {
    type: 'success' | 'warning' | 'info';
    title: string;
    message: string;
    undoAction?: () => void;
    undoLabel?: string;
  }) => void;
}

export const EventSettingsView: React.FC<EventSettingsViewProps> = ({
  event,
  currentUser,
  onRefresh,
  onOpenNewEventModal,
  onTriggerToast,
}) => {
  const isClosed = event.estado === 'encerrado';
  const isAdmin = currentUser.role === 'admin';
  const canEdit = (isAdmin || currentUser.role === 'gestor') && !isClosed;

  const [nome, setNome] = useState(event.nome);
  const [dataHorario, setDataHorario] = useState(event.dataHorario);
  const [local, setLocal] = useState(event.local);
  const [visibilidade, setVisibilidade] = useState<EventVisibility>(event.visibilidade);
  const [publicoEstimado, setPublicoEstimado] = useState<number>(event.publicoEstimado);
  const [categorias, setCategorias] = useState<EventCategory[]>([...event.categorias]);
  const [newCatNome, setNewCatNome] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modais de Encerramento e Reabertura
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);

  const handleAddCategory = () => {
    if (!newCatNome.trim()) return;
    const newCat: EventCategory = {
      id: `cat-${Date.now()}`,
      nome: newCatNome.trim(),
      descricao: newCatDesc.trim() || undefined,
      cor: '#1C4E80',
    };
    setCategorias([...categorias, newCat]);
    setNewCatNome('');
    setNewCatDesc('');
    if (onTriggerToast) {
      onTriggerToast({
        type: 'info',
        title: 'Categoria Adicionada',
        message: `A categoria "${newCat.nome}" foi incluída para este evento. Clique em Salvar para consolidar.`,
      });
    }
  };

  const handleRemoveCategory = (catId: string) => {
    if (categorias.length <= 1) {
      setErrorMessage('O evento deve manter ao menos uma categoria obrigatória (CA-02).');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }
    setCategorias(categorias.filter(c => c.id !== catId));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!nome.trim() || !dataHorario.trim() || !local.trim()) {
      setErrorMessage('Preencha todos os campos obrigatórios (Nome, Data e Local).');
      return;
    }

    try {
      store.updateEvent(event.id, {
        nome: nome.trim(),
        dataHorario: dataHorario.trim(),
        local: local.trim(),
        visibilidade,
        publicoEstimado: Number(publicoEstimado) || 0,
        categorias,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefresh();

      if (onTriggerToast) {
        onTriggerToast({
          type: 'success',
          title: 'Configurações Salvas',
          message: 'As alterações do evento foram persistidas e auditadas com sucesso.',
        });
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao atualizar configurações.');
    }
  };

  // Encerramento do evento (CA-14)
  const handleConfirmClose = (motivo: string) => {
    try {
      store.closeEvent(event.id, motivo);
      onRefresh();
      if (onTriggerToast) {
        onTriggerToast({
          type: 'warning',
          title: 'Evento Encerrado (CA-14)',
          message: `O evento foi congelado contra modificações operacionais. Motivo: ${motivo}`,
        });
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao encerrar evento');
    }
  };

  // Reabertura auditada (Apenas Admin - CA-14)
  const handleConfirmReopen = (justificativa: string) => {
    try {
      store.reopenEvent(event.id, justificativa);
      onRefresh();
      if (onTriggerToast) {
        onTriggerToast({
          type: 'success',
          title: 'Evento Reaberto com Sucesso',
          message: `Operações desbloqueadas pelo Administrador. Justificativa registrada na auditoria.`,
        });
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao reabrir evento');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1C4E80]">
            <Settings className="w-4 h-4" />
            <span>Configurações e Ciclo de Vida do Evento (PRD Seção 3)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0B2A4A] tracking-tight mt-1">
            Parâmetros do Evento Ativo
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Edite os metadados, categorias permitidas e gerencie o encerramento operacional.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(isAdmin || currentUser.role === 'gestor') && (
            <button
              onClick={onOpenNewEventModal}
              className="px-3 py-2 bg-[#1C4E80] hover:bg-[#0B2A4A] text-white text-xs font-semibold rounded shadow-xs transition-colors"
            >
              + Novo Evento
            </button>
          )}

          {isClosed ? (
            isAdmin && (
              <button
                onClick={() => setIsReopenModalOpen(true)}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                <span>Reabrir Evento (Auditado)</span>
              </button>
            )
          ) : (
            (isAdmin || currentUser.role === 'gestor') && (
              <button
                onClick={() => setIsCloseModalOpen(true)}
                className="px-3 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>Encerrar Evento (CA-14)</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Alerta de Encerramento se aplicável */}
      {isClosed && (
        <div className="bg-slate-800 text-white p-4 rounded-lg flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong className="text-sm block">Evento Encerrado</strong>
              <p className="text-slate-300">
                Todas as alterações operacionais comuns estão bloqueadas (CA-14). Os dados permanecem disponíveis para consulta e auditoria.
              </p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-300 text-rose-900 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Configurações atualizadas e registradas na auditoria.</span>
        </div>
      )}

      {/* Formulário de Configurações */}
      <form onSubmit={handleSaveSettings} className="bg-white p-5 sm:p-6 rounded-lg border border-slate-200 shadow-2xs space-y-5 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-full">
            <label className="block font-semibold text-slate-700 mb-1">
              Nome do Evento *
            </label>
            <input
              type="text"
              required
              disabled={!canEdit}
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none disabled:bg-slate-50"
            />
          </div>

          <DateTimePickerInput
            value={dataHorario}
            onChange={setDataHorario}
            disabled={!canEdit}
            label="Data e Horário *"
            required
          />

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Local do Evento *
            </label>
            <input
              type="text"
              required
              disabled={!canEdit}
              value={local}
              onChange={e => setLocal(e.target.value)}
              placeholder="Ex: Salão Nobre do Comando Geral · Brasília - DF"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Público Estimado (Capacidade) *
            </label>
            <input
              type="number"
              min={1}
              required
              disabled={!canEdit}
              value={publicoEstimado}
              onChange={e => setPublicoEstimado(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Visibilidade *
            </label>
            <select
              disabled={!canEdit}
              value={visibilidade}
              onChange={e => setVisibilidade(e.target.value as EventVisibility)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none bg-white disabled:bg-slate-50 font-medium"
            >
              <option value="reservado">Reservado (Institucional / Fechado)</option>
              <option value="publico">Público (Divulgação Aberta)</option>
            </select>
          </div>
        </div>

        {/* Gestão de Categorias Configuráveis por Evento (PRD Seção 2.2) */}
        <div className="pt-4 border-t border-slate-200">
          <label className="block font-semibold text-slate-800 text-sm mb-1">
            Categorias de Convidados do Evento
          </label>
          <p className="text-slate-500 mb-3">
            Todo convidado cadastrado ou importado deve possuir uma categoria obrigatória válida (CA-02).
          </p>

          <div className="space-y-2 max-w-xl">
            {categorias.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div>
                  <span className="font-semibold text-slate-800">{cat.nome}</span>
                  {cat.descricao && (
                    <span className="text-slate-500 text-[11px] block">{cat.descricao}</span>
                  )}
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(cat.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Remover categoria"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {canEdit && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2 max-w-xl">
              <input
                type="text"
                placeholder="Nome da nova categoria"
                value={newCatNome}
                onChange={e => setNewCatNome(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs outline-none"
              />
              <input
                type="text"
                placeholder="Descrição (opcional)"
                value={newCatDesc}
                onChange={e => setNewCatDesc(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-3 py-1.5 bg-[#1C4E80] hover:bg-[#0B2A4A] text-white font-medium rounded text-xs transition-colors whitespace-nowrap"
              >
                + Adicionar Categoria
              </button>
            </div>
          )}
        </div>

        {canEdit && (
          <div className="flex justify-end pt-3 border-t border-slate-200">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0B2A4A] hover:bg-[#1C4E80] text-white font-semibold rounded shadow-xs transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações do Evento</span>
            </button>
          </div>
        )}
      </form>

      {/* Modal In-App para Encerrar Evento */}
      {isCloseModalOpen && (
        <ConfirmActionModal
          isOpen={isCloseModalOpen}
          onClose={() => setIsCloseModalOpen(false)}
          actionType="encerrar_evento"
          title="Encerrar Evento Operacionalmente"
          description={`Ao encerrar "${event.nome}", novas inclusões, confirmações RSVP e credenciamentos serão estritamente bloqueados (CA-14). Os dados permanecerão íntegros e disponíveis para auditoria.`}
          confirmLabel="Confirmar Encerramento"
          isDestructive={true}
          onConfirm={handleConfirmClose}
        />
      )}

      {/* Modal In-App para Reabrir Evento */}
      {isReopenModalOpen && (
        <ConfirmActionModal
          isOpen={isReopenModalOpen}
          onClose={() => setIsReopenModalOpen(false)}
          actionType="reabrir_evento"
          title="Reabertura Administrativa de Evento"
          description={`A reabertura de "${event.nome}" permitirá novas alterações e será obrigatoriamente registrada na trilha de auditoria sob sua responsabilidade (${currentUser.nome}).`}
          confirmLabel="Confirmar Reabertura"
          onConfirm={handleConfirmReopen}
        />
      )}
    </div>
  );
};
