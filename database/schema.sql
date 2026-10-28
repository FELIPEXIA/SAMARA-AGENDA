-- ==============================================================================
-- PROJETO: SAMARA AGENDAMENTO
-- BANCO DE DADOS: PostgreSQL (Supabase)
-- OBJETIVO: Modelagem relacional para agendamentos, serviços, clientes e bloqueios
-- ==============================================================================

-- 1. EXTENSÃO PARA UUIDs AUTOMÁTICOS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELA DE SERVIÇOS (CATÁLOGO OFICIAL DO STUDIO)
-- ==============================================================================
-- Armazena todos os procedimentos oferecidos, valores e tempos de atendimento.
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,                            -- Ex: 'srv-unha-gel', 'srv-pe-mao'
    title TEXT NOT NULL,                           -- Nome do procedimento
    category TEXT NOT NULL,                        -- 'tradicional', 'sobrancelhas', 'gel', 'combos'
    price NUMERIC(10,2) NOT NULL,                  -- Valor em Reais (R$)
    duration_minutes INTEGER NOT NULL,             -- Duração exata em minutos para controle de agenda
    duration_label TEXT NOT NULL,                  -- Rótulo amigável (ex: '3h30', '40 minutos')
    icon TEXT NOT NULL DEFAULT '💅',               -- Ícone ou emoji representativo
    is_active BOOLEAN NOT NULL DEFAULT TRUE,       -- Permite desativar temporariamente sem excluir
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABELA DE CLIENTES
-- ==============================================================================
-- Cadastro automático simplificado para histórico de visitas e observações.
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                            -- Nome completo da cliente
    phone TEXT NOT NULL UNIQUE,                    -- WhatsApp (chave de busca e contato)
    notes TEXT,                                    -- Preferências (ex: alergias, formato de unha)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);

-- ==============================================================================
-- 4. TABELA DE AGENDAMENTOS
-- ==============================================================================
-- Registra cada sessão marcada, congelando o valor no momento do agendamento.
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,                            -- Ex: 'apt-179313'
    client_name TEXT NOT NULL,                     -- Nome da cliente
    client_phone TEXT NOT NULL,                    -- WhatsApp da cliente
    service_id TEXT REFERENCES public.services(id) ON DELETE SET NULL,
    service_title TEXT NOT NULL,                   -- Snapshot do nome do procedimento
    date DATE NOT NULL,                            -- Data do atendimento (YYYY-MM-DD)
    time TIME NOT NULL,                            -- Horário de início (HH:MM)
    end_time TIME,                                 -- Horário previsto de término (time + duration)
    price NUMERIC(10,2) NOT NULL,                  -- Snapshot do valor cobrado
    notes TEXT,                                    -- Observações da cliente
    status TEXT NOT NULL DEFAULT 'Confirmado' CHECK (status IN ('Confirmado', 'Concluído', 'Cancelado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON public.appointments(date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_client_phone ON public.appointments(client_phone);

-- ==============================================================================
-- 5. TABELA DE HORÁRIOS BLOQUEADOS (FOLGAS / PAUSAS DA SAMARA)
-- ==============================================================================
-- Permite que a Samara bloqueie dias ou períodos sem precisar desativar o sistema.
CREATE TABLE IF NOT EXISTS public.blocked_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_date DATE NOT NULL,                      -- Data da folga ou bloqueio
    start_time TIME,                               -- Início do bloqueio (nulo se for o dia todo)
    end_time TIME,                                 -- Término do bloqueio (nulo se for o dia todo)
    reason TEXT NOT NULL DEFAULT 'Indisponível',   -- Ex: 'Almoço', 'Curso', 'Férias', 'Feriado'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_times_date ON public.blocked_times(block_date);

-- ==============================================================================
-- 6. TABELA DE CONFIGURAÇÕES DO STUDIO
-- ==============================================================================
-- Centraliza os parâmetros gerais de contato e funcionamento da Samara.
CREATE TABLE IF NOT EXISTS public.studio_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_name TEXT NOT NULL DEFAULT 'Samara Agendamento',
    whatsapp TEXT NOT NULL DEFAULT '5527988459016',
    address TEXT DEFAULT 'Rua Nossa Senhora das Graças, Santo Antônio, Cariacica',
    opening_time TIME DEFAULT '08:30',
    closing_time TIME DEFAULT '18:30',
    admin_pin TEXT DEFAULT '1234',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
