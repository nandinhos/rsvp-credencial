import React from 'react';
import { EventItem, Guest } from '../types';

interface PrintableReportProps {
  event: EventItem;
  guests: Guest[];
  metrics: {
    publicoEstimado: number;
    confirmadosTitulares: number;
    acompanhantesConfirmados: number;
    representantesConfirmados: number;
    naoConfirmados: number;
    presencas: number;
    participantesPrevistos: number;
  };
  filterDescription?: string;
  onClose: () => void;
}

export const PrintableReport: React.FC<PrintableReportProps> = ({
  event,
  guests,
  metrics,
  filterDescription = 'Lista Geral Completa',
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs overflow-y-auto flex justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="bg-white max-w-4xl w-full rounded-lg shadow-2xl p-6 sm:p-10 text-slate-800 print:shadow-none print:w-full print:max-w-none print:p-0 print:rounded-none">
        {/* Barra de Ações na Visualização de Tela (Oculta na Impressão) */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-200 print:hidden">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-[#1C4E80]">
              Pré-Visualização para Impressão e PDF
            </span>
            <p className="text-xs text-slate-500">
              Formatação otimizada para folhas A4 e relatórios de cerimonial.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-50 transition-colors"
            >
              Fechar Visualização
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#0B2A4A] hover:bg-[#1C4E80] text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>Imprimir / Salvar como PDF</span>
            </button>
          </div>
        </div>

        {/* Cabeçalho Oficial do Relatório de Cerimonial (PRD Seção 7) */}
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
          <div className="text-xs uppercase tracking-widest font-bold text-slate-600">
            Comando e Cerimonial · Relatório Oficial de Presença
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 uppercase tracking-tight">
            {event.nome}
          </h1>
          <div className="text-xs text-slate-600 mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            <span><strong>Data:</strong> {event.dataHorario}</span>
            <span>·</span>
            <span><strong>Local:</strong> {event.local}</span>
            <span>·</span>
            <span><strong>Escopo:</strong> {filterDescription}</span>
          </div>
        </div>

        {/* Indicadores Consolidados */}
        <div className="grid grid-cols-4 gap-3 border border-slate-300 p-3 rounded mb-6 text-xs text-center bg-slate-50 print:bg-transparent">
          <div className="border-r border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Público Estimado</span>
            <span className="text-lg font-bold text-slate-800">{metrics.publicoEstimado}</span>
          </div>
          <div className="border-r border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Participantes Previstos</span>
            <span className="text-lg font-bold text-slate-800">{metrics.participantesPrevistos}</span>
            <span className="text-[9px] text-slate-500 block">({metrics.confirmadosTitulares} Tit. + {metrics.acompanhantesConfirmados} Acomp. + {metrics.representantesConfirmados} Repr.)</span>
          </div>
          <div className="border-r border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Credenciados (Presentes)</span>
            <span className="text-lg font-bold text-emerald-800">{metrics.presencas}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total na Lista</span>
            <span className="text-lg font-bold text-slate-800">{guests.length}</span>
          </div>
        </div>

        {/* Tabela de Convidados com Densidade e Legibilidade para Impressão */}
        <table className="w-full text-left text-xs border border-slate-300 border-collapse mb-6">
          <thead>
            <tr className="bg-slate-100 print:bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
              <th className="p-2 border-r border-slate-300 w-12 text-center">Nº</th>
              <th className="p-2 border-r border-slate-300">Nome Completo</th>
              <th className="p-2 border-r border-slate-300 w-28">Categoria</th>
              <th className="p-2 border-r border-slate-300 w-32">Papel / Vínculo</th>
              <th className="p-2 border-r border-slate-300 w-24">RSVP</th>
              <th className="p-2 w-36">Presença Física</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {guests.map(guest => {
              const isPresent = guest.presenca === 'presente';
              return (
                <tr key={guest.id} className="text-slate-800 page-break-inside-avoid">
                  <td className="p-2 border-r border-slate-200 font-mono text-center font-bold">
                    #{guest.numero}
                  </td>
                  <td className="p-2 border-r border-slate-200 font-semibold">
                    {guest.nome}
                    {guest.observacao && (
                      <span className="block text-[10px] text-slate-500 font-normal italic">
                        Obs: {guest.observacao}
                      </span>
                    )}
                  </td>
                  <td className="p-2 border-r border-slate-200">
                    {guest.categoria}
                  </td>
                  <td className="p-2 border-r border-slate-200">
                    <span className="font-medium capitalize">{guest.papel}</span>
                    {guest.relacionamento?.tipoOriginal === 'acompanhante' ? (
                      <span className="block text-[10px] text-slate-500">
                        Origem: acomp. de {guest.relacionamento.titularNome}
                      </span>
                    ) : guest.relacionamento?.titularNome ? (
                      <span className="block text-[10px] text-slate-500">
                        de {guest.relacionamento.titularNome}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-2 border-r border-slate-200">
                    {guest.rsvp === 'confirmado' ? (
                      <span className="font-semibold text-emerald-800">Confirmado</span>
                    ) : guest.rsvp === 'recusado' ? (
                      <span className="text-slate-500">Não participará</span>
                    ) : (
                      <span className="text-slate-400">Pendente</span>
                    )}
                  </td>
                  <td className="p-2">
                    {isPresent ? (
                      <span className="font-bold text-slate-900">
                        [X] Presente ({guest.checkInAt ? new Date(guest.checkInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''})
                      </span>
                    ) : (
                      <span className="text-slate-400">[ ] Aguardando</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Rodapé do Relatório */}
        <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Documento emitido em {new Date().toLocaleString('pt-BR')} pelo Sistema Cerimonial & RSVP.
          </span>
          <span>
            Página 1 de 1 · Autenticidade e Auditoria Garantidas
          </span>
        </div>
      </div>
    </div>
  );
};
