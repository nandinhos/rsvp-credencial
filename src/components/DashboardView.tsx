import React from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  Download,
  Calendar,
  MapPin,
  CheckCircle2,
  TrendingUp,
  Percent,
  Lock,
} from 'lucide-react';
import { EventItem, Guest, User } from '../types';

interface DashboardViewProps {
  event: EventItem;
  metrics: {
    publicoEstimado: number;
    confirmadosTitulares: number;
    acompanhantesConfirmados: number;
    representantesConfirmados: number;
    naoConfirmados: number;
    presencas: number;
    participantesPrevistos: number;
    taxaConfirmacao: number | null;
    taxaComparecimento: number | null;
    saldoCapacidade: number;
    ausentesPrevistos: number;
    totalCadastrados: number;
    conflitosCount: number;
    conflitos: Guest[];
  };
  currentUser: User;
  onNavigateTab: (tab: 'guests' | 'checkin' | 'import' | 'audit' | 'events') => void;
  onOpenConflictModal: () => void;
  onOpenExportModal: () => void;
  onOpenAddGuestModal: () => void;
  onFilterGuests?: (filter: { papel?: string; rsvp?: string; presence?: string }) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  event,
  metrics,
  currentUser,
  onNavigateTab,
  onOpenConflictModal,
  onOpenExportModal,
  onOpenAddGuestModal,
  onFilterGuests,
}) => {
  const isClosed = event.estado === 'encerrado';
  const canManage = (currentUser.role === 'admin' || currentUser.role === 'gestor') && !isClosed;

  return (
    <div className="space-y-6">
      {/* Event Header Banner */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#1C4E80]">
              <span>Evento {event.visibilidade === 'publico' ? 'Público' : 'Reservado'}</span>
              <span>·</span>
              <span className={event.estado === 'ativo' ? 'text-emerald-700 font-semibold' : event.estado === 'encerrado' ? 'text-slate-500 font-semibold' : 'text-amber-700 font-semibold'}>
                {event.estado === 'ativo' ? 'Em Andamento (Ativo)' : event.estado === 'encerrado' ? 'Encerrado' : 'Rascunho'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B2A4A] mt-1 tracking-tight">
              {event.nome}
            </h1>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-slate-600 mt-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#1C4E80]" />
                {event.dataHorario}
              </span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#1C4E80]" />
                {event.local}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            {canManage && (
              <button
                onClick={onOpenAddGuestModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1C4E80] hover:bg-[#0B2A4A] text-white text-xs sm:text-sm font-medium rounded transition-colors shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Novo Convidado</span>
              </button>
            )}

            <button
              onClick={() => onNavigateTab('checkin')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0B2A4A] hover:bg-[#1C4E80] text-white text-xs sm:text-sm font-medium rounded transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Estação Portaria</span>
            </button>

            <button
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-medium rounded transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Relatórios / Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Conflito Ativo (CA-06) */}
      {metrics.conflitosCount > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded-r-lg shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900">
                Atenção: {metrics.conflitosCount} registro(s) com conflito de representação ativo (CA-06)
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Ocorreu confirmação mútua entre titular e seu representante. O operador autorizado deve resolver esta pendência antes da consolidação definitiva.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenConflictModal}
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0"
          >
            Resolver Conflito Agora
          </button>
        </div>
      )}

      {/* Indicadores Principais (PRD Seção 4) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Indicadores de Participação e Presença
          </h2>
          <span className="text-xs text-slate-500">
            Total na base: <strong className="text-slate-800">{metrics.totalCadastrados}</strong> pessoas cadastradas
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Card 1: Confirmados Titulares */}
          <button
            onClick={() => {
              if (onFilterGuests) onFilterGuests({ papel: 'titular', rsvp: 'confirmado' });
              else onNavigateTab('guests');
            }}
            className="text-left bg-white p-4 rounded-lg border border-slate-200 shadow-2xs hover:border-[#1C4E80] hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
              <span className="group-hover:text-[#1C4E80]">Confirmados</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-[#0B2A4A] tracking-tight group-hover:text-[#1C4E80]">
              {metrics.confirmadosTitulares}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Titulares diretos</span>
              <span className="text-[10px] text-[#1C4E80] opacity-0 group-hover:opacity-100 transition-opacity">Ver →</span>
            </div>
          </button>

          {/* Card 2: Acompanhantes Confirmados */}
          <button
            onClick={() => {
              if (onFilterGuests) onFilterGuests({ papel: 'acompanhante' });
              else onNavigateTab('guests');
            }}
            className="text-left bg-white p-4 rounded-lg border border-slate-200 shadow-2xs hover:border-[#1C4E80] hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
              <span className="group-hover:text-[#1C4E80]">Acompanhantes</span>
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-[#0B2A4A] tracking-tight group-hover:text-[#1C4E80]">
              {metrics.acompanhantesConfirmados}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Vínculos ativos</span>
              <span className="text-[10px] text-[#1C4E80] opacity-0 group-hover:opacity-100 transition-opacity">Ver →</span>
            </div>
          </button>

          {/* Card 3: Representantes Confirmados */}
          <button
            onClick={() => {
              if (onFilterGuests) onFilterGuests({ papel: 'representante' });
              else onNavigateTab('guests');
            }}
            className="text-left bg-white p-4 rounded-lg border border-slate-200 shadow-2xs hover:border-[#1C4E80] hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
              <span className="group-hover:text-[#1C4E80]">Representantes</span>
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-[#0B2A4A] tracking-tight group-hover:text-[#1C4E80]">
              {metrics.representantesConfirmados}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Substituições</span>
              <span className="text-[10px] text-[#1C4E80] opacity-0 group-hover:opacity-100 transition-opacity">Ver →</span>
            </div>
          </button>

          {/* Card 4: Não Confirmados */}
          <button
            onClick={() => {
              if (onFilterGuests) onFilterGuests({ rsvp: 'nao_confirmados' });
              else onNavigateTab('guests');
            }}
            className="text-left bg-white p-4 rounded-lg border border-slate-200 shadow-2xs hover:border-amber-500 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
              <span className="group-hover:text-amber-700">Não confirmados</span>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-700 tracking-tight group-hover:text-amber-700">
              {metrics.naoConfirmados}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Pendentes/Recusas</span>
              <span className="text-[10px] text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity">Ver →</span>
            </div>
          </button>

          {/* Card 5: Presenças Efetivas */}
          <button
            onClick={() => onNavigateTab('checkin')}
            className="text-left bg-white p-4 rounded-lg border-2 border-emerald-600/30 bg-emerald-50/20 shadow-2xs hover:border-emerald-600 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="text-xs font-semibold text-emerald-800 flex items-center justify-between">
              <span>Presenças</span>
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-900 tracking-tight group-hover:text-emerald-700">
              {metrics.presencas}
            </div>
            <div className="text-[11px] text-emerald-700 mt-1 font-medium flex items-center justify-between">
              <span>Portaria / Check-in</span>
              <span className="text-[10px] text-emerald-800 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Ir →</span>
            </div>
          </button>

          {/* Card 6: Público Estimado */}
          <button
            onClick={() => onNavigateTab('events')}
            className="text-left bg-white p-4 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
              <span>Público Estimado</span>
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight group-hover:text-[#0B2A4A]">
              {metrics.publicoEstimado}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Configurações</span>
              <span className="text-[10px] text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">Editar →</span>
            </div>
          </button>
        </div>
      </div>

      {/* Métricas Derivadas Consolidadas (PRD Seção 4) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bloco 1: Total de Participantes Previstos */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-slate-600">
              Total Previsto
            </span>
            <span className="text-[11px] text-slate-400">Titulares + Acomp. + Repr.</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0B2A4A]">
              {metrics.participantesPrevistos}
            </span>
            <span className="text-sm text-slate-500">
              / {metrics.publicoEstimado} estimados
            </span>
          </div>

          {/* Barra de progresso para capacidade */}
          <div className="mt-4">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#1C4E80] h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, metrics.taxaConfirmacao || 0)}%`,
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-slate-600">
              <span>Taxa de confirmação:</span>
              <strong className="text-slate-800">
                {metrics.taxaConfirmacao !== null ? `${metrics.taxaConfirmacao.toFixed(1)}%` : 'N/D'}
              </strong>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Saldo para capacidade:</span>
            <span className={metrics.saldoCapacidade < 0 ? 'text-rose-600 font-semibold' : 'text-slate-700 font-medium'}>
              {metrics.saldoCapacidade >= 0 ? `${metrics.saldoCapacidade} vagas disponíveis` : `Excesso de ${Math.abs(metrics.saldoCapacidade)}`}
            </span>
          </div>
        </div>

        {/* Bloco 2: Taxa de Comparecimento / Credenciamento */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-slate-600">
              Comparecimento Real
            </span>
            <span className="text-[11px] text-slate-400">Credenciados / Previstos</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-800">
              {metrics.presencas}
            </span>
            <span className="text-sm text-slate-500">
              / {metrics.participantesPrevistos} previstos
            </span>
          </div>

          {/* Barra de progresso para presenças */}
          <div className="mt-4">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, metrics.taxaComparecimento || 0)}%`,
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-slate-600">
              <span>Taxa de comparecimento:</span>
              <strong className="text-emerald-800 font-semibold">
                {metrics.taxaComparecimento !== null ? `${metrics.taxaComparecimento.toFixed(1)}%` : 'N/D (Sem previstos)'}
              </strong>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Aguardando chegada:</span>
            <span className="text-amber-700 font-medium">
              {metrics.ausentesPrevistos > 0 ? `${metrics.ausentesPrevistos} pessoas` : 'Todos credenciados'}
            </span>
          </div>
        </div>

        {/* Bloco 3: Guia de Boas Práticas Operacionais */}
        <div className="bg-gradient-to-br from-slate-50 to-sky-50/40 p-5 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#1C4E80] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#1C4E80]" />
              Regras do Cerimonial (PRD 1.0)
            </div>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-1.5">
                <span className="text-[#1C4E80] font-bold">·</span>
                <span><strong>Zero dupla contagem:</strong> Representantes e acompanhantes são contados uma única vez.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#1C4E80] font-bold">·</span>
                <span><strong>Promoção automática:</strong> Acompanhante que confirma sem o titular vira Representante.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#1C4E80] font-bold">·</span>
                <span><strong>Auditoria contínua:</strong> Todas as alterações registram operador e carimbo temporal.</span>
              </li>
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60">
            <button
              onClick={() => onNavigateTab('guests')}
              className="text-xs font-semibold text-[#1C4E80] hover:text-[#0B2A4A] flex items-center gap-1 transition-colors"
            >
              <span>Ir para Lista Completa de Convidados</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
