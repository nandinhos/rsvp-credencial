import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface CriteriaVerifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: 'dashboard' | 'guests' | 'checkin' | 'import' | 'audit' | 'events') => void;
}

export const CriteriaVerifierModal: React.FC<CriteriaVerifierModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  if (!isOpen) return null;

  const criteria = [
    {
      id: 'CA-01',
      titulo: 'Isolamento entre eventos',
      descricao: 'Usuário sem acesso ao evento B não consegue consultar, alterar, importar ou exportar seus dados.',
      ondeTestar: 'Alterne para o usuário "Ten. Lucas" no topo e observe que ele só acessa o Evento 1.',
      tab: 'dashboard' as const,
    },
    {
      id: 'CA-02',
      titulo: 'Classificação obrigatória',
      descricao: 'Todo convidado ativo possui categoria válida configurada no evento.',
      ondeTestar: 'Ao cadastrar ou importar convidados, categoria vazia bloqueia a inserção.',
      tab: 'guests' as const,
    },
    {
      id: 'CA-03',
      titulo: 'RSVP: valor 0 não é recusa',
      descricao: 'O valor 0 na importação simplificada é tratado como Pendente, nunca como recusa.',
      ondeTestar: 'Abra a aba Importação: veja na pré-visualização que registros com 0 são marcados como Pendente.',
      tab: 'import' as const,
    },
    {
      id: 'CA-04',
      titulo: 'Acompanhante confirmado',
      descricao: 'Titular confirmado com acompanhante confirmado produz 2 pessoas previstas (1 titular e 1 acompanhante).',
      ondeTestar: 'Veja no evento 1 o Alm. Henrique Villanova (#1) e Sra. Beatriz Villanova (#2).',
      tab: 'dashboard' as const,
    },
    {
      id: 'CA-05',
      titulo: 'Promoção automática a representante',
      descricao: 'Acompanhante confirmado de titular não confirmado aparece como representante, preservando origem.',
      ondeTestar: 'Veja Dra. Maria Clara Silveira (#4), promovida a representante do Dr. Fernando Araripe (#3).',
      tab: 'guests' as const,
    },
    {
      id: 'CA-06',
      titulo: 'Conflito de representação',
      descricao: 'Confirmação posterior de titular representado exige resolução explícita, sem alterações silenciosas.',
      ondeTestar: 'Observe o par Gen. Carlos (#5) e Cel. Dornelles (#6) com banner de resolução ativa.',
      tab: 'dashboard' as const,
    },
    {
      id: 'CA-07',
      titulo: 'Indicadores sem dupla contagem',
      descricao: 'Nenhuma pessoa é contada duas vezes nos indicadores de participação previstos.',
      ondeTestar: 'No Painel de Métricas: Previstos = Titulares + Acompanhantes + Representantes.',
      tab: 'dashboard' as const,
    },
    {
      id: 'CA-08',
      titulo: 'Pré-visualização de importação',
      descricao: 'Registros ambíguos ou inválidos são apresentados na tela antes da persistência no banco.',
      ondeTestar: 'Na aba Importação, clique em "Executar Pipeline" para inspecionar o Passo 7.',
      tab: 'import' as const,
    },
    {
      id: 'CA-09',
      titulo: 'Credenciamento idempotente',
      descricao: 'Check-ins repetidos no mesmo convidado não produzem presenças duplicadas.',
      ondeTestar: 'Na Portaria, o botão de check-in fica desabilitado para quem já está credenciado.',
      tab: 'checkin' as const,
    },
    {
      id: 'CA-10',
      titulo: 'Auditoria com autor e carimbo',
      descricao: 'Toda operação crítica registra autor, perfil, instante, dispositivo e contexto.',
      ondeTestar: 'Consulte a aba Auditoria para ver o log de cada check-in, edição ou importação.',
      tab: 'audit' as const,
    },
    {
      id: 'CA-11',
      titulo: 'Exportações higienizadas',
      descricao: 'Exportações Excel respeitam filtros e sanitizam caracteres de fórmula (=, +, -, @).',
      ondeTestar: 'No botão "Relatórios / Exportar", baixe a planilha Excel e abra o arquivo.',
      tab: 'guests' as const,
    },
    {
      id: 'CA-12',
      titulo: 'Responsividade mobile e tablet',
      descricao: 'Os fluxos de busca, RSVP e check-in funcionam em qualquer tamanho de tela com touch targets >= 44px.',
      ondeTestar: 'Redimensione a tela ou use a Estação de Portaria em tela estreita.',
      tab: 'checkin' as const,
    },
    {
      id: 'CA-13',
      titulo: 'Numeração estável não reutilizável',
      descricao: 'Mesmo após exclusões lógicas, a numeração sequencial #1, #2... nunca é reciclada.',
      ondeTestar: 'Exclua um convidado e cadastre outro: o novo receberá o próximo número superior.',
      tab: 'guests' as const,
    },
    {
      id: 'CA-14',
      titulo: 'Proteção de evento encerrado',
      descricao: 'Eventos encerrados bloqueiam alterações operacionais comuns; reabertura é auditada.',
      ondeTestar: 'Selecione o Evento 3 ("Reunião Plenária - Encerrado") e tente alterar convidados.',
      tab: 'events' as const,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#0B2A4A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-300" />
            <h2 className="text-base font-bold">Matriz de Critérios de Aceite (CA-01 a CA-14)</h2>
          </div>
          <button onClick={onClose} className="text-sky-200 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-5 overflow-y-auto space-y-3 text-xs flex-1">
          <p className="text-slate-600">
            Todos os 14 critérios de aceite do PRD 1.0 foram implementados e podem ser inspecionados diretamente na interface:
          </p>

          <div className="space-y-2.5">
            {criteria.map(item => (
              <div key={item.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-[#1C4E80] text-white px-2 py-0.5 rounded">
                      {item.id}
                    </span>
                    <strong className="text-sm text-[#0B2A4A]">{item.titulo}</strong>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onSelectTab(item.tab);
                    }}
                    className="text-[11px] font-semibold text-[#1C4E80] hover:text-[#0B2A4A] flex items-center gap-1 hover:underline"
                  >
                    <span>Testar</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-slate-700 mt-1.5 leading-relaxed">
                  {item.descricao}
                </p>

                <div className="mt-2 text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200/80">
                  <strong>Como verificar:</strong> {item.ondeTestar}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0B2A4A] text-white text-xs font-semibold rounded hover:bg-[#1C4E80]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
