import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  CheckCircle2,
  Users,
  ShieldAlert,
  ArrowRight,
  Info
} from 'lucide-react';
import { Guest, User } from '../types';
import { store } from '../services/store';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: Guest[];
  allGuests: Guest[];
  currentUser: User;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  allGuests,
  currentUser,
}) => {
  if (!isOpen) return null;

  const canResolve = currentUser.role === 'admin' || currentUser.role === 'gestor';

  // Identifica pares de conflito: Convidado titular confirmado E seu representante confirmado
  const conflictPairs = conflicts
    .filter(g => g.papel === 'titular')
    .map(titular => {
      const reps = allGuests.filter(
        g => g.relacionamento?.titularId === titular.id &&
             g.papel === 'representante' &&
             g.rsvp === 'confirmado' &&
             !g.deletedAt
      );
      return {
        titular,
        representantes: reps,
      };
    })
    .filter(pair => pair.representantes.length > 0);

  const [feedback, setFeedback] = useState<{ error?: string; success?: string } | null>(null);

  const handleResolve = (
    titularId: string,
    representanteId: string,
    action: 'converter_acompanhante' | 'desconfirmar_titular' | 'desconfirmar_representante' | 'emancipar_titular_independente'
  ) => {
    setFeedback(null);
    try {
      store.resolveConflict(titularId, representanteId, action);
      setFeedback({ success: 'Resolução aplicada e registrada na auditoria com sucesso!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      setFeedback({ error: err instanceof Error ? err.message : 'Falha na resolução do conflito.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-900 font-bold">
              <AlertTriangle className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-950">
                Resolução Explícita de Conflito de Representação (CA-06)
              </h2>
              <p className="text-xs text-amber-800">
                Titular e representante confirmaram participação concomitantemente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded text-slate-700 space-y-1">
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#1C4E80]" />
              Regra de Integridade (PRD Seção 2.5):
            </p>
            <p className="text-[11px] text-slate-600">
              O sistema <strong>não exclui nem modifica silenciosamente</strong> registros. O operador autorizado deve escolher a diretriz oficial para cada caso antes do encerramento das listas.
            </p>
          </div>

          {feedback?.error && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded font-medium">
              {feedback.error}
            </div>
          )}

          {feedback?.success && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{feedback.success}</span>
            </div>
          )}

          {conflictPairs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-semibold text-sm text-slate-800">Nenhum conflito ativo pendente!</p>
              <p className="text-xs text-slate-500 mt-0.5">Todos os titulares e representantes estão regularizados.</p>
            </div>
          ) : (
            conflictPairs.map(({ titular, representantes }) => (
              <div
                key={titular.id}
                className="border-2 border-amber-300 rounded-lg p-4 bg-amber-50/20 space-y-4"
              >
                {/* Visualizador do Par */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-amber-200">
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Titular Confirmado
                    </span>
                    <p className="font-bold text-sm text-[#182738] mt-0.5">
                      #{titular.numero} {titular.nome}
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">{titular.categoria} · RSVP: Confirmado</p>
                  </div>

                  {representantes.map(rep => (
                    <div key={rep.id} className="bg-white p-3 rounded border border-indigo-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block">
                        Representante Confirmado
                      </span>
                      <p className="font-bold text-sm text-indigo-950 mt-0.5">
                        #{rep.numero} {rep.nome}
                      </p>
                      <p className="text-indigo-700 text-[11px] mt-0.5">
                        {rep.categoria} · {rep.relacionamento?.tipoOriginal === 'acompanhante' ? 'Origem: acompanhante' : 'Substituto'}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Opções de Resolução */}
                {canResolve ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-800 text-xs">
                      Selecione a resolução oficial:
                    </p>

                    {representantes.map(rep => (
                      <div key={rep.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => handleResolve(titular.id, rep.id, 'converter_acompanhante')}
                          className="text-left p-2.5 rounded border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-900 transition-colors"
                        >
                          <strong className="block text-xs font-semibold">1. Comparecerão Ambos (Titular + Acompanhante)</strong>
                          <span className="text-[11px] text-sky-700 block mt-0.5">
                            Converte #{rep.numero} de volta para Acompanhante oficial do titular.
                          </span>
                        </button>

                        <button
                          onClick={() => handleResolve(titular.id, rep.id, 'emancipar_titular_independente')}
                          className="text-left p-2.5 rounded border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 transition-colors"
                        >
                          <strong className="block text-xs font-semibold">2. Dois Titulares Independentes</strong>
                          <span className="text-[11px] text-indigo-700 block mt-0.5">
                            Emancipa #{rep.numero} para Convidado Titular individual.
                          </span>
                        </button>

                        <button
                          onClick={() => handleResolve(titular.id, rep.id, 'desconfirmar_representante')}
                          className="text-left p-2.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors"
                        >
                          <strong className="block text-xs font-semibold">3. Manter Apenas o Titular #{titular.numero}</strong>
                          <span className="text-[11px] text-slate-600 block mt-0.5">
                            Desconfirma o representante (marcado como não participará).
                          </span>
                        </button>

                        <button
                          onClick={() => handleResolve(titular.id, rep.id, 'desconfirmar_titular')}
                          className="text-left p-2.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors"
                        >
                          <strong className="block text-xs font-semibold">4. Manter Apenas o Representante #{rep.numero}</strong>
                          <span className="text-[11px] text-slate-600 block mt-0.5">
                            Desconfirma o titular (marcado como ausente / não participará).
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">
                    Apenas usuários com perfil Administrador ou Gestor do Evento podem aplicar resoluções de conflito.
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
