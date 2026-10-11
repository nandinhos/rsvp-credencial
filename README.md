# Cerimonial & RSVP — Gestão de Convidados, Presença e Auditoria

[![Stack](https://img.shields.io/badge/Stack-React%2019%20%7C%20TypeScript%20%7C%20Express%20%7C%20PostgreSQL-blue.svg)](https://github.com/nandinhos/rsvp-credencial)
[![Docker](https://img.shields.io/badge/Docker-Multi--Container%20Compose-2496ED.svg)](docker-compose.yml)
[![License](https://img.shields.io/badge/License-Proprietary%20%2F%20Institucional-navy.svg)](#)

Sistema corporativo e institucional para gestão integral de solenidades, controle de confirmações (RSVP), hierarquia protocolar de convidados (titular, acompanhante, representante), terminal de credenciamento (portaria) de alta velocidade, auditoria imutável e relatórios analíticos sem dupla contagem.

---

## 📌 Sumário Executivo

O **Cerimonial & RSVP** foi concebido para atender às exigências de cerimonial militar, governamental e grandes corporações, onde gafes protocolares (ex.: duplicidade de credencial, falta de registro de representação oficial ou reciclagem indevida de números de crachá) são inadmissíveis.

O sistema é estritamente aderente a **14 Critérios de Aceite formais (CA-01 a CA-14)**, garantindo integridade transacional de dados através de um banco de dados relacional **PostgreSQL 16** e comunicação fluida entre frontend reativo e backend REST.

---

## 🏛️ Funcionalidades Centrais

### 1. Painel de Controle & Indicadores em Tempo Real ([DashboardView](src/components/DashboardView.tsx))
* **Métricas Sem Dupla Contagem (CA-07):** Apuração exata de `Participantes Previstos = Titulares Confirmados + Acompanhantes Confirmados + Representantes Confirmados`.
* **Capacidade vs. Ocupação:** Acompanhamento dinâmico do saldo de vagas, taxa de confirmação e taxa de comparecimento presencial.
* **Detecção Visual de Conflitos (CA-06):** Alerta proativo no topo da página quando houver representantes e titulares confirmados concorrentemente.

### 2. Gestão de Convidados & Hierarquia Protocolar ([GuestListView](src/components/GuestListView.tsx))
* **Classificação Obrigatória (CA-02):** Todo convidado possui categoria formal (ex.: *Autoridade*, *Diretoria*, *Comitê*, *Convidado Geral*).
* **Promoção Automática de Acompanhante a Representante (CA-05):** Caso um titular decline ou permaneça pendente, o acompanhante que confirmar presença é promovido automaticamente a *Representante*, preservando o vínculo de origem.
* **Resolução Explícita de Conflitos (CA-06):** Bloqueio de decisões tácitas quando titular e representante confirmam presença simultaneamente.
* **Numeração Estável e Não Reciclável (CA-13):** Exclusões são lógicas (`deleted_at`), assegurando que o número do crachá emitido nunca seja reaproveitado.

### 3. Estação de Credenciamento / Portaria ([CheckInStationView](src/components/CheckInStationView.tsx))
* **Operação de Alta Velocidade:** Interface com foco em digitação rápida, leitor de código de barras / QR Code e busca instantânea por nome, categoria ou número.
* **Credenciamento Idempotente (CA-09):** Check-ins repetidos no mesmo registro não geram contagens duplicadas e registram o operador responsável.
* **Ação com Desfazer (Undo Toast):** Possibilidade de estorno imediato em até 7 segundos com restauração de status.
* **Responsividade e Touch Targets (CA-12):** Área de clique otimizada para tablets e coletores de dados em portarias físicas.

### 4. Pipeline de Importação em 7 Etapas ([ImportPipelineView](src/components/ImportPipelineView.tsx))
* **Multi-Formato:** Suporte a arquivos Excel (.xlsx), CSV, Markdown tables e texto copiado/colado.
* **Regra do Zero no RSVP (CA-03):** O valor `0` na planilha é interpretado estritamente como *Pendente*, prevenindo falsas recusas.
* **Pré-Visualização Segura (CA-08):** Auditoria de linhas válidas, duplicidades e conflitos em tela antes de persistir no banco.

### 5. Trilha de Auditoria Imutável ([AuditLogView](src/components/AuditLogView.tsx))
* **Registro Rigoroso (CA-10):** Toda ação crítica grava timestamp UTC, ID/nome do operador, cargo, ação executada, detalhes e fingerprint do dispositivo.
* **Filtros Avançados:** Consulta por tipo de ação, evento e intervalo temporal.

### 6. Configurações de Evento & Ciclo de Vida ([EventSettingsView](src/components/EventSettingsView.tsx))
* **Isolamento entre Eventos por RBAC (CA-01):** Operadores só acessam eventos aos quais possuem credenciamento concedido.
* **Proteção de Evento Encerrado (CA-14):** Eventos encerrados bloqueiam inclusões, alterações de RSVP e credenciamentos. A reabertura é restrita ao perfil `admin` e auditada compulsoriamente.

### 7. Exportação Sanitizada ([exportService.ts](src/services/exportService.ts))
* **Proteção contra Injeção de Fórmulas (CA-11 / CWE-1236):** Sanitização prévia de caracteres `=`, `+`, `-`, `@` nas planilhas geradas para Excel.

---

## 🛠️ Arquitetura Tecnológica

```
rsvp-credencial/
├── docker-compose.yml       # Orquestração multi-container (App + DB)
├── Dockerfile               # Imagem otimizada baseada em oven/bun:1-alpine
├── server/                  # Backend REST API em Node.js / TypeScript
│   ├── app.ts               # Express App com Middlewares e CORS
│   ├── index.ts             # Entrypoint do servidor na porta 3001 (Host: 33001)
│   ├── db/
│   │   ├── index.ts         # Pool de conexão PostgreSQL (pg)
│   │   ├── schema.sql       # DDL relacional (users, events, guests, audit_logs)
│   │   └── migrate.ts       # Execução automática de migrações e seed inicial
│   └── routes/              # Rotas REST (/users, /events, /guests, /metrics, /audit, /import)
├── src/                     # Frontend SPA em React 19 + TypeScript
│   ├── components/          # Componentes visuais das telas e modais
│   ├── services/
│   │   ├── apiClient.ts     # Cliente HTTP estruturado
│   │   ├── store.ts         # Store reativa sem mocks, conectada ao PostgreSQL
│   │   └── exportService.ts # Gerador de planilhas sanitizadas (SheetJS)
│   └── types/index.ts       # Definições de tipos de domínio e contratos
└── scripts/                 # Scripts determinísticos de teste e validação
```

### Topologia de Portas Altas no Host

Para prevenir qualquer conflito com serviços legados em execução na máquina de desenvolvimento:

| Serviço | Porta Host | Porta Container | Descrição |
|---|---|---|---|
| **Frontend Web** | `33000` | `3000` | Interface SPA React 19 servida via Vite |
| **Backend REST API** | `33001` | `3001` | Servidor Express em TypeScript |
| **PostgreSQL Database** | `25432` | `5432` | Banco relacional oficial (`rsvp_db`) |

---

## 🚀 Como Executar

### Pré-requisitos
* **Docker** (v24+) e **Docker Compose** (v2+)
* *(Opcional para execução nativa)*: **Bun** (v1.2+) ou **Node.js** (v22+)

### Opção 1: Via Docker Compose (Recomendado)

1. Clone o repositório:
```bash
git clone https://github.com/nandinhos/rsvp-credencial.git
cd rsvp-credencial
```

2. Suba o ambiente multi-container:
```bash
docker compose up -d --build
```

3. Acesse os serviços no navegador:
* **Aplicação Web:** [http://localhost:33000](http://localhost:33000)
* **API Health Check:** [http://localhost:33001/api/health](http://localhost:33001/api/health)
* **PostgreSQL:** Conexão disponível em `localhost:25432` (Usuário: `postgres`, Senha: `postgres`, Database: `rsvp_db`)

---

### Opção 2: Execução Local Nativa com Banco Docker

1. Suba apenas o banco PostgreSQL:
```bash
docker compose up -d db
```

2. Instale as dependências:
```bash
bun install
```

3. Execute o backend e o frontend concorrentemente:
```bash
bun run start
```

---

## 🧪 Qualidade & Testes

O projeto conta com scripts de validação determinística:

```bash
# Checagem estrita de tipos do TypeScript
bun run lint

# Verificação de conformidade relacional e portas altas
bun run scripts/test-repro-issue.ts
```

---

## 📚 Documentação Complementar

* [Arquitetura & Diagramas Detalhados](docs/ARCHITECTURE.md)
* [Matriz de Critérios de Aceite (CA-01 a CA-14)](docs/FEATURES.md)
* [Especificação da API REST](docs/API.md)
* [Dicionário do Banco de Dados PostgreSQL](docs/DATABASE.md)

---

## 📄 Licença & Propriedade

Desenvolvido para uso institucional. Todos os direitos reservados.
