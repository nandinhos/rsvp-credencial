import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  UserPlus,
  Edit2,
  Info,
  CheckCircle2
} from 'lucide-react';
import { EventItem, Guest, GuestRole, RSVPStatus } from '../types';
import { store } from '../services/store';

interface GuestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem;
  existingGuest?: Guest | null;
  allGuests: Guest[];
  onSuccess: () => void;
}

export const GuestFormModal: React.FC<GuestFormModalProps> = ({
  isOpen,
  onClose,
  event,
  existingGuest,
  allGuests,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const isEditing = !!existingGuest;

  const [nome, setNome] = useState(existingGuest?.nome || '');
  const [categoria, setCategoria] = useState(existingGuest?.categoria || event.categorias[0]?.nome || 'Convidado geral');
  const [papel, setPapel] = useState<GuestRole>(existingGuest?.papel || 'titular');
  const [titularId, setTitularId] = useState<string>(existingGuest?.relacionamento?.titularId || '');
  const [rsvp, setRsvp] = useState<RSVPStatus>(existingGuest?.rsvp || 'pendente');
  const [observacao, setObservacao] = useState(existingGuest?.observacao || '');
  const [motivoVinculo, setMotivoVinculo] = useState(existingGuest?.relacionamento?.motivo || '');

  // Candidatos a titular (exclui a si mesmo e convidados deletados)
  const availableTitulares = allGuests.filter(g =>
    !g.deletedAt && (!existingGuest || g.id !== existingGuest.id) && g.papel === 'titular'
  );

  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nome.trim()) {
      setError('O nome do convidado é obrigatório.');
      return;
    }

    if (!categoria.trim()) {
      setError('A categoria é obrigatória (CA-02).');
      return;
    }

    if ((papel === 'acompanhante' || papel === 'representante') && !titularId) {
      setError('Para cadastrar acompanhante ou representante, selecione o titular correspondente.');
      return;
    }

    try {
      const selectedTitular = allGuests.find(g => g.id === titularId);

      const relacionamento = (papel === 'acompanhante' || papel === 'representante') ? {
        tipoOriginal: papel,
        titularId,
        titularNome: selectedTitular?.nome,
        motivo: motivoVinculo.trim() || undefined,
        dataVinculo: new Date().toISOString(),
      } : null;

      if (isEditing && existingGuest) {
        store.updateGuest(existingGuest.id, {
          nome: nome.trim(),
          categoria,
          papel,
          rsvp,
          relacionamento,
          observacao: observacao.trim(),
        });
      } else {
        store.addGuest({
          eventId: event.id,
          nome: nome.trim(),
          categoria,
          papel,
          rsvp,
          relacionamento,
          observacao: observacao.trim(),
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar convidado.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-[#0B2A4A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing ? <Edit2 className="w-5 h-5 text-sky-300" /> : <UserPlus className="w-5 h-5 text-sky-300" />}
            <h2 className="text-base font-bold">
              {isEditing ? `Editar Convidado #${existingGuest?.numero}` : 'Cadastrar Novo Convidado'}
            </h2>
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
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Alm. Roberto Mendonça"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Categoria Obrigatória */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Categoria Obrigatória (CA-02) *
              </label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none bg-white"
              >
                {event.categorias.map(cat => (
                  <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                ))}
              </select>
            </div>

            {/* Confirmação RSVP */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Confirmação RSVP *
              </label>
              <select
                value={rsvp}
                onChange={e => setRsvp(e.target.value as RSVPStatus)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none bg-white font-medium"
              >
                <option value="pendente">Pendente (Aguardando)</option>
                <option value="confirmado">Confirmado</option>
                <option value="recusado">Não participará (Recusado)</option>
              </select>
            </div>
          </div>

          {/* Papel do Convidado */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Papel de Participação *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPapel('titular')}
                className={`py-2 px-2 text-center rounded border font-medium ${
                  papel === 'titular'
                    ? 'bg-[#1C4E80] text-white border-[#1C4E80]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Titular
              </button>

              <button
                type="button"
                onClick={() => setPapel('acompanhante')}
                className={`py-2 px-2 text-center rounded border font-medium ${
                  papel === 'acompanhante'
                    ? 'bg-[#1C4E80] text-white border-[#1C4E80]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Acompanhante
              </button>

              <button
                type="button"
                onClick={() => setPapel('representante')}
                className={`py-2 px-2 text-center rounded border font-medium ${
                  papel === 'representante'
                    ? 'bg-[#1C4E80] text-white border-[#1C4E80]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Representante
              </button>
            </div>
          </div>

          {/* Vínculo de Titular (quando for acompanhante ou representante) */}
          {(papel === 'acompanhante' || papel === 'representante') && (
            <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 space-y-2">
              <label className="block font-semibold text-sky-950 mb-1">
                Selecione o Titular Vinculado *
              </label>
              <select
                value={titularId}
                onChange={e => setTitularId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-sky-300 rounded focus:border-[#1C4E80] outline-none bg-white"
              >
                <option value="">Selecione o titular na lista...</option>
                {availableTitulares.map(t => (
                  <option key={t.id} value={t.id}>
                    #{t.numero} {t.nome} ({t.categoria}) - RSVP: {t.rsvp}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={motivoVinculo}
                onChange={e => setMotivoVinculo(e.target.value)}
                placeholder="Motivo / Vínculo (ex: Cônjuge, Chefe de Gabinete)"
                className="w-full px-3 py-1.5 text-xs border border-sky-300 rounded focus:border-[#1C4E80] outline-none bg-white placeholder:text-slate-400"
              />

              <p className="text-[11px] text-sky-800">
                <strong>Regra:</strong> Se acompanhante for confirmado e o titular estiver pendente, ele será automaticamente promovido a Representante (CA-05).
              </p>
            </div>
          )}

          {/* Observação */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Observação (Opcional)
            </label>
            <textarea
              rows={2}
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Ex: Assento reservado na mesa de honra, restrições alimentares, etc."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none"
            />
          </div>

          {/* Footer Actions */}
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
              {isEditing ? 'Salvar Alterações' : 'Cadastrar Convidado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
