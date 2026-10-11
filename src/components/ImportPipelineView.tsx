import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ArrowRight,
  Info,
  RefreshCw,
  Sparkles,
  HelpCircle,
  FileCheck2,
  UserPlus
} from 'lucide-react';
import { EventItem, ImportPreviewItem, ImportSummary, User } from '../types';
import { store } from '../services/store';
import {
  downloadSampleTemplate,
  parseImportFile,
  parsePastedText,
  RawImportRow
} from '../services/importParser';

interface ImportPipelineViewProps {
  event: EventItem;
  currentUser: User;
  onSuccessImport: () => void;
}

export const ImportPipelineView: React.FC<ImportPipelineViewProps> = ({
  event,
  currentUser,
  onSuccessImport,
}) => {
  const isClosed = event.estado === 'encerrado';
  const canManage = (currentUser.role === 'admin' || currentUser.role === 'gestor') && !isClosed;

  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'manual'>('upload');

  // Input states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState(
    'Alm. Eduardo Fontes,Autoridade,,1;\n' +
    'Sra. Cláudia Fontes,Convidado geral,Alm. Eduardo Fontes,1;\n' +
    'Brig. Roberto Albuquerque,Autoridade,,0;\n' +
    'Maj. Teresa Lins,Comitê,Brig. Roberto Albuquerque,1;\n' +
    'Prof. Fernando Galvão,Convidado geral,,0'
  );

  // Manual guest registration
  const [manualNome, setManualNome] = useState('');
  const [manualTipo, setManualTipo] = useState(event.categorias[0]?.nome || 'Convidado geral');
  const [manualRelacao, setManualRelacao] = useState('');
  const [manualConfirmacao, setManualConfirmacao] = useState<'0' | '1' | 'recusado'>('0');
  const [manualObs, setManualObs] = useState('');

  // Processing & Preview states
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<ImportSummary | null>(null);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Processa arquivo ou texto para gerar Pré-visualização
  const handleGeneratePreview = async () => {
    setIsProcessing(true);
    setImportStatus(null);
    try {
      let rows: RawImportRow[] = [];

      if (activeTab === 'upload') {
        if (!selectedFile) {
          setImportStatus({ success: false, message: 'Por favor, selecione um arquivo primeiro (.xlsx, .csv, .txt, .md).' });
          setIsProcessing(false);
          return;
        }
        rows = await parseImportFile(selectedFile);
      } else if (activeTab === 'paste') {
        if (!pastedText.trim()) {
          setImportStatus({ success: false, message: 'Insira o texto com os registros a importar.' });
          setIsProcessing(false);
          return;
        }
        rows = parsePastedText(pastedText);
      }

      if (rows.length === 0) {
        setImportStatus({ success: false, message: 'Nenhum registro legível foi identificado no arquivo ou texto informado.' });
        setIsProcessing(false);
        return;
      }

      const summary = store.previewImport(event.id, rows);
      setPreviewSummary(summary);
    } catch (err: unknown) {
      setImportStatus({ success: false, message: err instanceof Error ? err.message : 'Falha ao processar arquivo.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Cadastro Manual Único
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNome.trim()) {
      setImportStatus({ success: false, message: 'O nome do convidado é obrigatório.' });
      return;
    }
    const singleRow: RawImportRow = {
      nome: manualNome,
      tipo: manualTipo,
      relacao: manualRelacao,
      confirmacao: manualConfirmacao,
    };
    const summary = store.previewImport(event.id, [singleRow]);
    setPreviewSummary(summary);
  };

  // Confirmar Importação e Gravar no Banco / Store
  const handleCommitImport = () => {
    if (!previewSummary || previewSummary.totalValidos === 0) {
      setImportStatus({ success: false, message: 'Não há registros válidos para importar.' });
      return;
    }
    try {
      const res = store.commitImport(event.id, previewSummary.itens);
      setImportStatus({
        success: true,
        message: `${res.importedCount} convidados foram importados e integrados com sucesso ao evento.`,
      });
      setPreviewSummary(null);
      setSelectedFile(null);
      setManualNome('');
      onSuccessImport();
    } catch (err: unknown) {
      setImportStatus({
        success: false,
        message: err instanceof Error ? err.message : 'Erro ao persistir importação',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Regras do Pipeline */}
      <div className="bg-white p-5 sm:p-6 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1C4E80]">
              <span>Pipeline de Importação Inteligente</span>
              <span>·</span>
              <span>10 Passos de Validação (PRD Seção 6)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B2A4A] tracking-tight mt-1">
              Importação e Cadastro de Convidados
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Importe listas estruturadas com resolução automática de vínculos, promoções de acompanhantes e prevenção de ambiguidades.
            </p>
          </div>

          {/* Modelos para Download */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadSampleTemplate('xlsx')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium border border-slate-300 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Modelo Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => downloadSampleTemplate('csv')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium border border-slate-300 transition-colors"
            >
              <Download className="w-4 h-4 text-sky-600" />
              <span>Modelo CSV (.csv)</span>
            </button>
          </div>
        </div>

        {/* Banner Didático de Regras Críticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="bg-sky-50/60 p-3 rounded border border-sky-100">
            <strong className="text-sky-900 block font-semibold">CA-03 · Regra do Zero (0 = Pendente):</strong>
            <span className="text-sky-800">
              O valor 0 na importação significa "Pendente" de resposta. Jamais é interpretado automaticamente como recusa.
            </span>
          </div>

          <div className="bg-indigo-50/60 p-3 rounded border border-indigo-100">
            <strong className="text-indigo-900 block font-semibold">CA-05 · Promoção Automática:</strong>
            <span className="text-indigo-800">
              Acompanhante confirmado cujo titular está pendente (0) é promovido a Representante, guardando a origem.
            </span>
          </div>

          <div className="bg-amber-50/60 p-3 rounded border border-amber-100">
            <strong className="text-amber-900 block font-semibold">CA-08 · Pré-Visualização Segura:</strong>
            <span className="text-amber-800">
              Erros de categoria e nomes ambíguos são exibidos para revisão antes de qualquer gravação definitiva.
            </span>
          </div>
        </div>
      </div>

      {/* Sucesso / Erro Feedback */}
      {importStatus && (
        <div className={`p-4 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-3 ${
          importStatus.success ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' : 'bg-rose-50 text-rose-900 border border-rose-300'
        }`}>
          {importStatus.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span>{importStatus.message}</span>
        </div>
      )}

      {/* Seletor de Modalidade: Upload, Texto ou Manual */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium">
          <button
            onClick={() => { setActiveTab('upload'); setPreviewSummary(null); }}
            className={`flex-1 py-3 px-4 text-center border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'upload'
                ? 'border-[#1C4E80] text-[#0B2A4A] bg-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>A. Upload de Arquivo (.xlsx, .csv, .txt, .md)</span>
          </button>

          <button
            onClick={() => { setActiveTab('paste'); setPreviewSummary(null); }}
            className={`flex-1 py-3 px-4 text-center border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'paste'
                ? 'border-[#1C4E80] text-[#0B2A4A] bg-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>B. Inserção por Texto Manual</span>
          </button>

          <button
            onClick={() => { setActiveTab('manual'); setPreviewSummary(null); }}
            className={`flex-1 py-3 px-4 text-center border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'manual'
                ? 'border-[#1C4E80] text-[#0B2A4A] bg-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>C. Cadastro Manual Assistido</span>
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {/* Aba A: Upload de Arquivo */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 sm:p-8 text-center hover:border-[#1C4E80] transition-colors bg-slate-50/50">
                <FileSpreadsheet className="w-10 h-10 text-[#1C4E80] mx-auto mb-2" />
                <h3 className="font-semibold text-sm text-[#182738]">
                  Arraste ou selecione o arquivo da lista
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Formatos suportados: Excel (.xlsx, .xls), CSV (.csv), Texto (.txt) ou Tabelas Markdown (.md)
                </p>

                <div className="mt-4">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#1C4E80] hover:bg-[#0B2A4A] text-white text-xs sm:text-sm font-medium rounded cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Escolher Arquivo</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt,.md"
                      onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>

                {selectedFile && (
                  <div className="mt-3 text-xs font-semibold text-emerald-800 bg-emerald-50 py-1.5 px-3 rounded inline-block">
                    Arquivo selecionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGeneratePreview}
                  disabled={!selectedFile || isProcessing || !canManage}
                  className="px-5 py-2.5 bg-[#0B2A4A] hover:bg-[#1C4E80] text-white text-xs sm:text-sm font-semibold rounded transition-colors disabled:bg-slate-300 flex items-center gap-2"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-sky-300" />}
                  <span>Executar Pipeline de Validação (Passos 1 a 6)</span>
                </button>
              </div>
            </div>
          )}

          {/* Aba B: Inserção por Texto */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cole os dados no formato: <code>nome,tipo,relacao,confirmacao</code> (separados por vírgula e ';' ou quebra de linha)
                </label>
                <textarea
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  rows={6}
                  className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-[#1C4E80] focus:ring-1 focus:ring-[#1C4E80] outline-none"
                  placeholder="Nome,Categoria,Relacionado,Confirmacao(0 ou 1)"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Exemplo: <code>Ana Silva,Autoridade,,0;Bruno Costa,Convidado geral,Ana Silva,1</code> (Bruno será promovido a Representante de Ana, preservando o vínculo!)
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGeneratePreview}
                  disabled={!pastedText.trim() || isProcessing || !canManage}
                  className="px-5 py-2.5 bg-[#0B2A4A] hover:bg-[#1C4E80] text-white text-xs sm:text-sm font-semibold rounded transition-colors disabled:bg-slate-300 flex items-center gap-2"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-sky-300" />}
                  <span>Executar Pipeline de Validação</span>
                </button>
              </div>
            </div>
          )}

          {/* Aba C: Cadastro Manual Assistido */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualNome}
                    onChange={e => setManualNome(e.target.value)}
                    placeholder="Ex: Brig. Carlos Eduardo"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={manualTipo}
                    onChange={e => setManualTipo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none bg-white"
                  >
                    {event.categorias.map(cat => (
                      <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Convidado Relacionado / Titular (Opcional)
                  </label>
                  <input
                    type="text"
                    value={manualRelacao}
                    onChange={e => setManualRelacao(e.target.value)}
                    placeholder="Nome exato do titular (se acompanhante/representante)"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmação Inicial RSVP
                  </label>
                  <select
                    value={manualConfirmacao}
                    onChange={e => setManualConfirmacao(e.target.value as '0' | '1' | 'recusado')}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] outline-none bg-white"
                  >
                    <option value="0">0 - Pendente (Aguardando resposta)</option>
                    <option value="1">1 - Confirmado</option>
                    <option value="recusado">Não participará (Recusou)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!canManage}
                  className="px-5 py-2.5 bg-[#0B2A4A] hover:bg-[#1C4E80] text-white text-xs sm:text-sm font-semibold rounded transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-sky-300" />
                  <span>Validar e Pré-Visualizar</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Passo 7: Pré-Visualização e Relatório de Validação (PRD 6. Pipeline) */}
      {previewSummary && (
        <div className="bg-white rounded-lg border-2 border-[#1C4E80] shadow-md p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#1C4E80] uppercase tracking-wider">
                <FileCheck2 className="w-4 h-4" />
                Passo 7: Pré-Visualização de Importação
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[#0B2A4A] mt-0.5">
                Relatório de Análise Prévia dos Registros
              </h2>
            </div>

            {/* Sumário de Indicadores de Importação */}
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded font-semibold">
                {previewSummary.totalValidos} válidos
              </span>
              {previewSummary.totalComErros > 0 && (
                <span className="bg-rose-100 text-rose-800 px-2.5 py-1 rounded font-semibold">
                  {previewSummary.totalComErros} com erros
                </span>
              )}
              {previewSummary.totalPromocoes > 0 && (
                <span className="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded font-semibold">
                  {previewSummary.totalPromocoes} promoções (CA-05)
                </span>
              )}
            </div>
          </div>

          {/* Tabela de Pré-Visualização com Erros e Avisos Destacados */}
          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-2.5 px-3 w-12">#</th>
                  <th className="py-2.5 px-3">Nome Lido</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Relação Informada</th>
                  <th className="py-2.5 px-3">RSVP Interpretado</th>
                  <th className="py-2.5 px-3">Papel Resultante</th>
                  <th className="py-2.5 px-3">Status de Validação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewSummary.itens.map(item => {
                  const hasError = item.erros.length > 0;
                  const hasWarning = item.avisos.length > 0;

                  return (
                    <tr
                      key={item.index}
                      className={`hover:bg-slate-50 transition-colors ${
                        hasError ? 'bg-rose-50/40' : item.seraPromovido ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {item.index}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {item.nome || <span className="text-rose-500 italic">[Ausente]</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.tipo}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.relacaoRaw ? (
                          <span>{item.relacaoRaw}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.parsedRsvp === 'confirmado' ? (
                          <span className="text-emerald-700 font-medium">1 (Confirmado)</span>
                        ) : item.parsedRsvp === 'recusado' ? (
                          <span className="text-rose-700 font-medium">Recusado</span>
                        ) : (
                          <span className="text-slate-500 font-medium">0 (Pendente - CA-03)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.parsedPapel === 'representante' ? (
                          <span className="text-indigo-800 font-semibold">
                            Representante {item.seraPromovido && '(Promoção CA-05)'}
                          </span>
                        ) : item.parsedPapel === 'acompanhante' ? (
                          <span className="text-sky-800 font-medium">Acompanhante</span>
                        ) : (
                          <span className="text-slate-600">Titular</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {hasError ? (
                          <div className="text-rose-700 font-medium flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{item.erros.join('; ')}</span>
                          </div>
                        ) : hasWarning ? (
                          <div className="text-amber-800 text-[11px] flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{item.avisos.join('; ')}</span>
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            Válido
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Botões de Ação Final (Passo 8: Solicitar Confirmação) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <div className="text-xs text-slate-500">
              Registros com erro serão ignorados. Registros válidos receberão numeração sequencial estável e registro de auditoria.
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewSummary(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded transition-colors"
              >
                Cancelar Análise
              </button>

              <button
                onClick={handleCommitImport}
                disabled={previewSummary.totalValidos === 0 || !canManage}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded shadow-xs transition-colors disabled:bg-slate-300 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Confirmar e Importar {previewSummary.totalValidos} Registros Válidos</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
