import React, { useState } from 'react';
import {
  X,
  Calendar,
  Building2,
  Plus
} from 'lucide-react';
import { DEFAULT_CATEGORIES, store } from '../services/store';
import { EventVisibility } from '../types';
import { DateTimePickerInput } from './DateTimePickerInput';

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewEventModal: React.FC<NewEventModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [nome, setNome] = useState('');
  const [dataHorario, setDataHorario] = useState('15 de Novembro de 2026 às 19:30');
  const [local, setLocal] = useState('');
  const [visibilidade, setVisibilidade] = useState<EventVisibility>('reservado');
  const [publicoEstimado, setPublicoEstimado] = useState(100);

  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nome.trim() || !dataHorario.trim() || !local.trim()) {
      setError('Preencha os campos obrigatórios (Nome, Data/Horário e Local).');
      return;
    }

    try {
      store.createEvent({
        nome: nome.trim(),
        dataHorario: dataHorario.trim(),
        local: local.trim(),
        visibilidade,
        publicoEstimado: Number(publicoEstimado) || 50,
        categorias: [...DEFAULT_CATEGORIES],
        estado: 'ativo',
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao cadastrar evento.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-[#0B2A4A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-300" />
            <h2 className="text-base font-bold">Cadastrar Novo Evento</h2>
          </div>
          <button onClick={onClose} className="text-sky-200 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nome do Evento *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Cerimônia de Passagem de Comando e Outorga de Mérito"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none"
            />
          </div>

          {/* Date and Time Picker */}
          <DateTimePickerInput
            value={dataHorario}
            onChange={setDataHorario}
            label="Data e Horário do Evento *"
            required
          />

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Local do Evento *
            </label>
            <input
              type="text"
              required
              value={local}
              onChange={e => setLocal(e.target.value)}
              placeholder="Ex: Salão de Atos Oficiais · Edifício Anexo"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Público Estimado (Capacidade) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={publicoEstimado}
                onChange={e => setPublicoEstimado(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Visibilidade *
              </label>
              <select
                value={visibilidade}
                onChange={e => setVisibilidade(e.target.value as EventVisibility)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none bg-white font-medium"
              >
                <option value="reservado">Reservado (Institucional)</option>
                <option value="publico">Público (Aberto)</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 text-[11px]">
            O evento será inicializado com as 4 categorias padrão do Cerimonial: <strong>Autoridade</strong>, <strong>Diretoria</strong>, <strong>Comitê</strong> e <strong>Convidado geral</strong>. Você poderá adicionar outras categorias na aba Configurações.
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0B2A4A] hover:bg-[#1C4E80] text-white font-semibold rounded shadow-xs"
            >
              Criar Evento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
