# Matriz de Funcionalidades & Critérios de Aceite (CA-01 a CA-14)

Este documento especifica a totalidade das regras de negócio protocolares do sistema **Cerimonial & RSVP**, vinculando cada requisito à sua implementação técnica e verificação.

---

## 📋 Matriz Consolidada de Critérios de Aceite

| Código | Título da Regra | Descrição Formal | Arquivo / Implementação |
|---|---|---|---|
| **CA-01** | Isolamento entre eventos por permissão | Usuário sem credencial de acesso ao Evento B é estritamente impedido de consultar, alterar, importar ou exportar seus dados. | [server/routes/events.ts](server/routes/events.ts), [Navbar.tsx](src/components/Navbar.tsx) |
| **CA-02** | Classificação obrigatória por categoria | Todo convidado ativo obrigatoriamente pertence a uma categoria válida previamente cadastrada no evento. Inserções com categoria nula são rejeitadas. | [server/routes/guests.ts](server/routes/guests.ts), [GuestFormModal.tsx](src/components/GuestFormModal.tsx) |
| **CA-03** | Regra do Zero no RSVP (0 = Pendente) | Na importação de listas, o valor `0` ou em branco na coluna de confirmação é interpretado como *Pendente*, jamais como recusa/declínio. | [server/routes/guests.ts](server/routes/guests.ts), [importParser.ts](src/services/importParser.ts) |
| **CA-04** | Acompanhante confirmado | Titular confirmado com acompanhante confirmado totaliza exatamente 2 participantes previstos no evento (1 titular e 1 acompanhante). | [server/routes/metrics.ts](server/routes/metrics.ts), [DashboardView.tsx](src/components/DashboardView.tsx) |
| **CA-05** | Promoção automática a representante | Caso o titular não confirme presença (permaneça pendente ou recuse), o acompanhante que confirmar é promovido automaticamente a *Representante*, mantendo o vínculo de origem. | [server/routes/guests.ts](server/routes/guests.ts), [store.ts](src/services/store.ts) |
| **CA-06** | Conflito de representação e resolução explícita | Se um titular e seu representante forem confirmados simultaneamente, o sistema gera alerta de conflito ativo e exige decisão humana formal. | [server/routes/guests.ts](server/routes/guests.ts), [ConflictResolutionModal.tsx](src/components/ConflictResolutionModal.tsx) |
| **CA-07** | Indicadores sem dupla contagem | Nenhuma pessoa física é somada mais de uma vez nos cálculos analíticos: `Previstos = Titulares + Acompanhantes + Representantes`. | [server/routes/metrics.ts](server/routes/metrics.ts), [DashboardView.tsx](src/components/DashboardView.tsx) |
| **CA-08** | Pré-visualização segura de importação | Registros ambíguos, com erros ou duplicidades são exibidos em grid antes de qualquer persistência física no banco. | [ImportPipelineView.tsx](src/components/ImportPipelineView.tsx) |
| **CA-09** | Credenciamento idempotente | Leituras sucessivas de QR Code ou cliques repetidos no mesmo convidado não duplicam presenças e preservam o operador original. | [server/routes/guests.ts](server/routes/guests.ts), [CheckInStationView.tsx](src/components/CheckInStationView.tsx) |
| **CA-10** | Trilha de auditoria com autor e carimbo | Toda operação crítica grava autor, perfil RBAC, instante UTC, ação, detalhes operacionais e fingerprint do dispositivo. | [server/routes/audit.ts](server/routes/audit.ts), [AuditLogView.tsx](src/components/AuditLogView.tsx) |
| **CA-11** | Exportações higienizadas contra injeção | Arquivos gerados para Excel sanitizam caracteres de fórmula (`=`, `+`, `-`, `@`, `\t`, `\r`) prefixando apóstrofo (CWE-1236). | [exportService.ts](src/services/exportService.ts) |
| **CA-12** | Responsividade para portaria física | A interface da portaria garante alvos de toque superiores a 44x44px, adaptando-se a celulares, tablets e coletores de dados. | [CheckInStationView.tsx](src/components/CheckInStationView.tsx) |
| **CA-13** | Numeração estável não reutilizável | Exclusões de convidados utilizam soft delete (`deleted_at`), impedindo que o número da credencial física já impressa seja reciclado. | [server/routes/guests.ts](server/routes/guests.ts), [schema.sql](server/db/schema.sql) |
| **CA-14** | Bloqueio de eventos encerrados | Eventos com status `encerrado` bloqueiam alterações de RSVP, novos cadastros e check-ins; reabertura é exclusiva de administradores. | [server/routes/events.ts](server/routes/events.ts), [EventSettingsView.tsx](src/components/EventSettingsView.tsx) |

---

## 🔍 Detalhamento das Regras Complexas de Protocolo

### 1. Dinâmica de Promoção e Representação (CA-05 e CA-06)
No protocolo institucional:
* Um titular convida um acompanhante.
* Se o titular informa que não comparecerá ou sua agenda fica pendente, mas o acompanhante confirma, este acompanhante não pode comparecer como mero "acompanhante" de uma cadeira vazia. O sistema eleva o convidado ao papel de **Representante Oficial**.
* Caso o titular posteriormente resolva comparecer e confirme seu RSVP, configura-se o **Conflito de Representação (CA-06)**. O cerimonial deve decidir explicitamente no modal:
  1. *Manter o Titular* (e declinar o representante).
  2. *Manter o Representante* (e declinar o titular).
  3. *Manter Ambos* (rebaixando o representante novamente ao papel de acompanhante).

### 2. Estabilidade de Numeração Sequencial (CA-13)
Em grandes eventos, os crachás e credenciais são impressos em lotes prévios. Se o convidado `#05` cancela sua presença e é excluído, o próximo convidado cadastrado **NUNCA** pode assumir o número `#05`, pois haveria risco de duas pessoas portando credenciais físicas com a mesma numeração. O sistema calcula:
$$\text{ProximoNumero} = \max(\text{numero}) + 1 \quad \forall \text{ convidados (incluindo excluídos)}$$
