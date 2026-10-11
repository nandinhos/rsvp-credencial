import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  X,
  Download,
  Filter,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { EventItem, Guest, User } from '../types';
import { exportGuestsToExcel } from '../services/exportService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem;
  allGuests: Guest[];
  filteredGuests: Guest[];
  hasFilterActive: boolean;
  currentUser: User;
  onOpenPrintReport: (filtered: boolean) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  event,
  allGuests,
  filteredGuests,
  hasFilterActive,
  currentUser,
  onOpenPrintReport,
}) => {
  if (!isOpen) return null;

  const [scope, setScope] = useState<'filtered' | 'all'>(hasFilterActive ? 'filtered' : 'all');

  const targetGuests = scope === 'filtered' ? filteredGuests : allGuests;

  const handleExportExcel = () => {
    exportGuestsToExcel(event, targetGuests, scope === 'filtered' ? 'filtrado' : 'completo');
    onClose();
  };

  const handleOpenPDF = () => {
    onOpenPrintReport(scope === 'filtered');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#0B2A4A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-sky-300" />
            <h2 className="text-base font-bold">Exportar e Relatórios</h2>
          </div>
          <button onClick={onClose} className="text-sky-200 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Seleção do Escopo */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              Selecione os registros para exportação:
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="exportScope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="text-[#1C4E80]"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">Lista Completa do Evento</span>
                  <span className="text-[11px] text-slate-500">Total de {allGuests.length} convidados cadastrados</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="exportScope"
                  checked={scope === 'filtered'}
                  onChange={() => setScope('filtered')}
                  className="text-[#1C4E80]"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">Resultado dos Filtros Atuais</span>
                  <span className="text-[11px] text-slate-500">Apenas os {filteredGuests.length} registros atualmente exibidos</span>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="text-[11px]">
              Proteção contra injeção de fórmulas habilitada para Excel (.xlsx). Numeração estável e dados de presença preservados.
            </span>
          </div>

          {/* Formatos Disponíveis */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExportExcel}
              className="p-3 border-2 border-emerald-600/30 hover:border-emerald-600 bg-emerald-50/30 hover:bg-emerald-50 rounded-lg text-left transition-all flex flex-col justify-between"
            >
              <div>
                <FileSpreadsheet className="w-6 h-6 text-emerald-700 mb-1" />
                <strong className="block font-semibold text-emerald-950 text-xs">Planilha Excel (.xlsx)</strong>
                <span className="text-[10px] text-emerald-800 mt-0.5 block">
                  Colunas formatadas, larguras automáticas e aba de resumo.
                </span>
              </div>
              <span className="mt-3 text-[11px] font-bold text-emerald-700">Baixar .xlsx →</span>
            </button>

            <button
              onClick={handleOpenPDF}
              className="p-3 border-2 border-[#1C4E80]/30 hover:border-[#1C4E80] bg-sky-50/30 hover:bg-sky-50 rounded-lg text-left transition-all flex flex-col justify-between"
            >
              <div>
                <Printer className="w-6 h-6 text-[#1C4E80] mb-1" />
                <strong className="block font-semibold text-[#0B2A4A] text-xs">Relatório PDF / Impressão</strong>
                <span className="text-[10px] text-slate-600 mt-0.5 block">
                  Layout cerimonial para prancheta, assinaturas e recepção.
                </span>
              </div>
              <span className="mt-3 text-[11px] font-bold text-[#1C4E80]">Visualizar / Imprimir →</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-100"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
