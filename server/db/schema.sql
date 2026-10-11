-- Schema DDL - Cerimonial & RSVP (PostgreSQL 16)
-- Suporte completo aos Critérios de Aceite CA-01 a CA-14

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    cargo VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('admin', 'gestor', 'operador', 'leitor')),
    authorized_event_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(64) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    data_horario VARCHAR(255) NOT NULL,
    local VARCHAR(255) NOT NULL,
    imagem_capa TEXT,
    visibilidade VARCHAR(32) NOT NULL DEFAULT 'reservado' CHECK (visibilidade IN ('publico', 'reservado')),
    publico_estimado INT NOT NULL DEFAULT 100,
    categorias JSONB NOT NULL DEFAULT '[]'::jsonb,
    estado VARCHAR(32) NOT NULL DEFAULT 'ativo' CHECK (estado IN ('rascunho', 'ativo', 'encerrado')),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    encerrado_em TIMESTAMP WITH TIME ZONE,
    reaberto_em TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS guests (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    numero INT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    rsvp VARCHAR(32) NOT NULL DEFAULT 'pendente' CHECK (rsvp IN ('pendente', 'confirmado', 'recusado')),
    papel VARCHAR(32) NOT NULL DEFAULT 'titular' CHECK (papel IN ('titular', 'acompanhante', 'representante')),
    relacionamento JSONB,
    presenca VARCHAR(32) NOT NULL DEFAULT 'aguardando' CHECK (presenca IN ('aguardando', 'presente')),
    check_in_at TIMESTAMP WITH TIME ZONE,
    check_in_by VARCHAR(255),
    observacao TEXT,
    conflito_ativo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_event_deleted ON guests(event_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_guests_event_numero ON guests(event_id, numero);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id VARCHAR(64) NOT NULL,
    user_nome VARCHAR(255) NOT NULL,
    user_role VARCHAR(32) NOT NULL,
    event_id VARCHAR(64) NOT NULL,
    event_nome VARCHAR(255) NOT NULL,
    guest_id VARCHAR(64),
    guest_numero INT,
    guest_nome VARCHAR(255),
    acao VARCHAR(100) NOT NULL,
    detalhes TEXT NOT NULL,
    dispositivo VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_event_id ON audit_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
