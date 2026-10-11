import React, { useState } from 'react';
import {
  Calendar,
  Shield,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  History,
  Settings,
  ChevronDown,
  Lock,
  UserCheck,
  RefreshCw,
  LogOut,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { EventItem, User } from '../types';
import { store } from '../services/store';

interface NavbarProps {
  currentTab: 'dashboard' | 'guests' | 'checkin' | 'import' | 'audit' | 'events';
  onSelectTab: (tab: 'dashboard' | 'guests' | 'checkin' | 'import' | 'audit' | 'events') => void;
  activeEvent?: EventItem;
  authorizedEvents: EventItem[];
  currentUser: User;
  allUsers: User[];
  onOpenNewEvent: () => void;
  onRestoreDemo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeEvent,
  authorizedEvents,
  currentUser,
  allUsers,
  onOpenNewEvent,
  onRestoreDemo,
}) => {
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador Geral';
      case 'gestor':
        return 'Gestor do Evento';
      case 'operador':
        return 'Operador / Recepção';
      case 'leitor':
        return 'Leitor (Somente Consulta)';
      default:
        return role;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-[#1C4E80] font-semibold';
      case 'gestor':
        return 'text-[#047857] font-semibold';
      case 'operador':
        return 'text-[#B45309] font-semibold';
      case 'leitor':
        return 'text-[#475569] font-semibold';
      default:
        return 'text-[#182738]';
    }
  };

  return (
    <header className="bg-[#0B2A4A] text-white sticky top-0 z-40 border-b border-[#1C4E80]/40 shadow-sm">
      {/* Top Bar: Institucional & Controles de Sessão */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Marca Institucional (clicável para dashboard) */}
          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-3 text-left hover:opacity-95 transition-opacity cursor-pointer group"
          >
            <div className="w-9 h-9 rounded bg-[#1C4E80] flex items-center justify-center text-white font-bold border border-white/20 group-hover:bg-[#276CA3] transition-colors">
              <Building2 className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base sm:text-lg tracking-tight text-white group-hover:text-sky-200 transition-colors">
                  Cerimonial & RSVP
                </span>
                <span className="text-xs bg-[#1C4E80]/80 text-sky-200 px-2 py-0.5 rounded font-mono border border-sky-400/20">
                  MVP 1.0
                </span>
              </div>
              <p className="text-[11px] text-sky-200/80 font-normal hidden sm:block">
                Gestão de Convidados, Confirmações e Credenciamento
              </p>
            </div>
          </button>

          {/* Seleção Rápida de Evento & Usuário (Simulador de Permissões) */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Seletor de Evento */}
            <div className="relative">
              <button
                onClick={() => setShowEventDropdown(!showEventDropdown)}
                className="flex items-center gap-2 bg-[#1C4E80]/70 hover:bg-[#1C4E80] text-white px-3 py-1.5 rounded text-xs sm:text-sm border border-white/10 transition-colors max-w-[200px] sm:max-w-xs text-left"
                title="Trocar evento ativo"
              >
                <Calendar className="w-4 h-4 text-sky-300 shrink-0" />
                <div className="truncate">
                  <div className="font-medium truncate">{activeEvent?.nome || 'Selecionar Evento'}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-sky-200 shrink-0" />
              </button>

              {showEventDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white text-[#182738] rounded-md shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100 font-medium text-slate-500 uppercase tracking-wider text-[10px]">
                    Eventos Autorizados ({authorizedEvents.length})
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {authorizedEvents.map(evt => (
                      <button
                        key={evt.id}
                        onClick={() => {
                          store.setActiveEvent(evt.id);
                          setShowEventDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2.5 transition-colors ${
                          evt.id === activeEvent?.id ? 'bg-sky-50/70 border-l-3 border-[#1C4E80]' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#182738] truncate">{evt.nome}</p>
                          <p className="text-[11px] text-slate-500 truncate">{evt.dataHorario}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            <span className={evt.estado === 'ativo' ? 'text-emerald-700 font-medium' : evt.estado === 'encerrado' ? 'text-slate-500 font-medium' : 'text-amber-700 font-medium'}>
                              ● {evt.estado.toUpperCase()}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500">{evt.publicoEstimado} previstos</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {(currentUser.role === 'admin' || currentUser.role === 'gestor') && (
                    <div className="p-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setShowEventDropdown(false);
                          onOpenNewEvent();
                        }}
                        className="w-full text-center py-1.5 bg-[#1C4E80] hover:bg-[#276CA3] text-white rounded text-xs font-medium transition-colors"
                      >
                        + Cadastrar Novo Evento
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Simulador de Usuário / Permissões (RBAC) */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-2.5 py-1.5 rounded text-xs sm:text-sm border border-white/15 transition-colors"
                title="Alternar perfil de usuário (para testar permissões)"
              >
                <div className="w-5 h-5 rounded-full bg-sky-200 text-[#0B2A4A] flex items-center justify-center font-bold text-[10px]">
                  {currentUser.nome.charAt(0)}
                </div>
                <div className="text-left hidden md:block">
                  <div className="font-medium text-xs leading-none">{currentUser.nome}</div>
                  <div className="text-[10px] text-sky-200/90 leading-tight mt-0.5">{getRoleLabel(currentUser.role)}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-sky-200 shrink-0" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white text-[#182738] rounded-md shadow-xl border border-slate-200 py-2 z-50 text-xs">
                  <div className="px-3 pb-2 border-b border-slate-100">
                    <p className="font-semibold text-slate-800">{currentUser.nome}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                    <p className={`text-[11px] mt-1 ${getRoleBadgeStyle(currentUser.role)}`}>
                      {getRoleLabel(currentUser.role)}
                    </p>
                  </div>

                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                    Simular Perfil / Permissão
                  </div>

                  {allUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        store.setActiveUser(u.id);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors ${
                        u.id === currentUser.id ? 'bg-slate-100 font-medium' : ''
                      }`}
                    >
                      <div>
                        <div className="text-slate-800 font-medium">{u.nome}</div>
                        <div className="text-[10px] text-slate-500">{getRoleLabel(u.role)}</div>
                      </div>
                      {u.id === currentUser.id && (
                        <span className="text-sky-600 text-xs font-semibold">Ativo</span>
                      )}
                    </button>
                  ))}

                  <div className="pt-2 mt-1 border-t border-slate-100 px-3">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        if (onRestoreDemo) {
                          onRestoreDemo();
                        } else {
                          store.resetToInitial();
                        }
                      }}
                      className="w-full text-left text-slate-600 hover:text-slate-900 py-1 text-[11px] flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                      Restaurar dados de demonstração
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1 scrollbar-none text-xs sm:text-sm font-medium border-t border-white/10">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-3 py-2 rounded-t flex items-center gap-2 transition-colors whitespace-nowrap ${
              currentTab === 'dashboard'
                ? 'bg-white text-[#0B2A4A] font-semibold shadow-sm'
                : 'text-sky-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Painel & Métricas</span>
          </button>

          <button
            onClick={() => onSelectTab('guests')}
            className={`px-3 py-2 rounded-t flex items-center gap-2 transition-colors whitespace-nowrap ${
              currentTab === 'guests'
                ? 'bg-white text-[#0B2A4A] font-semibold shadow-sm'
                : 'text-sky-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Lista de Convidados</span>
          </button>

          <button
            onClick={() => onSelectTab('checkin')}
            className={`px-3 py-2 rounded-t flex items-center gap-2 transition-colors whitespace-nowrap ${
              currentTab === 'checkin'
                ? 'bg-white text-[#0B2A4A] font-semibold shadow-sm'
                : 'text-sky-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Credenciamento (Portaria)</span>
          </button>

          <button
            onClick={() => onSelectTab('import')}
            className={`px-3 py-2 rounded-t flex items-center gap-2 transition-colors whitespace-nowrap ${
              currentTab === 'import'
                ? 'bg-white text-[#0B2A4A] font-semibold shadow-sm'
                : 'text-sky-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importação</span>
          </button>

          <button
            onClick={() => onSelectTab('audit')}
            className={`px-3 py-2 rounded-t flex items-center gap-2 transition-colors whitespace-nowrap ${
              currentTab === 'audit'
                ? 'bg-white text-[#0B2A4A] font-semibold shadow-sm'
                : 'text-sky-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Auditoria</span>
          </button>

          <button
            onClick={() => onSelectTab('events')}
            className={`px-3 py-2 rounded-t flex items-center gap-2 transition-colors whitespace-nowrap ${
              currentTab === 'events'
                ? 'bg-white text-[#0B2A4A] font-semibold shadow-sm'
                : 'text-sky-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações do Evento</span>
          </button>
        </nav>
      </div>

      {/* Alerta de Evento Encerrado (se aplicável - CA-14) */}
      {activeEvent?.estado === 'encerrado' && (
        <div className="bg-amber-500 text-slate-900 px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            <strong>Atenção:</strong> Este evento foi <strong>ENCERRADO</strong>. As alterações operacionais (inclusões, confirmações e credenciamentos) estão bloqueadas (CA-14).
          </span>
        </div>
      )}
    </header>
  );
};
