import React, { useState } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  X
} from 'lucide-react';

export type DialogActionType =
  | 'estorno_checkin'
  | 'desfazer_rsvp'
  | 'excluir_convidado'
  | 'encerrar_evento'
  | 'reabrir_evento'
  | 'resetar_dados';

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: DialogActionType;
  title: string;
  description: string;
  targetName?: string;
  targetNumero?: number;
  onConfirm: (reason: string) => void;
  confirmLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  onClose,
  actionType,
  title,
  description,
  targetName,
  targetNumero,
  onConfirm,
  confirmLabel = 'Confirmar',
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  // Preset reasons depending on action type
  const getPresetReasons = () => {
    switch (actionType) {
      case 'estorno_checkin':
        return [
          'Clique acidental / Erro operacional na portaria',
          'Convidado ainda não se apresentou fisicamente',
          'Identificação homônima incorreta',
          'Solicitação do cerimonial',
        ];
      case 'desfazer_rsvp':
        return [
          'Confirmação registrada por engano',
          'Convidado informou necessidade de aguardar agenda',
          'Revisão cadastral da assessoria',
        ];
      case 'excluir_convidado':
        return [
          'Convidado duplicado por engano',
          'Cancelamento definitivo de convite',
          'Desistência prévia antes do evento',
        ];
      case 'encerrar_evento':
        return [
          'Solenidade finalizada com sucesso',
          'Conclusão do credenciamento e cerimonial',
          'Fechamento administrativo dos quantitativos',
        ];
      case 'reabrir_evento':
        return [
          'Necessidade de ajuste pós-evento solicitado pelo Gabinete',
          'Auditoria e conferência de presenças',
        ];
      default:
        return [];
    }
  };

  const presetReasons = getPresetReasons();
  const [selectedPreset, setSelectedPreset] = useState<string>(presetReasons[0] || '');
  const [customReason, setCustomReason] = useState<string>('');

  const handleConfirm = () => {
    const finalReason = customReason.trim() ? customReason.trim() : selectedPreset;
    onConfirm(finalReason);
    onClose();
  };

  const getIcon = () => {
    switch (actionType) {
      case 'estorno_checkin':
        return <RotateCcw className="w-5 h-5 text-amber-600" />;
      case 'desfazer_rsvp':
        return <RotateCcw className="w-5 h-5 text-sky-600" />;
      case 'excluir_convidado':
        return <Trash2 className="w-5 h-5 text-rose-600" />;
      case 'encerrar_evento':
        return <Lock className="w-5 h-5 text-amber-700" />;
      case 'reabrir_evento':
        return <Unlock className="w-5 h-5 text-emerald-600" />;
      case 'resetar_dados':
        return <RefreshCw className="w-5 h-5 text-indigo-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
              {getIcon()}
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#182738]">{title}</h2>
              {targetName && (
                <p className="text-xs text-slate-500 font-medium truncate max-w-[240px]">
                  {targetNumero ? `#${targetNumero} ` : ''}{targetName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            {description}
          </p>

          {presetReasons.length > 0 && (
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700">
                Selecione o motivo:
              </label>
              <div className="space-y-1.5">
                {presetReasons.map(r => (
                  <label
                    key={r}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                      selectedPreset === r
                        ? 'border-[#1C4E80] bg-sky-50/50 text-[#0B2A4A] font-medium'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="presetReason"
                      checked={selectedPreset === r}
                      onChange={() => setSelectedPreset(r)}
                      className="text-[#1C4E80]"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Complemento ou Justificativa Adicional (Opcional):
            </label>
            <input
              type="text"
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="Digite detalhes complementares..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded text-xs font-semibold transition-colors shadow-xs ${
              isDestructive
                ? 'bg-rose-700 hover:bg-rose-800 text-white'
                : 'bg-[#0B2A4A] hover:bg-[#1C4E80] text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
