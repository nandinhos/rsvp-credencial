import React from 'react';
import {
  X,
  User,
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  History,
  Info,
  Calendar,
  Tag,
  RotateCcw,
  UserCheck
} from 'lucide-react';
import { AuditLog, Guest, User as AppUser } from '../types';

interface GuestDetailModalProps {
  guest: Guest | null;
  onClose: () => void;
  auditLogs: AuditLog[];
  currentUser: AppUser;
  onEdit: (guest: Guest) => void;
  onCheckIn?: (guest: Guest) => void;
  onEstorno?: (guest: Guest) => void;
  onUndoRsvp?: (guest: Guest) => void;
}

export const GuestDetailModal: React.FC<GuestDetailModalProps> = ({
  guest,
  onClose,
  auditLogs,
  currentUser,
  onEdit,
  onCheckIn,
  onEstorno,
  onUndoRsvp,
}) => {
  if (!guest) return null;

  const canOperate = currentUser.role === 'admin' || currentUser.role === 'gestor' || currentUser.role === 'operador';
  const canManage = currentUser.role === 'admin' || currentUser.role === 'gestor';

  const guestLogs = auditLogs.filter(
    l => l.guestId === guest.id || (l.guestNumero !== undefined && l.guestNumero === guest.numero)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-[#0B2A4A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm bg-[#1C4E80] text-sky-200 px-2 py-0.5 rounded font-bold">
              #{guest.numero}
            </span>
            <h2 className="text-base font-bold text-white truncate max-w-xs">
              {guest.nome}
            </h2>
          </div>
          <button onClick={onClose} className="text-sky-200 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Card de Informações Primárias */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Categoria Obrigatória (CA-02)
              </span>
              <span className="text-sm font-bold text-[#182738] mt-0.5 block">
                {guest.categoria}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Papel de Participação
              </span>
              <span className="text-sm font-bold text-slate-800 mt-0.5 block capitalize">
                {guest.papel}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Confirmação RSVP
              </span>
              <div className="mt-0.5 font-semibold">
                {guest.rsvp === 'confirmado' ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Confirmado
                  </span>
                ) : guest.rsvp === 'recusado' ? (
                  <span className="text-rose-700 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" /> Não participará
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Pendente de resposta
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Credenciamento Físico
              </span>
              <div className="mt-0.5 font-semibold">
                {guest.presenca === 'presente' ? (
                  <span className="text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Presente
                  </span>
                ) : (
                  <span className="text-slate-400">Aguardando chegada</span>
                )}
              </div>
            </div>
          </div>

          {/* Dados de Vínculo e Promoção (PRD 2.4 e 2.5) */}
          {guest.relacionamento && (
            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-xs">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>Rastreabilidade de Vínculo:</span>
              </div>
              <p className="text-indigo-900">
                <strong>Titular Vinculado:</strong> {guest.relacionamento.titularNome || 'Não especificado'}
              </p>
              {guest.relacionamento.tipoOriginal === 'acompanhante' && (
                <p className="text-[11px] text-indigo-700">
                  <strong>Origem Histórica:</strong> Acompanhante original (promovido a representante pelas regras do PRD Seção 2.4).
                </p>
              )}
              {guest.relacionamento.motivo && (
                <p className="text-[11px] text-slate-600 italic">
                  Motivo/Detalhes: {guest.relacionamento.motivo}
                </p>
              )}
            </div>
          )}

          {/* Dados de Presença / Carimbo de Horário */}
          {guest.presenca === 'presente' && (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-950 space-y-1">
              <span className="font-bold block">Registro de Check-in:</span>
              <p className="text-[11px]">
                Horário: {guest.checkInAt ? new Date(guest.checkInAt).toLocaleString('pt-BR') : 'Registrado'}
              </p>
              <p className="text-[11px]">
                Operador Responsável: {guest.checkInBy || 'Recepção Oficial'}
              </p>
            </div>
          )}

          {/* Observações */}
          {guest.observacao && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Observação do Cerimonial
              </span>
              <p className="text-slate-700 mt-1">{guest.observacao}</p>
            </div>
          )}

          {/* Trilha de Auditoria Deste Convidado (CA-10) */}
          <div>
            <span className="font-bold text-slate-700 flex items-center gap-1.5 mb-2">
              <History className="w-4 h-4 text-[#1C4E80]" />
              Histórico de Auditoria do Convidado
            </span>
            {guestLogs.length === 0 ? (
              <p className="text-slate-400 text-[11px] italic">Nenhuma alteração registrada além do cadastro inicial.</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {guestLogs.map(log => (
                  <div key={log.id} className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px]">
                    <div className="flex items-center justify-between text-slate-500 text-[10px]">
                      <span>{log.userName} ({log.userRole})</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                    </div>
                    <p className="font-semibold text-slate-800 mt-0.5">{log.acao}</p>
                    <p className="text-slate-600 mt-0.5">{log.detalhes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer com Botões de Ação Imediata (Estorno, Desfazer RSVP, Check-in, Edição) */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {canOperate && (
              guest.presenca === 'presente' ? (
                <button
                  onClick={() => {
                    if (onEstorno) onEstorno(guest);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold rounded text-xs transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Estornar Presença</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (onCheckIn) onCheckIn(guest);
                  }}
                  className="px-3 py-1.5 bg-[#0B2A4A] hover:bg-[#1C4E80] text-white font-semibold rounded text-xs transition-colors flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Credenciar Agora</span>
                </button>
              )
            )}

            {canOperate && guest.rsvp === 'confirmado' && (
              <button
                onClick={() => {
                  if (onUndoRsvp) onUndoRsvp(guest);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-xs transition-colors flex items-center gap-1"
                title="Voltar confirmação para Pendente"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Desfazer RSVP</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(guest);
                }}
                className="px-3 py-1.5 bg-[#1C4E80] hover:bg-[#0B2A4A] text-white font-semibold rounded text-xs transition-colors"
              >
                Editar
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
