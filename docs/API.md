# Especificação da API REST — Cerimonial & RSVP

A API REST opera na porta interna `3001` (exposta na porta host `33001` e acessível via proxy reverso em `http://localhost:33000/api`).

Todas as respostas utilizam formato `application/json` e codificação UTF-8.

---

## 1. Monitoramento & Saúde

### `GET /api/health`
Retorna a integridade do serviço.

* **Resposta (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-10-11T03:57:02.988Z",
  "service": "rsvp-credencial-backend"
}
```

---

## 2. Eventos (`/api/events`)

### `GET /api/events`
Retorna a lista de todos os eventos cadastrados.

### `POST /api/events`
Cadastra um novo evento com categorias obrigatórias (CA-02).

* **Payload:**
```json
{
  "nome": "Solenidade de Outorga de Mérito",
  "dataHorario": "15 de Novembro de 2026 às 19:30",
  "local": "Salão Nobre do Comando Geral",
  "visibilidade": "reservado",
  "publicoEstimado": 120,
  "categorias": [
    { "id": "cat-1", "nome": "Autoridade", "cor": "#0B2A4A" }
  ],
  "userId": "user-admin",
  "userName": "Cel. Valério Mendonça",
  "userRole": "admin"
}
```

### `POST /api/events/:id/close`
Encerra formalmente o evento, bloqueando alterações operacionais (CA-14).

### `POST /api/events/:id/reopen`
Reabre um evento encerrado. **Exige perfil `admin`** e registra auditoria compulsoriamente (CA-14).

---

## 3. Convidados (`/api/guests`)

### `GET /api/guests?eventId=:eventId`
Retorna a lista de convidados ativos (onde `deleted_at IS NULL`) do evento especificado.

### `POST /api/guests`
Cadastra um novo convidado aplicando as regras de numeração estável (CA-13) e categoria obrigatória (CA-02).

* **Payload:**
```json
{
  "eventId": "evt-1",
  "nome": "Gen. Carlos Eduardo Vasconcelos",
  "categoria": "Autoridade",
  "rsvp": "pendente",
  "papel": "titular",
  "observacao": "Assento de honra",
  "userId": "user-admin",
  "userName": "Cel. Valério",
  "userRole": "admin"
}
```

### `POST /api/guests/:id/rsvp`
Atualiza o status de confirmação com aplicação automática das regras de cerimonial:
* Promoção de acompanhante confirmado a representante se titular não confirmou (CA-05).
* Detecção de conflito de representação se titular e representante confirmarem simultaneamente (CA-06).

* **Payload:**
```json
{
  "novoRsvp": "confirmado",
  "userId": "user-operador",
  "userName": "Ten. Lucas",
  "userRole": "operador"
}
```

### `POST /api/guests/:id/checkin`
Efetua o credenciamento de portaria do convidado. Implementa **idempotência estrita (CA-09)**.

* **Payload:**
```json
{
  "operadorNome": "Ten. Lucas Albuquerque",
  "userId": "user-operador",
  "userName": "Ten. Lucas Albuquerque",
  "userRole": "operador"
}
```
* **Resposta (200 OK):**
```json
{
  "message": "Credenciamento realizado com sucesso (CA-09).",
  "checkInAt": "2026-10-11T03:15:00.000Z",
  "checkInBy": "Ten. Lucas Albuquerque"
}
```

### `POST /api/guests/:id/undo-checkin`
Estorna o credenciamento presencial em caso de erro de leitura ou cancelamento imediato.

### `POST /api/guests/resolve-conflict`
Resolução explícita de conflito de representação (CA-06).

* **Payload:**
```json
{
  "titularId": "gst-5",
  "representanteId": "gst-6",
  "decisao": "manter_titular",
  "userId": "user-gestor",
  "userName": "Maj. Patrícia",
  "userRole": "gestor"
}
```
*Valores aceitos para `decisao`:* `"manter_titular"`, `"manter_representante"`, `"manter_ambos"`.

### `DELETE /api/guests/:id`
Executa exclusão lógica do convidado (`deleted_at = NOW()`), garantindo que o número da credencial (#) nunca seja reciclado (CA-13).

---

## 4. Métricas & Lotação (`/api/metrics`)

### `GET /api/metrics/:eventId`
Calcula as métricas analíticas e capacidade do evento em tempo real no PostgreSQL, garantindo **Zero Dupla Contagem (CA-07)**.

* **Resposta (200 OK):**
```json
{
  "publicoEstimado": 120,
  "confirmadosTitulares": 2,
  "acompanhantesConfirmados": 1,
  "representantesConfirmados": 2,
  "naoConfirmados": 2,
  "presencas": 2,
  "participantesPrevistos": 5,
  "taxaConfirmacao": 4.16,
  "taxaComparecimento": 40.0,
  "saldoCapacidade": 115,
  "ausentesPrevistos": 3,
  "totalCadastrados": 7,
  "conflitosCount": 2,
  "conflitos": [...]
}
```

---

## 5. Auditoria (`/api/audit`)

### `GET /api/audit?eventId=:eventId&limit=200`
Consulta a trilha de auditoria imutável (CA-10) em ordem cronológica decrescente.

---

## 6. Importação em Lote (`/api/import`)

### `POST /api/import/batch`
Processa e persiste em lote a lista pré-visualizada de convidados (CA-08), aplicando a Regra do Zero (CA-03) e promoções de vínculo (CA-05).
